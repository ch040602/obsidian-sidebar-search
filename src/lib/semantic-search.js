// 역할: Vault 내용을 외부로 보내지 않고 로컬 의미 검색용 벡터를 만듭니다.
// turbovec의 IdMapIndex/allowlist 흐름과 같은 형태로 설계해 향후 WASM 백엔드로 교체하기 쉽습니다.

const DEFAULT_DIMENSIONS = 128;
const DEFAULT_THRESHOLD = 0.18;
const SEMANTIC_INDEX_VERSION = 1;

const SEMANTIC_GROUPS = [
  ['ai', 'artificial', 'intelligence', '인공지능'],
  ['ml', 'machine', 'learning', '머신러닝'],
  ['deep', 'neural', 'network', 'networks', '딥러닝'],
  ['search', 'retrieve', 'retrieval', 'find', '검색', '찾기'],
  ['tag', 'tags', 'label', 'metadata', '태그', '라벨', '메타데이터'],
  ['browser', 'chrome', 'extension', 'web', '브라우저', '확장'],
  ['paper', 'article', 'publication', '논문', '문서'],
  ['note', 'notes', 'obsidian', 'vault', '노트', '볼트']
];

const SEMANTIC_EXPANSIONS = buildExpansionMap(SEMANTIC_GROUPS);

export function searchSemanticNotes(index, query, options = {}) {
  const text = String(query || '').trim();
  if (!text) return [];

  const dimensions = options.dimensions || DEFAULT_DIMENSIONS;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const queryVector = embedLocalText(text, { dimensions });
  const allowPaths = options.allowPaths ? new Set(options.allowPaths) : null;
  const idToNote = new Map();
  const ids = [];
  const vectors = [];

  for (const note of index || []) {
    if (allowPaths && !allowPaths.has(note.path)) continue;
    const id = semanticIdFromNote(note);
    idToNote.set(id, note);
    ids.push(id);
    vectors.push(readStoredSemanticVector(note, dimensions) || embedLocalText(buildSemanticDocumentText(note), { dimensions }));
  }

  if (!vectors.length) return [];

  const vectorIndex = createTurbovecCompatibleLocalIndex({ dimensions });
  vectorIndex.addWithIds(vectors, ids);

  return vectorIndex
    .search(queryVector, options.limit || 25, {
      allowlist: options.allowIds
    })
    .filter((result) => result.score >= threshold)
    .map((result) => ({
      note: idToNote.get(result.id),
      similarity: result.score
    }))
    .filter((result) => result.note);
}

export function buildSemanticDocumentText(note) {
  const tags = (note.tags || []).map((tag) => `${tag} #${tag}`).join(' ');
  return [
    note.title,
    note.title,
    (note.aliases || []).join(' '),
    tags,
    (note.headings || []).join(' '),
    note.excerpt,
    note.contentText
  ].filter(Boolean).join(' ');
}

export function buildSemanticSearchMetadata(note, options = {}) {
  const dimensions = options.dimensions || DEFAULT_DIMENSIONS;
  return {
    version: SEMANTIC_INDEX_VERSION,
    id: stableNoteId(note.path).toString(),
    dimensions,
    vector: Array.from(embedLocalText(buildSemanticDocumentText(note), { dimensions }))
  };
}

export function semanticIdFromNote(note) {
  const id = note?.semanticSearch?.id;
  return id ? BigInt(id) : stableNoteId(note?.path);
}

export function embedLocalText(text, options = {}) {
  const dimensions = options.dimensions || DEFAULT_DIMENSIONS;
  const vector = new Float32Array(dimensions);
  const tokens = tokenizeSemanticText(text);
  const expandedTokens = expandTokens(tokens);

  for (const token of tokens) {
    addHashedFeature(vector, `tok:${token}`, 1);
    for (const gram of charNgrams(token, 3)) {
      addHashedFeature(vector, `tri:${gram}`, 0.25);
    }
  }

  for (const token of expandedTokens) {
    addHashedFeature(vector, `exp:${token}`, 0.7);
  }

  normalizeVector(vector);
  return vector;
}

export function createTurbovecCompatibleLocalIndex({ dimensions = DEFAULT_DIMENSIONS } = {}) {
  return new LocalIdMapVectorIndex(dimensions);
}

export function stableNoteId(path) {
  const text = String(path || '');
  const high = BigInt(hashToUint32(`high:${text}`));
  const low = BigInt(hashToUint32(`low:${text}`));
  return (high << 32n) | low;
}

class LocalIdMapVectorIndex {
  constructor(dimensions) {
    this.dimensions = dimensions;
    this.entries = [];
  }

  addWithIds(vectors, ids) {
    vectors.forEach((vector, index) => {
      if (vector.length !== this.dimensions) {
        throw new Error(`Semantic vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
      }
      this.entries.push({ id: ids[index], vector });
    });
  }

  search(queryVector, k, options = {}) {
    const allowed = options.allowlist ? new Set(Array.from(options.allowlist)) : null;
    const results = [];

    for (const entry of this.entries) {
      if (allowed && !allowed.has(entry.id)) continue;
      results.push({
        id: entry.id,
        score: dotProduct(queryVector, entry.vector)
      });
    }

    return results
      .sort((a, b) => b.score - a.score || compareIds(a.id, b.id))
      .slice(0, k);
  }
}

function compareIds(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function readStoredSemanticVector(note, dimensions) {
  const metadata = note?.semanticSearch;
  if (
    metadata?.version !== SEMANTIC_INDEX_VERSION ||
    metadata.dimensions !== dimensions ||
    !Array.isArray(metadata.vector) ||
    metadata.vector.length !== dimensions
  ) {
    return null;
  }

  return Float32Array.from(metadata.vector);
}

function tokenizeSemanticText(text) {
  return Array.from(new Set(String(text || '')
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[`*_~()[\]{}<>"'.,!?;:|\\/]/g, ' ')
    .split(/\s+|-/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 400)));
}

function expandTokens(tokens) {
  const expanded = new Set();
  for (const token of tokens) {
    const group = SEMANTIC_EXPANSIONS.get(token);
    if (!group) continue;
    for (const item of group) expanded.add(item);
  }
  return Array.from(expanded);
}

function charNgrams(token, size) {
  const padded = ` ${token} `;
  if (padded.length <= size) return [padded];

  const grams = [];
  for (let i = 0; i <= padded.length - size; i += 1) {
    grams.push(padded.slice(i, i + size));
  }
  return grams;
}

function addHashedFeature(vector, feature, weight) {
  const hash = hashToUint32(feature);
  const index = hash % vector.length;
  const sign = hash & 1 ? 1 : -1;
  vector[index] += sign * weight;
}

function normalizeVector(vector) {
  const norm = Math.sqrt(dotProduct(vector, vector));
  if (!norm) return;
  for (let i = 0; i < vector.length; i += 1) {
    vector[i] /= norm;
  }
}

function dotProduct(a, b) {
  let score = 0;
  for (let i = 0; i < a.length; i += 1) {
    score += a[i] * b[i];
  }
  return score;
}

function hashToUint32(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildExpansionMap(groups) {
  const map = new Map();
  for (const group of groups) {
    for (const token of group) {
      map.set(token, group);
    }
  }
  return map;
}

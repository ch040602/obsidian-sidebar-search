// 역할: 제목/별칭/헤딩/본문 필드별 가중치를 둔 로컬 BM25 스타일 검색 점수를 계산합니다.
// 단순 substring 대신 토큰 단위로 매칭해 노이즈가 검색 결과를 지배하지 않게 합니다.

const BM25_K1 = 1.2;
const BM25_B = 0.75;

const FIELD_WEIGHTS = {
  title: 220,
  aliases: 180,
  headings: 110,
  content: 45
};

const FIELD_LABELS = {
  title: '제목',
  aliases: 'alias',
  headings: 'heading',
  content: '본문'
};

export function scoreLexicalNotes(index, query, options = {}) {
  const tokens = tokenizeLexical(query).slice(0, options.maxTokens || 20);
  if (!tokens.length) return [];

  const multiplier = options.multiplier ?? 1;
  const corpus = buildCorpus(index || []);
  const results = [];

  for (const doc of corpus.docs) {
    let score = 0;
    const reasons = [];

    for (const token of tokens) {
      const idf = corpus.idf.get(token) || 0;
      if (!idf) continue;

      for (const field of Object.keys(FIELD_WEIGHTS)) {
        const tf = doc.fields[field].counts.get(token) || 0;
        if (!tf) continue;

        const fieldScore = bm25(tf, doc.fields[field].length, corpus.avgLengths[field]) * idf * FIELD_WEIGHTS[field] * multiplier;
        score += fieldScore;
        reasons.push(`BM25 ${FIELD_LABELS[field]} "${token}"`);
      }
    }

    if (score > 0) {
      results.push({
        note: doc.note,
        score,
        reasons: Array.from(new Set(reasons)).slice(0, 5)
      });
    }
  }

  return results.sort((a, b) => b.score - a.score || b.note.mtime - a.note.mtime || a.note.path.localeCompare(b.note.path));
}

export function tokenizeLexical(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[`*_~()[\]{}<>"'.,!?;:|\\/]/g, ' ')
    .split(/\s+|-/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildCorpus(index) {
  const docs = index.map((note) => ({
    note,
    fields: {
      title: makeFieldStats(note.title),
      aliases: makeFieldStats((note.aliases || []).join(' ')),
      headings: makeFieldStats((note.headings || []).join(' ')),
      content: makeFieldStats(`${note.excerpt || ''} ${note.contentText || ''}`)
    }
  }));

  const avgLengths = {};
  for (const field of Object.keys(FIELD_WEIGHTS)) {
    avgLengths[field] = average(docs.map((doc) => doc.fields[field].length));
  }

  const documentFrequency = new Map();
  for (const doc of docs) {
    const uniqueTokens = new Set();
    for (const field of Object.keys(FIELD_WEIGHTS)) {
      for (const token of doc.fields[field].counts.keys()) uniqueTokens.add(token);
    }
    for (const token of uniqueTokens) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }

  const idf = new Map();
  const totalDocs = Math.max(docs.length, 1);
  for (const [token, df] of documentFrequency.entries()) {
    idf.set(token, Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5)));
  }

  return { docs, avgLengths, idf };
}

function makeFieldStats(text) {
  const tokens = tokenizeLexical(text);
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return { counts, length: tokens.length };
}

function bm25(tf, length, avgLength) {
  const normalizedLength = avgLength || 1;
  return (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * (1 - BM25_B + BM25_B * (length / normalizedLength)));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// 역할: File System Access API의 DirectoryHandle과 설정/인덱스를 IndexedDB에 저장합니다.
// 이유: DirectoryHandle은 JSON으로 저장할 수 없지만, IndexedDB에는 structured clone 형태로 저장할 수 있습니다.

const DB_NAME = 'obsidian-local-clipper-companion';
const DB_VERSION = 1;
const STORE = 'kv';

export async function idbGet(key) {
  const db = await openDb();
  return requestToPromise(db.transaction(STORE, 'readonly').objectStore(STORE).get(key));
}

export async function idbSet(key, value) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(value, key);
  await transactionDone(tx);
}

export async function idbDelete(key) {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(key);
  await transactionDone(tx);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

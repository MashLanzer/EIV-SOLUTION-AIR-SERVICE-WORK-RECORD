// Tiny IndexedDB-backed store for a single in-progress form draft. Photos
// (compressed base64) plus two signatures can exceed the ~5MB localStorage
// quota, so IndexedDB is the safer home. All operations are best-effort:
// if storage is unavailable or blocked, they resolve to a no-op instead of
// throwing, since a lost draft must never break submitting the form.

const DB_NAME = "eiv-work-record";
const STORE = "drafts";
const VERSION = 1;

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(undefined);
      return;
    }
    const open = indexedDB.open(DB_NAME, VERSION);
    open.onupgradeneeded = () => {
      open.result.createObjectStore(STORE);
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    };
  });
}

export async function getDraft<T = unknown>(
  key: string
): Promise<T | undefined> {
  try {
    return await withStore<T>("readonly", (s) => s.get(key));
  } catch {
    return undefined;
  }
}

export async function setDraft(key: string, value: unknown): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.put(value, key));
  } catch {
    // best-effort - ignore quota/private-mode failures
  }
}

export async function clearDraft(key: string): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.delete(key));
  } catch {
    // best-effort
  }
}

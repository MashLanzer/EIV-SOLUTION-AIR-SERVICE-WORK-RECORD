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

// The content-bearing fields of a new-record draft. Every key is optional and
// loosely typed so both the form's value object and a raw draft blob read back
// from IndexedDB satisfy it without an index signature.
type DraftLike = {
  jobNumber?: unknown;
  leadInstallerName?: unknown;
  helperName?: unknown;
  customerName?: unknown;
  customerAddress?: unknown;
  typeOfWork?: unknown;
  workPerformedNotes?: unknown;
  leadInstallerPay?: unknown;
  helperPay?: unknown;
  customerSignature?: unknown;
  installerSignature?: unknown;
  photos?: unknown;
};

// A saved draft is "empty" until the user has typed something worth keeping.
// Shared by the form (to offer "Resume draft") and the My Records banner (to
// only surface a resume prompt when there's real content).
export function draftHasContent(d: DraftLike | null | undefined): boolean {
  if (!d) return false;
  return Boolean(
    d.jobNumber ||
      d.leadInstallerName ||
      d.helperName ||
      d.customerName ||
      d.customerAddress ||
      d.typeOfWork ||
      d.workPerformedNotes ||
      d.leadInstallerPay ||
      d.helperPay ||
      d.customerSignature ||
      d.installerSignature ||
      (Array.isArray(d.photos) && d.photos.length > 0)
  );
}

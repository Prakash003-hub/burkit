// Native Promise-based IndexedDB Storage with LocalStorage fallback
const DB_NAME = 'burkit_smartcity_db';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null); // Fallback to localStorage
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open error, falling back to localStorage:', event.target.error);
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB initialization failed:', e);
      resolve(null);
    }
  });

  return dbPromise;
}

export async function getCache(key) {
  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(key);
          request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.value : null);
          };
          request.onerror = () => {
            resolve(getFromLocalStorage(key));
          };
        } catch (e) {
          resolve(getFromLocalStorage(key));
        }
      });
    }
    return getFromLocalStorage(key);
  } catch (err) {
    return getFromLocalStorage(key);
  }
}

export async function setCache(key, value) {
  try {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.put({ key, value, updatedAt: Date.now() });
          request.onsuccess = () => resolve(true);
          request.onerror = () => {
            setToLocalStorage(key, value);
            resolve(true);
          };
        } catch (e) {
          setToLocalStorage(key, value);
          resolve(true);
        }
      });
    }
    setToLocalStorage(key, value);
    return true;
  } catch (err) {
    setToLocalStorage(key, value);
    return true;
  }
}

export async function removeCache(key) {
  try {
    const db = await openDB();
    if (db) {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);
    }
    localStorage.removeItem(`idb_fallback_${key}`);
  } catch (e) {
    // Ignore error
  }
}

function getFromLocalStorage(key) {
  try {
    const raw = localStorage.getItem(`idb_fallback_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setToLocalStorage(key, value) {
  try {
    localStorage.setItem(`idb_fallback_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

export default {
  getCache,
  setCache,
  removeCache,
};

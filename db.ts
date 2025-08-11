const DB_NAME = 'CSVDatabase';
const DATA_STORE_NAME = 'csvData';
const META_STORE_NAME = 'csvMeta';
const DB_VERSION = 2;

export type DBStatus = {
  hasData: boolean;
  headers: string[];
  rowCount: number;
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
        db.createObjectStore(DATA_STORE_NAME, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveHeaders = async (headers: string[]): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(META_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(META_STORE_NAME);
  store.put(headers, 'headers');

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const appendRows = async (rows: string[][]): Promise<void> => {
  if (rows.length === 0) {
    return Promise.resolve();
  }
  const db = await openDB();
  const transaction = db.transaction(DATA_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(DATA_STORE_NAME);

  rows.forEach(row => {
    store.add(row);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const checkDBStatus = async (): Promise<DBStatus> => {
    const db = await openDB();
    const transaction = db.transaction([DATA_STORE_NAME, META_STORE_NAME], 'readonly');
    const dataStore = transaction.objectStore(DATA_STORE_NAME);
    const metaStore = transaction.objectStore(META_STORE_NAME);

    const countRequest = dataStore.count();
    const getHeadersRequest = metaStore.get('headers');

    return new Promise((resolve, reject) => {
        let dataCount = 0;
        let headersResult: string[] = [];

        countRequest.onsuccess = () => {
            dataCount = countRequest.result;
        };

        getHeadersRequest.onsuccess = () => {
            headersResult = getHeadersRequest.result || [];
        };
        
        transaction.oncomplete = () => {
            resolve({ hasData: dataCount > 0, headers: headersResult, rowCount: dataCount });
        };
        
        transaction.onerror = () => {
            reject(transaction.error);
        };
    });
};

export const getPaginatedData = async ({ page, pageSize }: { page: number; pageSize: number }): Promise<{ rows: string[][] }> => {
    const db = await openDB();
    const transaction = db.transaction(DATA_STORE_NAME, 'readonly');
    const dataStore = transaction.objectStore(DATA_STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const rows: string[][] = [];
        const lowerBound = (page - 1) * pageSize;
        let advanced = false;
        
        const cursorRequest = dataStore.openCursor();

        cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

            if (!cursor) {
                // Reached end of cursor
                resolve({ rows });
                return;
            }

            if (!advanced && lowerBound > 0) {
                advanced = true;
                cursor.advance(lowerBound);
                return; // Wait for next onsuccess
            }

            if (rows.length < pageSize) {
                rows.push(cursor.value);
                cursor.continue();
            } else {
                // Page is full, resolve immediately
                resolve({ rows });
            }
        };

        cursorRequest.onerror = () => reject(cursorRequest.error);
        transaction.onerror = () => reject(transaction.error);
    });
};

export const clearData = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([DATA_STORE_NAME, META_STORE_NAME], 'readwrite');
  transaction.objectStore(DATA_STORE_NAME).clear();
  transaction.objectStore(META_STORE_NAME).clear();
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const DB_NAME = 'CSVDatabase';
const DATA_STORE_NAME = 'csvData';
const META_STORE_NAME = 'csvMeta';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
        db.createObjectStore(DATA_STORE_NAME, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new DOMException('Error opening database', 'OpenDBError'));
  });
};

export const saveHeaders = async (headers: string[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(META_STORE_NAME, 'readwrite');
    transaction.objectStore(META_STORE_NAME).put(headers, 'headers');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const appendRows = async (rows: string[][]): Promise<void> => {
  if (rows.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DATA_STORE_NAME, 'readwrite');
    const dataStore = transaction.objectStore(DATA_STORE_NAME);
    rows.forEach(row => dataStore.add(row));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const checkDBStatus = async (): Promise<{ hasData: boolean; headers: string[], rowCount: number }> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DATA_STORE_NAME, META_STORE_NAME], 'readonly');
        const dataStore = transaction.objectStore(DATA_STORE_NAME);
        const metaStore = transaction.objectStore(META_STORE_NAME);

        const countRequest = dataStore.count();
        const getHeadersRequest = metaStore.get('headers');

        let dataCount = 0;
        let headersResult: string[] = [];

        countRequest.onsuccess = () => { dataCount = countRequest.result; };
        getHeadersRequest.onsuccess = () => { headersResult = getHeadersRequest.result || []; };
        
        transaction.oncomplete = () => resolve({ hasData: dataCount > 0, headers: headersResult, rowCount: dataCount });
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getPaginatedData = async ({ page, pageSize }: { page: number, pageSize: number }): Promise<{ rows: string[][] }> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DATA_STORE_NAME, META_STORE_NAME], 'readonly');
        const dataStore = transaction.objectStore(DATA_STORE_NAME);
        
        const rows: string[][] = [];
        let advanced = false;
        const cursorRequest = dataStore.openCursor();
        let i = 0;

        cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                if (!advanced && page > 1) {
                    advanced = true;
                    cursor.advance((page - 1) * pageSize);
                    return;
                }
                if (i < pageSize) {
                    rows.push(cursor.value);
                    i++;
                    cursor.continue();
                }
            }
        };

        transaction.oncomplete = () => resolve({ rows });
        transaction.onerror = () => reject(transaction.error);
    });
};

export const clearData = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
      const transaction = db.transaction([DATA_STORE_NAME, META_STORE_NAME], 'readwrite');
      transaction.objectStore(DATA_STORE_NAME).clear();
      transaction.objectStore(META_STORE_NAME).clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
  });
}

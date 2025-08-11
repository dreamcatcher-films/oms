const DB_NAME = 'CSVDatabase';
const DATA_STORE_NAME = 'csvData';
const HEADERS_STORE_NAME = 'csvHeaders';
const DB_VERSION = 1;

interface CsvRow {
  [key: string]: string;
}

// Function to open the database and create object stores if needed
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
        db.createObjectStore(DATA_STORE_NAME, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(HEADERS_STORE_NAME)) {
        db.createObjectStore(HEADERS_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new DOMException('Error opening database', 'OpenDBError'));
    };
  });
};

// Function to save parsed CSV data to the database
export const saveData = async (headers: string[], rows: string[][]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DATA_STORE_NAME, HEADERS_STORE_NAME], 'readwrite');
    const dataStore = transaction.objectStore(DATA_STORE_NAME);
    const headersStore = transaction.objectStore(HEADERS_STORE_NAME);

    // Clear existing data first
    dataStore.clear();
    headersStore.clear();

    // Store headers
    headersStore.put(headers, 'currentHeaders');

    // Store rows as objects
    const dataToStore = rows.map(row => {
      const rowObject: CsvRow = {};
      headers.forEach((header, index) => {
        rowObject[header] = row[index];
      });
      return rowObject;
    });

    // Add each row object to the data store
    dataToStore.forEach(item => dataStore.add(item));

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

// Function to get all data from the database
export const getData = async ({ signal }: { signal?: AbortSignal } = {}): Promise<{ headers: string[], rows: string[][] }> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new DOMException('Aborted', 'AbortError'));
        }

        const transaction = db.transaction([DATA_STORE_NAME, HEADERS_STORE_NAME], 'readonly');
        
        const handleAbort = () => {
            try {
                transaction.abort();
            } catch (e) {
                // Ignore if transaction is already finished.
            }
            reject(new DOMException('Aborted', 'AbortError'));
        };
        
        signal?.addEventListener('abort', handleAbort);

        const dataStore = transaction.objectStore(DATA_STORE_NAME);
        const headersStore = transaction.objectStore(HEADERS_STORE_NAME);
        
        const getHeadersRequest = headersStore.get('currentHeaders');
        const getDataRequest = dataStore.getAll();

        let headersResult: string[] | undefined;
        let dataObjectsResult: CsvRow[] | undefined;

        getHeadersRequest.onsuccess = () => {
            headersResult = getHeadersRequest.result;
        };

        getDataRequest.onsuccess = () => {
            dataObjectsResult = getDataRequest.result;
        };

        transaction.oncomplete = () => {
            signal?.removeEventListener('abort', handleAbort);
            const headers = headersResult || [];
            const dataObjects = dataObjectsResult || [];
            let rows: string[][] = [];

            if (headers.length > 0 && dataObjects.length > 0) {
                 rows = dataObjects.map(obj => headers.map(header => obj[header] || ''));
            }
            
            resolve({ headers, rows });
        };

        transaction.onerror = () => {
            signal?.removeEventListener('abort', handleAbort);
            reject(transaction.error);
        };
    });
};

// Function to clear all data from the database
export const clearData = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
      const transaction = db.transaction([DATA_STORE_NAME, HEADERS_STORE_NAME], 'readwrite');
      transaction.objectStore(DATA_STORE_NAME).clear();
      transaction.objectStore(HEADERS_STORE_NAME).clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
  });
}

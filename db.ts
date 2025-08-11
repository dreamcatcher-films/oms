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

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
        db.createObjectStore(DATA_STORE_NAME, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(HEADERS_STORE_NAME)) {
        db.createObjectStore(HEADERS_STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject('Error opening database: ' + (event.target as IDBOpenDBRequest).error);
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

    // Store rows as objects for better queryability in the future
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
      reject('Transaction error: ' + transaction.error);
    };
  });
};

// Function to get all data from the database
export const getData = async (): Promise<{ headers: string[], rows: string[][] }> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DATA_STORE_NAME, HEADERS_STORE_NAME], 'readonly');
        const dataStore = transaction.objectStore(DATA_STORE_NAME);
        const headersStore = transaction.objectStore(HEADERS_STORE_NAME);
        
        const getHeadersRequest = headersStore.get('currentHeaders');
        const getDataRequest = dataStore.getAll();

        let headers: string[] = [];
        let rows: string[][] = [];

        getHeadersRequest.onsuccess = () => {
            headers = getHeadersRequest.result || [];
        };

        getDataRequest.onsuccess = () => {
            const dataObjects: CsvRow[] = getDataRequest.result || [];
            // Revert objects back to arrays for table display
            if (headers.length > 0) {
                rows = dataObjects.map(obj => headers.map(header => obj[header]));
            }
        };

        transaction.oncomplete = () => {
            resolve({ headers, rows });
        };

        transaction.onerror = () => {
            reject('Transaction error: ' + transaction.error);
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
      transaction.onerror = () => reject('Clear data transaction error: ' + transaction.error);
  });
}

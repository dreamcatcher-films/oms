const DB_NAME = 'OMSDatabase';
const PRODUCTS_STORE_NAME = 'products';
const PALLETS_STORE_NAME = 'pallets';
const DB_VERSION = 1;

export type Product = {
  productId: string;
  warehouseId: string;
  name: string;
  price: number;
  resellTime: number;
};

export type Pallet = {
  palletId: string;
  productId: string;
  warehouseId: string;
  arrivalDate: Date;
  expiryDate: Date;
};

export type DBStatus = {
  productsCount: number;
  palletsCount: number;
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE_NAME)) {
        // Composite key for product based on its ID and warehouse ID
        db.createObjectStore(PRODUCTS_STORE_NAME, { keyPath: ['productId', 'warehouseId'] });
      }
      if (!db.objectStoreNames.contains(PALLETS_STORE_NAME)) {
        db.createObjectStore(PALLETS_STORE_NAME, { keyPath: 'palletId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveData = async <T>(storeName: string, data: T[]): Promise<void> => {
  if (data.length === 0) return;
  
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  // Clear existing data before adding new data, only for the first batch
  let isFirstBatch = true; 
  transaction.objectStore(storeName).clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    let i = 0;
    function addNext() {
      if (i < data.length) {
        store.put(data[i]).onsuccess = addNext;
        i++;
      }
    }
    addNext();
  });
};

const saveDataInBatches = async <T>(storeName: string, data: T[]): Promise<void> => {
    if (data.length === 0) return;
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        data.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}


export const saveProducts = async (products: Product[]): Promise<void> => {
  // Clear must be in a separate transaction before saving
  const db = await openDB();
  const clearTx = db.transaction(PRODUCTS_STORE_NAME, 'readwrite');
  clearTx.objectStore(PRODUCTS_STORE_NAME).clear();
  await new Promise(r => clearTx.oncomplete = r);

  return saveDataInBatches(PRODUCTS_STORE_NAME, products);
};

export const savePallets = async (pallets: Pallet[]): Promise<void> => {
  // Clear must be in a separate transaction before saving
  const db = await openDB();
  const clearTx = db.transaction(PALLETS_STORE_NAME, 'readwrite');
  clearTx.objectStore(PALLETS_STORE_NAME).clear();
  await new Promise(r => clearTx.oncomplete = r);
  
  return saveDataInBatches(PALLETS_STORE_NAME, pallets);
};


export const checkDBStatus = async (): Promise<DBStatus> => {
    try {
        const db = await openDB();
        const transaction = db.transaction([PRODUCTS_STORE_NAME, PALLETS_STORE_NAME], 'readonly');
        const productsStore = transaction.objectStore(PRODUCTS_STORE_NAME);
        const palletsStore = transaction.objectStore(PALLETS_STORE_NAME);

        const productsCountRequest = productsStore.count();
        const palletsCountRequest = palletsStore.count();

        return new Promise((resolve, reject) => {
            let productsCount = 0;
            let palletsCount = 0;

            productsCountRequest.onsuccess = () => {
                productsCount = productsCountRequest.result;
            };

            palletsCountRequest.onsuccess = () => {
                palletsCount = palletsCountRequest.result;
            };
            
            transaction.oncomplete = () => {
                resolve({ productsCount, palletsCount });
            };
            
            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    } catch (e) {
        // This can happen if the DB doesn't exist yet
        return { productsCount: 0, palletsCount: 0 };
    }
};

export const clearAllData = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([PRODUCTS_STORE_NAME, PALLETS_STORE_NAME], 'readwrite');
  transaction.objectStore(PRODUCTS_STORE_NAME).clear();
  transaction.objectStore(PALLETS_STORE_NAME).clear();
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

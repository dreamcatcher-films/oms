

const DB_NAME = 'OMSDatabase';
const PRODUCTS_STORE_NAME = 'products';
const PALLETS_STORE_NAME = 'pallets';
const DB_VERSION = 1;

export type Product = {
  // --- Composite Key ---
  warehouseId: string; // Kolumna A: WH NR
  productId: string;   // Kolumna E: ITEM NR SHOP

  // --- Identifiers ---
  fullProductId: string; // Kolumna F: ITEM NR FULL (dłuższy, precyzyjny numer)
  name: string;          // Kolumna G: ITEM DESC

  // --- Product Attributes ---
  caseSize: number;      // Kolumna H: CASE SIZE (ilość w kartonie)
  price: number;         // Kolumna P: RETAIL PRICE
  status: string;        // Kolumna Q: ITEM STATUS (status towaru, np. 7-9)
  promoDate: string;     // Kolumna L: ADV DATE (data promocji)

  // --- Shelf Life & Time Metrics ---
  shelfLifeAtReceiving: number; // Kolumna M: W-DATE DAYS (wymagana data przydatności przy dostawie)
  shelfLifeAtStore: number;     // Kolumna N: S-DATE DAYS (wymagana data przydatności w sklepie)
  customerShelfLife: number;    // Kolumna O: C-DATE DAYS (minimalna data dla klienta)
  // Max time in warehouse can be calculated as (shelfLifeAtReceiving - shelfLifeAtStore)

  // --- Supplier Info ---
  supplierId: string;   // Kolumna U: SUPPLIE NR
  supplierName: string; // Kolumna V: SUPPLIE NAME
  
  // --- Stock Info ---
  stockOnHand: number;            // Kolumna Z: STOCK ON HAND
  storeAllocationToday: number;   // Kolumna Y: STORE ALLOC C (wysyłane do sklepów dzisiaj)
  storeAllocationTotal: number;   // Kolumna AA: STORE ALLOC C < (wysyłane do sklepów w kolejne dni)
  estimatedReceivings: {          // Kolumny AB-AJ: Spodziewane dostawy
    date: string;
    quantity: number;
  }[];
};


export type Pallet = {
  // UWAGA: To jest struktura tymczasowa. Zostanie zaktualizowana po otrzymaniu schematu pliku palet.
  palletId: string;    // np. z kolumny 'Pallet ID'
  productId: string;   // np. z kolumny 'Product ID' (do łączenia)
  warehouseId: string; // np. z kolumny 'Warehouse ID' (do łączenia)
  arrivalDate: Date;   // np. z kolumny 'Arrival Date'
  expiryDate: Date;    // np. z kolumny 'Expiry Date'
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
        db.createObjectStore(PRODUCTS_STORE_NAME, { keyPath: ['warehouseId', 'productId'] });
      }
      if (!db.objectStoreNames.contains(PALLETS_STORE_NAME)) {
        db.createObjectStore(PALLETS_STORE_NAME, { keyPath: 'palletId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveDataInBatches = async <T>(storeName: string, data: T[]) => {
    if (data.length === 0) return;
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise<void>((resolve, reject) => {
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

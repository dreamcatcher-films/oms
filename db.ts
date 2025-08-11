

const DB_NAME = 'OMSDatabase';
const PRODUCTS_STORE_NAME = 'products';
const GOODS_RECEIPTS_STORE_NAME = 'goodsReceipts';
const DB_VERSION = 3; 

export type Product = {
  // --- Composite Key ---
  // The primary key is now ['warehouseId', 'fullProductId'] to ensure uniqueness
  warehouseId: string; // Kolumna A: WH NR
  fullProductId: string; // Kolumna F: ITEM NR FULL (dłuższy, precyzyjny numer)

  // --- Grouping ---
  dispoGroup: string;    // Kolumna B: DISPO GROUP
  itemGroup: string;     // Kolumna C: ITEM GROUP
  orderArea: string;     // Kolumna D: ORDER AREA

  // --- Identifiers ---
  productId: string;   // Kolumna E: ITEM NR SHORT (krótki numer)
  name: string;          // Kolumna G: ITEM DESC

  // --- Logistics & Packaging ---
  caseSize: number;      // Kolumna H: CASE SIZE (ilość w kartonie)
  cartonsPerLayer: number; // Kolumna I: LAYER FACTOR
  duessFactor: number;   // Kolumna J: DUESS FACTOR (ilość na palecie DD)
  cartonsPerPallet: number; // Kolumna K: EURO FACTOR (ilość kartonów na palecie)

  // --- Time Metrics ---
  shelfLifeAtReceiving: number; // Kolumna M: W-DATE DAYS (wymagana data przydatności przy dostawie)
  shelfLifeAtStore: number;     // Kolumna N: S-DATE DAYS (wymagana data przydatności w sklepie)
  customerShelfLife: number;    // Kolumna O: C-DATE DAYS (minimalna data dla klienta)
  promoDate: string;     // Kolumna L: ADV DATE (data promocji)

  // --- Status & Location ---
  status: string;        // Kolumna Q: ITEM STATUS (status towaru, np. 7-9)
  itemLocked: string;    // Kolumna R: ITEM LOCKED
  slotNr: string;        // Kolumna S: SLOT NR

  // --- Pricing ---
  price: number;         // Kolumna P: RETAIL PRICE
  
  // --- Supplier Info ---
  supplierId: string;   // Kolumna U: SUPPLIER NR
  supplierName: string; // Kolumna V: SUPPLIER NAME
  
  // --- Stock Info ---
  unprocessedDeliveryQty: number; // Kolumna W: UNPROC DEL QTY (dostawa nieprzetworzona)
  stockOnHand: number;            // Kolumna Z: STOCK ON HAND
  storeAllocationToday: number;   // Kolumna Y: STORE ALLOC C (wysyłane do sklepów dzisiaj)
  storeAllocationTotal: number;   // Kolumna AA: STORE ALLOC C < (wysyłane do sklepów w kolejne dni)
  estimatedReceivings: {          // Kolumny AB-AJ: Spodziewane dostawy
    date: string;
    quantity: number;
  }[];
};

export type GoodsReceipt = {
  // --- Composite Key ---
  warehouseId: string;    // Kolumna A: WH NR
  fullProductId: string;  // Kolumna B: ITEM NR
  deliveryNote: string;   // Kolumna N: DELIVERY NOTE

  // --- Calculated ---
  productId: string;      // Calculated from fullProductId

  // --- Item Info ---
  name: string;             // Kolumna C: ITEM DESC

  // --- Logistics ---
  deliveryUnit: string;   // Kolumna D: DELIVERY UNIT OF MEASURE (CASES)
  deliveryQtyUom: number; // Kolumna E: DELIVERY QTY (in UOM)
  caseSize: number;       // Kolumna F: CASE SIZE
  deliveryQtyPcs: number; // Kolumna G: DELIVERY QTY (in PIECES)

  // --- Order Info ---
  poNr: string;             // Kolumna H: PO NR
  deliveryDate: string;     // Kolumna I: DELIVERY DATE
  bestBeforeDate: string;   // Kolumna J: BEST BEFORE DATE
  bolNr: string;            // Kolumna M: BOL NR
  
  // --- Supplier Info ---
  supplierId: string;       // Kolumna K: SUPPLIER NR
  supplierName: string;     // Kolumna L: SUPPLIER DESC
  
  // --- International Identifiers ---
  intSupplierNr: string;  // Kolumna O: INT SUPPLIER NR
  intItemNr: string;      // Kolumna P: INT ITEM NR
  caseGtin: string;       // Kolumna Q: CASE GTIN
  liaReference: string;   // Kolumna R: LIA REFERENCE
};

export type DBStatus = {
  productsCount: number;
  goodsReceiptsCount: number;
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 2) {
        // This logic handles the creation/update for the 'products' store for v1 users
        if (db.objectStoreNames.contains(PRODUCTS_STORE_NAME)) {
          db.deleteObjectStore(PRODUCTS_STORE_NAME);
        }
        const productsStore = db.createObjectStore(PRODUCTS_STORE_NAME, { keyPath: ['warehouseId', 'fullProductId'] });
        productsStore.createIndex('statusIndex', 'status');
      }

      if (oldVersion < 3) {
        // This logic handles the renaming of 'pallets' to 'goodsReceipts' and updating its schema for v2 users
        if (db.objectStoreNames.contains('pallets')) { // Use literal old name
          db.deleteObjectStore('pallets');
        }
        if (!db.objectStoreNames.contains(GOODS_RECEIPTS_STORE_NAME)) {
          db.createObjectStore(GOODS_RECEIPTS_STORE_NAME, { keyPath: ['warehouseId', 'fullProductId', 'deliveryNote'] });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const addDataInBatches = async <T>(storeName: string, data: T[]) => {
    if (data.length === 0) return;
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    const promises = data.map(item => {
        return new Promise<void>((resolve, reject) => {
            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });

    await Promise.all(promises);
    
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export const addProducts = (products: Product[]) => addDataInBatches(PRODUCTS_STORE_NAME, products);
export const addGoodsReceipts = (receipts: GoodsReceipt[]) => addDataInBatches(GOODS_RECEIPTS_STORE_NAME, receipts);

const clearStore = async (storeName: string) => {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.clear();
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const clearProducts = () => clearStore(PRODUCTS_STORE_NAME);
export const clearGoodsReceipts = () => clearStore(GOODS_RECEIPTS_STORE_NAME);

export const checkDBStatus = async (): Promise<DBStatus> => {
    try {
        const db = await openDB();
        const transaction = db.transaction([PRODUCTS_STORE_NAME, GOODS_RECEIPTS_STORE_NAME], 'readonly');
        const productsStore = transaction.objectStore(PRODUCTS_STORE_NAME);
        const goodsReceiptsStore = transaction.objectStore(GOODS_RECEIPTS_STORE_NAME);

        const productsCountRequest = productsStore.count();
        const goodsReceiptsCountRequest = goodsReceiptsStore.count();

        return new Promise((resolve, reject) => {
            let productsCount = 0;
            let goodsReceiptsCount = 0;

            productsCountRequest.onsuccess = () => {
                productsCount = productsCountRequest.result;
            };

            goodsReceiptsCountRequest.onsuccess = () => {
                goodsReceiptsCount = goodsReceiptsCountRequest.result;
            };
            
            transaction.oncomplete = () => {
                resolve({ productsCount, goodsReceiptsCount });
            };
            
            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    } catch (e) {
        return { productsCount: 0, goodsReceiptsCount: 0 };
    }
};

export const clearAllData = async (): Promise<void> => {
    await clearProducts();
    await clearGoodsReceipts();
};

export const getProductsPaginatedAndFiltered = async (
    page: number,
    pageSize: number,
    filters: { warehouseId?: string; productId?: string; status?: string; }
): Promise<{ data: Product[]; total: number }> => {
    const db = await openDB();
    const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCTS_STORE_NAME);
    const request = store.openCursor();

    const data: Product[] = [];
    let total = 0;
    const offset = (page - 1) * pageSize;

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const product: Product = cursor.value;

                // Use exact matching for more precise filtering
                const matchesWarehouse = !filters.warehouseId || product.warehouseId === filters.warehouseId;
                const matchesProduct = !filters.productId || product.productId === filters.productId;
                const matchesStatus = !filters.status || product.status === filters.status;

                if (matchesWarehouse && matchesProduct && matchesStatus) {
                    if (total >= offset && data.length < pageSize) {
                        data.push(product);
                    }
                    total++;
                }
                cursor.continue();
            } else {
                resolve({ data, total });
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const getGoodsReceiptsPaginated = async (
    page: number,
    pageSize: number
): Promise<{ data: GoodsReceipt[]; total: number }> => {
    const db = await openDB();
    const transaction = db.transaction(GOODS_RECEIPTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(GOODS_RECEIPTS_STORE_NAME);
    const request = store.openCursor();

    const data: GoodsReceipt[] = [];
    let total = 0;
    const offset = (page - 1) * pageSize;

    return new Promise((resolve, reject) => {
        // First, get the total count
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          total = countRequest.result;

          if (total === 0) {
            resolve({ data: [], total: 0 });
            return;
          }

          let advanced = false;
          const cursorRequest = store.openCursor();
          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (!cursor) {
                resolve({ data, total });
                return;
            }
            if (!advanced && offset > 0) {
                cursor.advance(offset);
                advanced = true;
                return;
            }
            if (data.length < pageSize) {
                data.push(cursor.value);
                cursor.continue();
            } else {
                resolve({ data, total });
            }
          };
          cursorRequest.onerror = () => reject(cursorRequest.error);
        };
        countRequest.onerror = () => reject(countRequest.error);
    });
};


export const getUniqueProductStatuses = async (): Promise<string[]> => {
    const db = await openDB();
    const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCTS_STORE_NAME);
    const request = store.openCursor();
    const statuses = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const product: Product = cursor.value;
                if(product.status) {
                    statuses.add(product.status);
                }
                cursor.continue();
            } else {
                resolve(Array.from(statuses).sort());
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const getUniqueWarehouseIds = async (): Promise<string[]> => {
    const db = await openDB();
    const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCTS_STORE_NAME);
    const request = store.openCursor();
    const warehouses = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const product: Product = cursor.value;
                if(product.warehouseId) {
                    warehouses.add(product.warehouseId);
                }
                cursor.continue();
            } else {
                resolve(Array.from(warehouses).sort());
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const findProductsByPartialId = async (partialId: string, limit: number = 5): Promise<Product[]> => {
    const db = await openDB();
    const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCTS_STORE_NAME);
    const request = store.openCursor();
    const products: Product[] = [];
    const lowerCasePartialId = partialId.toLowerCase();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor && products.length < limit) {
                const product: Product = cursor.value;
                if (product.productId.toLowerCase().startsWith(lowerCasePartialId)) {
                    products.push(product);
                }
                cursor.continue();
            } else {
                resolve(products);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

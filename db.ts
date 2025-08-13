




import { RDC, DataType, ImportMetadata, ImportMeta, Product, GoodsReceipt, OpenOrder, Sale } from './utils/types';

const DB_NAME = 'OMSDatabase';
const PRODUCTS_STORE_NAME = 'products';
const GOODS_RECEIPTS_STORE_NAME = 'goodsReceipts';
const OPEN_ORDERS_STORE_NAME = 'openOrders';
const SALES_STORE_NAME = 'sales';
const METADATA_STORE_NAME = 'importMetadata';
const SETTINGS_STORE_NAME = 'settings';
const DB_VERSION = 9; 

const RDC_LIST_KEY = 'rdcList';
const DEFAULT_RDC_LIST: RDC[] = [
    { id: '220', name: 'RUN' },
    { id: '250', name: 'BEL' },
    { id: '260', name: 'NAY' },
    { id: '290', name: 'ENF' },
    { id: '300', name: 'BRI' },
    { id: '310', name: 'NFL' },
    { id: '320', name: 'SOU' },
    { id: '340', name: 'DON' },
    { id: '360', name: 'WED' },
    { id: '430', name: 'EXE' },
    { id: '460', name: 'AVO' },
    { id: '490', name: 'MOT' },
    { id: '590', name: 'PET' },
    { id: '600', name: 'LTN' },
].sort((a,b) => a.id.localeCompare(b.id));


export type DBStatus = {
  productsCount: number;
  goodsReceiptsCount: number;
  openOrdersCount: number;
  salesCount: number;
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction!;
      const oldVersion = event.oldVersion;

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(PRODUCTS_STORE_NAME)) {
            const productsStore = db.createObjectStore(PRODUCTS_STORE_NAME, { keyPath: ['warehouseId', 'fullProductId'] });
            productsStore.createIndex('statusIndex', 'status');
        }
      }

      if (oldVersion < 3) {
        if (db.objectStoreNames.contains('pallets')) {
            db.deleteObjectStore('pallets');
        }
        if (!db.objectStoreNames.contains(GOODS_RECEIPTS_STORE_NAME)) {
            db.createObjectStore(GOODS_RECEIPTS_STORE_NAME, { keyPath: ['warehouseId', 'fullProductId', 'deliveryNote'] });
        }
      }
      
      if (oldVersion < 4) {
        const goodsReceiptsStore = transaction.objectStore(GOODS_RECEIPTS_STORE_NAME);
        if (!goodsReceiptsStore.indexNames.contains('deliverySortIndex')) {
            goodsReceiptsStore.createIndex('deliverySortIndex', ['deliveryDateSortable', 'bestBeforeDateSortable']);
        }
      }
      
      if (oldVersion < 5) {
        if (!db.objectStoreNames.contains(OPEN_ORDERS_STORE_NAME)) {
            const store = db.createObjectStore(OPEN_ORDERS_STORE_NAME, { keyPath: ['warehouseId', 'fullProductId', 'poNr'] });
            store.createIndex('deliveryDateSortIndex', 'deliveryDateSortable');
        }
      }

      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
            db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'dataType' });
        }
      }
      
      if (oldVersion < 7) {
        if (!db.objectStoreNames.contains(SALES_STORE_NAME)) {
            const store = db.createObjectStore(SALES_STORE_NAME, { keyPath: ['resaleDate', 'warehouseId', 'productId'] });
            store.createIndex('resaleDateSortIndex', 'resaleDateSortable');
        }
      }

      if (oldVersion < 8) {
        const goodsReceiptsStore = transaction.objectStore(GOODS_RECEIPTS_STORE_NAME);
        if (!goodsReceiptsStore.indexNames.contains('productIndex')) {
            goodsReceiptsStore.createIndex('productIndex', ['warehouseId', 'fullProductId']);
        }
        
        const openOrdersStore = transaction.objectStore(OPEN_ORDERS_STORE_NAME);
        if (!openOrdersStore.indexNames.contains('productIndex')) {
            openOrdersStore.createIndex('productIndex', ['warehouseId', 'fullProductId']);
        }
        
        const salesStore = transaction.objectStore(SALES_STORE_NAME);
        if (!salesStore.indexNames.contains('productIndex')) {
            salesStore.createIndex('productIndex', ['warehouseId', 'productId']);
        }
      }

      if (oldVersion < 9) {
        if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
            const store = db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: 'key' });
            store.put({ key: RDC_LIST_KEY, value: DEFAULT_RDC_LIST });
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
export const addOpenOrders = (orders: OpenOrder[]) => addDataInBatches(OPEN_ORDERS_STORE_NAME, orders);
export const addSales = (sales: Sale[]) => addDataInBatches(SALES_STORE_NAME, sales);

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

const clearDataAndMetadata = async (storeName: string, dataType: DataType) => {
    await clearStore(storeName);
    const db = await openDB();
    const transaction = db.transaction(METADATA_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE_NAME);
    store.delete(dataType);
     return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const clearProducts = () => clearDataAndMetadata(PRODUCTS_STORE_NAME, 'products');
export const clearGoodsReceipts = () => clearDataAndMetadata(GOODS_RECEIPTS_STORE_NAME, 'goodsReceipts');
export const clearOpenOrders = () => clearDataAndMetadata(OPEN_ORDERS_STORE_NAME, 'openOrders');
export const clearSales = () => clearDataAndMetadata(SALES_STORE_NAME, 'sales');

export const checkDBStatus = async (): Promise<DBStatus> => {
    try {
        const db = await openDB();
        const transaction = db.transaction([PRODUCTS_STORE_NAME, GOODS_RECEIPTS_STORE_NAME, OPEN_ORDERS_STORE_NAME, SALES_STORE_NAME], 'readonly');
        const productsStore = transaction.objectStore(PRODUCTS_STORE_NAME);
        const goodsReceiptsStore = transaction.objectStore(GOODS_RECEIPTS_STORE_NAME);
        const openOrdersStore = transaction.objectStore(OPEN_ORDERS_STORE_NAME);
        const salesStore = transaction.objectStore(SALES_STORE_NAME);

        const productsCountRequest = productsStore.count();
        const goodsReceiptsCountRequest = goodsReceiptsStore.count();
        const openOrdersCountRequest = openOrdersStore.count();
        const salesCountRequest = salesStore.count();

        return new Promise((resolve, reject) => {
            let productsCount = 0;
            let goodsReceiptsCount = 0;
            let openOrdersCount = 0;
            let salesCount = 0;

            productsCountRequest.onsuccess = () => { productsCount = productsCountRequest.result; };
            goodsReceiptsCountRequest.onsuccess = () => { goodsReceiptsCount = goodsReceiptsCountRequest.result; };
            openOrdersCountRequest.onsuccess = () => { openOrdersCount = openOrdersCountRequest.result; };
            salesCountRequest.onsuccess = () => { salesCount = salesCountRequest.result; };
            
            transaction.oncomplete = () => {
                resolve({ productsCount, goodsReceiptsCount, openOrdersCount, salesCount });
            };
            
            transaction.onerror = () => { reject(transaction.error); };
        });
    } catch (e) {
        return { productsCount: 0, goodsReceiptsCount: 0, openOrdersCount: 0, salesCount: 0 };
    }
};

export const clearAllData = async (): Promise<void> => {
    await clearStore(PRODUCTS_STORE_NAME);
    await clearStore(GOODS_RECEIPTS_STORE_NAME);
    await clearStore(OPEN_ORDERS_STORE_NAME);
    await clearStore(SALES_STORE_NAME);
    await clearStore(METADATA_STORE_NAME);
    // Note: This does NOT clear the SETTINGS_STORE_NAME to preserve RDC list, etc.
    // We only clear linked files.
    const allSettings = await loadAllSettings();
    for (const key of allSettings.keys()) {
        if(key.startsWith('linkedFile:')) {
            await deleteSetting(key);
        }
    }
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

export const getGoodsReceiptsPaginatedAndFiltered = async (
    page: number,
    pageSize: number,
    filters: { warehouseId?: string; productId?: string }
): Promise<{ data: GoodsReceipt[]; total: number }> => {
    const db = await openDB();
    const transaction = db.transaction(GOODS_RECEIPTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(GOODS_RECEIPTS_STORE_NAME);
    const index = store.index('deliverySortIndex');

    const data: GoodsReceipt[] = [];
    let total = 0;
    const offset = (page - 1) * pageSize;

    return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 'prev' for descending order (newest first)

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const receipt: GoodsReceipt = cursor.value;

                const matchesWarehouse = !filters.warehouseId || receipt.warehouseId === filters.warehouseId;
                const matchesProduct = !filters.productId || receipt.productId === filters.productId;

                if (matchesWarehouse && matchesProduct) {
                    if (total >= offset && data.length < pageSize) {
                        data.push(receipt);
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

export const getOpenOrdersPaginatedAndFiltered = async (
    page: number,
    pageSize: number,
    filters: { warehouseId?: string; productId?: string }
): Promise<{ data: OpenOrder[]; total: number }> => {
    const db = await openDB();
    const transaction = db.transaction(OPEN_ORDERS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(OPEN_ORDERS_STORE_NAME);
    const index = store.index('deliveryDateSortIndex');

    const data: OpenOrder[] = [];
    let total = 0;
    const offset = (page - 1) * pageSize;

    return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 'prev' for descending order (newest first)

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const order: OpenOrder = cursor.value;

                const matchesWarehouse = !filters.warehouseId || order.warehouseId === filters.warehouseId;
                const matchesProduct = !filters.productId || order.productId === filters.productId;

                if (matchesWarehouse && matchesProduct) {
                    if (total >= offset && data.length < pageSize) {
                        data.push(order);
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

export const getSalesPaginatedAndFiltered = async (
    page: number,
    pageSize: number,
    filters: { warehouseId?: string; productId?: string }
): Promise<{ data: Sale[]; total: number }> => {
    const db = await openDB();
    const transaction = db.transaction(SALES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SALES_STORE_NAME);
    const index = store.index('resaleDateSortIndex');

    const data: Sale[] = [];
    let total = 0;
    const offset = (page - 1) * pageSize;

    return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 'prev' for descending order (newest first)

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const sale: Sale = cursor.value;

                const matchesWarehouse = !filters.warehouseId || sale.warehouseId === filters.warehouseId;
                const matchesProduct = !filters.productId || sale.productId === filters.productId;

                if (matchesWarehouse && matchesProduct) {
                    if (total >= offset && data.length < pageSize) {
                        data.push(sale);
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

export const getUniqueWarehouseIdsForGoodsReceipts = async (): Promise<string[]> => {
    const db = await openDB();
    const transaction = db.transaction(GOODS_RECEIPTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(GOODS_RECEIPTS_STORE_NAME);
    const request = store.openCursor();
    const warehouses = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const receipt: GoodsReceipt = cursor.value;
                if(receipt.warehouseId) {
                    warehouses.add(receipt.warehouseId);
                }
                cursor.continue();
            } else {
                resolve(Array.from(warehouses).sort());
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const getUniqueWarehouseIdsForOpenOrders = async (): Promise<string[]> => {
    const db = await openDB();
    const transaction = db.transaction(OPEN_ORDERS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(OPEN_ORDERS_STORE_NAME);
    const request = store.openCursor();
    const warehouses = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const order: OpenOrder = cursor.value;
                if(order.warehouseId) {
                    warehouses.add(order.warehouseId);
                }
                cursor.continue();
            } else {
                resolve(Array.from(warehouses).sort());
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const getUniqueWarehouseIdsForSales = async (): Promise<string[]> => {
    const db = await openDB();
    const transaction = db.transaction(SALES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SALES_STORE_NAME);
    const request = store.openCursor();
    const warehouses = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const sale: Sale = cursor.value;
                if(sale.warehouseId) {
                    warehouses.add(sale.warehouseId);
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

export const getProductDetails = async (warehouseId: string, fullProductId: string): Promise<Product | null> => {
    const db = await openDB();
    const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCTS_STORE_NAME);
    const request = store.get([warehouseId, fullProductId]);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result ?? null);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

const getAllFromIndex = async <T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> => {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(key);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result ?? []);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

export const getAllGoodsReceiptsForProduct = (warehouseId: string, fullProductId: string): Promise<GoodsReceipt[]> => {
    return getAllFromIndex<GoodsReceipt>(GOODS_RECEIPTS_STORE_NAME, 'productIndex', [warehouseId, fullProductId]);
};

export const getAllOpenOrdersForProduct = (warehouseId: string, fullProductId: string): Promise<OpenOrder[]> => {
    return getAllFromIndex<OpenOrder>(OPEN_ORDERS_STORE_NAME, 'productIndex', [warehouseId, fullProductId]);
};

export const getAllSalesForProduct = (warehouseId: string, productId: string): Promise<Sale[]> => {
    return getAllFromIndex<Sale>(SALES_STORE_NAME, 'productIndex', [warehouseId, productId]);
};

export const updateImportMetadata = async (dataType: DataType): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(METADATA_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE_NAME);
    const request = store.put({ dataType, lastImported: new Date() });

    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getImportMetadata = async (): Promise<ImportMetadata> => {
    const db = await openDB();
    const transaction = db.transaction(METADATA_STORE_NAME, 'readonly');
    const store = transaction.objectStore(METADATA_STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const result: ImportMetadata = {
                products: null,
                goodsReceipts: null,
                openOrders: null,
                sales: null,
            };
            const allMeta = request.result as ImportMeta[];
            allMeta.forEach(meta => {
                result[meta.dataType] = meta;
            });
            resolve(result);
        };
        request.onerror = () => reject(request.error);
    });
};

// --- Settings Functions ---

export const saveSetting = async (key: string, value: any): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(SETTINGS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    store.put({ key, value });
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const loadSetting = async <T>(key: string): Promise<T | null> => {
    const db = await openDB();
    const transaction = db.transaction(SETTINGS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const request = store.get(key);
    return new Promise<T | null>((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
        };
        request.onerror = () => reject(request.error);
    });
};

export const loadAllSettings = async (): Promise<Map<string, any>> => {
    const db = await openDB();
    const transaction = db.transaction(SETTINGS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const map = new Map<string, any>();
            request.result.forEach(item => {
                map.set(item.key, item.value);
            });
            resolve(map);
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSetting = async (key: string): Promise<void> => {
    const db = await openDB();
    const transaction = db.transaction(SETTINGS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE_NAME);
    store.delete(key);
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const saveRdcList = (rdcs: RDC[]): Promise<void> => saveSetting(RDC_LIST_KEY, rdcs);

export const loadRdcList = async (): Promise<RDC[]> => {
    const list = await loadSetting<RDC[]>(RDC_LIST_KEY);
    return list ?? DEFAULT_RDC_LIST;
};
export type { Product, GoodsReceipt, OpenOrder, Sale, ImportMeta, ImportMetadata, DataType } from './utils/types';

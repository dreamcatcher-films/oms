import { RDC, DataType, ShcDataType, ImportMetadata, ImportMeta, Product, GoodsReceipt, OpenOrder, Sale, ExclusionListData, ShcDataRow, PlanogramRow, OrgStructureRow, CategoryRelationRow, ShcSectionConfig, ShcSectionGroup, ShcSnapshot, WriteOffsActual, WriteOffsTarget } from './utils/types';

const DB_NAME = 'OMSDatabase';
const PRODUCTS_STORE_NAME = 'products';
const GOODS_RECEIPTS_STORE_NAME = 'goodsReceipts';
const OPEN_ORDERS_STORE_NAME = 'openOrders';
const SALES_STORE_NAME = 'sales';
const SHC_STORE_NAME = 'shc';
const PLANOGRAM_STORE_NAME = 'planogram';
const ORG_STRUCTURE_STORE_NAME = 'orgStructure';
const CATEGORY_RELATION_STORE_NAME = 'categoryRelation';
const WRITE_OFFS_WEEKLY_STORE_NAME = 'writeOffsWeekly';
const WRITE_OFFS_YTD_STORE_NAME = 'writeOffsYTD';
const WRITE_OFFS_TARGETS_STORE_NAME = 'writeOffsTargets';
const METADATA_STORE_NAME = 'importMetadata';
const SETTINGS_STORE_NAME = 'settings';
const DB_VERSION = 15; 

const RDC_LIST_KEY = 'rdcList';
const EXCLUSION_LIST_KEY = 'exclusionList'; // For Status Report
const SHC_EXCLUSION_LIST_KEY = 'shcExclusionList'; // For SHC Report
const SHC_BASELINE_DATA_KEY = 'shcBaselineData'; // For Compliance Report
const SHC_PREVIOUS_WEEK_DATA_KEY = 'shcPreviousWeekData'; // For Compliance Report

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
  shcCount: number;
  planogramCount: number;
  orgStructureCount: number;
  categoryRelationCount: number;
  writeOffsWeeklyCount: number;
  writeOffsYTDCount: number;
  writeOffsTargetsCount: number;
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

      if (oldVersion < 10) {
        const productsStore = transaction.objectStore(PRODUCTS_STORE_NAME);
        if (!productsStore.indexNames.contains('productId_lower_idx')) {
            productsStore.createIndex('productId_lower_idx', 'productId_lower');
        }
        
        // Backfill existing data
        productsStore.openCursor().onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const product = cursor.value;
                if (typeof product.productId_lower === 'undefined') {
                    product.productId_lower = product.productId.toLowerCase();
                    cursor.update(product);
                }
                cursor.continue();
            }
        };
      }
      
      if (oldVersion < 12) {
          // This migration cleans up the now-unused index from version 11
          const productsStore = transaction.objectStore(PRODUCTS_STORE_NAME);
          if (productsStore.indexNames.contains('shortIdIndex')) {
              productsStore.deleteIndex('shortIdIndex');
          }
      }

      if (oldVersion < 13) {
        if (!db.objectStoreNames.contains(SHC_STORE_NAME)) {
            const store = db.createObjectStore(SHC_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('storeNumberIndex', 'storeNumber');
        }
        if (!db.objectStoreNames.contains(PLANOGRAM_STORE_NAME)) {
            const store = db.createObjectStore(PLANOGRAM_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('itemNumberIndex', 'itemNumber');
        }
        if (!db.objectStoreNames.contains(ORG_STRUCTURE_STORE_NAME)) {
            const store = db.createObjectStore(ORG_STRUCTURE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('storeNumberIndex', 'storeNumber');
            store.createIndex('warehouseIdIndex', 'warehouseId');
        }
        if (!db.objectStoreNames.contains(CATEGORY_RELATION_STORE_NAME)) {
            const store = db.createObjectStore(CATEGORY_RELATION_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('storeNumberIndex', 'storeNumber');
        }
      }
      
      if (oldVersion < 14) {
        const orgStore = transaction.objectStore(ORG_STRUCTURE_STORE_NAME);
        if (!orgStore.indexNames.contains('storeNumberIndex')) {
          orgStore.createIndex('storeNumberIndex', 'storeNumber');
        }
        if (!orgStore.indexNames.contains('warehouseIdIndex')) {
          orgStore.createIndex('warehouseIdIndex', 'warehouseId');
        }

        const shcStore = transaction.objectStore(SHC_STORE_NAME);
        if (!shcStore.indexNames.contains('storeNumberIndex')) {
          shcStore.createIndex('storeNumberIndex', 'storeNumber');
        }
      }

      if (oldVersion < 15) {
        if (!db.objectStoreNames.contains(WRITE_OFFS_WEEKLY_STORE_NAME)) {
            const store = db.createObjectStore(WRITE_OFFS_WEEKLY_STORE_NAME, { keyPath: 'id' });
            store.createIndex('storeAndGroupIndex', ['storeNumber', 'itemGroupNumber']);
        }
        if (!db.objectStoreNames.contains(WRITE_OFFS_YTD_STORE_NAME)) {
            const store = db.createObjectStore(WRITE_OFFS_YTD_STORE_NAME, { keyPath: 'id' });
            store.createIndex('storeAndGroupIndex', ['storeNumber', 'itemGroupNumber']);
        }
        if (!db.objectStoreNames.contains(WRITE_OFFS_TARGETS_STORE_NAME)) {
            db.createObjectStore(WRITE_OFFS_TARGETS_STORE_NAME, { keyPath: 'id' });
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

    // No need for individual promises, let the transaction handle it.
    for (const item of data) {
        store.put(item);
    }
    
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export const addProducts = (products: Product[]) => addDataInBatches(PRODUCTS_STORE_NAME, products);
export const addGoodsReceipts = (receipts: GoodsReceipt[]) => addDataInBatches(GOODS_RECEIPTS_STORE_NAME, receipts);
export const addOpenOrders = (orders: OpenOrder[]) => addDataInBatches(OPEN_ORDERS_STORE_NAME, orders);
export const addSales = (sales: Sale[]) => addDataInBatches(SALES_STORE_NAME, sales);
export const addShcData = (data: ShcDataRow[]) => addDataInBatches(SHC_STORE_NAME, data);
export const addPlanogramData = (data: PlanogramRow[]) => addDataInBatches(PLANOGRAM_STORE_NAME, data);
export const addOrgStructureData = (data: OrgStructureRow[]) => addDataInBatches(ORG_STRUCTURE_STORE_NAME, data);
export const addCategoryRelationData = (data: CategoryRelationRow[]) => addDataInBatches(CATEGORY_RELATION_STORE_NAME, data);
export const addWriteOffsWeekly = (data: WriteOffsActual[]) => addDataInBatches(WRITE_OFFS_WEEKLY_STORE_NAME, data);
export const addWriteOffsYTD = (data: WriteOffsActual[]) => addDataInBatches(WRITE_OFFS_YTD_STORE_NAME, data);
export const saveWriteOffsTargets = (data: WriteOffsTarget[]) => addDataInBatches(WRITE_OFFS_TARGETS_STORE_NAME, data);

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

const clearDataAndMetadata = async (storeName: string, dataType: DataType | ShcDataType) => {
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
export const clearShcData = () => clearDataAndMetadata(SHC_STORE_NAME, 'shc');
export const clearPlanogramData = () => clearDataAndMetadata(PLANOGRAM_STORE_NAME, 'planogram');
export const clearOrgStructureData = () => clearDataAndMetadata(ORG_STRUCTURE_STORE_NAME, 'orgStructure');
export const clearCategoryRelationData = () => clearDataAndMetadata(CATEGORY_RELATION_STORE_NAME, 'categoryRelation');
export const clearWriteOffsWeekly = () => clearDataAndMetadata(WRITE_OFFS_WEEKLY_STORE_NAME, 'writeOffsWeekly');
export const clearWriteOffsYTD = () => clearDataAndMetadata(WRITE_OFFS_YTD_STORE_NAME, 'writeOffsYTD');
export const clearWriteOffsTargets = () => clearStore(WRITE_OFFS_TARGETS_STORE_NAME);

export const checkDBStatus = async (): Promise<DBStatus> => {
    try {
        const db = await openDB();
        const storeNames = [
            PRODUCTS_STORE_NAME, GOODS_RECEIPTS_STORE_NAME, OPEN_ORDERS_STORE_NAME, SALES_STORE_NAME,
            SHC_STORE_NAME, PLANOGRAM_STORE_NAME, ORG_STRUCTURE_STORE_NAME, CATEGORY_RELATION_STORE_NAME,
            WRITE_OFFS_WEEKLY_STORE_NAME, WRITE_OFFS_YTD_STORE_NAME, WRITE_OFFS_TARGETS_STORE_NAME
        ];
        const transaction = db.transaction(storeNames, 'readonly');
        
        const counts = await Promise.all(storeNames.map(name => {
            return new Promise<number>((resolve, reject) => {
                const request = transaction.objectStore(name).count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }));

        return {
            productsCount: counts[0],
            goodsReceiptsCount: counts[1],
            openOrdersCount: counts[2],
            salesCount: counts[3],
            shcCount: counts[4],
            planogramCount: counts[5],
            orgStructureCount: counts[6],
            categoryRelationCount: counts[7],
            writeOffsWeeklyCount: counts[8],
            writeOffsYTDCount: counts[9],
            writeOffsTargetsCount: counts[10],
        };

    } catch (e) {
        return { 
            productsCount: 0, goodsReceiptsCount: 0, openOrdersCount: 0, salesCount: 0,
            shcCount: 0, planogramCount: 0, orgStructureCount: 0, categoryRelationCount: 0,
            writeOffsWeeklyCount: 0, writeOffsYTDCount: 0, writeOffsTargetsCount: 0
        };
    }
};

export const clearAllData = async (): Promise<void> => {
    await clearStore(PRODUCTS_STORE_NAME);
    await clearStore(GOODS_RECEIPTS_STORE_NAME);
    await clearStore(OPEN_ORDERS_STORE_NAME);
    await clearStore(SALES_STORE_NAME);
    await clearStore(SHC_STORE_NAME);
    await clearStore(PLANOGRAM_STORE_NAME);
    await clearStore(ORG_STRUCTURE_STORE_NAME);
    await clearStore(CATEGORY_RELATION_STORE_NAME);
    await clearStore(WRITE_OFFS_WEEKLY_STORE_NAME);
    await clearStore(WRITE_OFFS_YTD_STORE_NAME);
    await clearStore(WRITE_OFFS_TARGETS_STORE_NAME);
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

const getPaginatedData = async <T>(storeName: string, page: number, pageSize: number): Promise<{ data: T[], total: number }> => {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);

    const totalReq = store.count();
    
    return new Promise((resolve, reject) => {
        totalReq.onsuccess = () => {
            const total = totalReq.result;
            const data: T[] = [];
            if (total === 0) {
                resolve({ data, total });
                return;
            }

            const cursorReq = store.openCursor();
            let advanced = false;
            const offset = (page - 1) * pageSize;

            cursorReq.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
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
            cursorReq.onerror = () => reject(cursorReq.error);
        };
        totalReq.onerror = () => reject(totalReq.error);
    });
};

export const getShcDataPaginated = (page: number, pageSize: number) => getPaginatedData<ShcDataRow>(SHC_STORE_NAME, page, pageSize);
export const getPlanogramDataPaginated = (page: number, pageSize: number) => getPaginatedData<PlanogramRow>(PLANOGRAM_STORE_NAME, page, pageSize);
export const getOrgStructureDataPaginated = (page: number, pageSize: number) => getPaginatedData<OrgStructureRow>(ORG_STRUCTURE_STORE_NAME, page, pageSize);
export const getCategoryRelationDataPaginated = (page: number, pageSize: number) => getPaginatedData<CategoryRelationRow>(CATEGORY_RELATION_STORE_NAME, page, pageSize);


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

export const getUniqueItemGroups = async (): Promise<string[]> => {
    const db = await openDB();
    const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCTS_STORE_NAME);
    const request = store.openCursor();
    const itemGroups = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const product: Product = cursor.value;
                if (product.itemGroup) {
                    const itemGroupId = parseInt(product.itemGroup, 10);
                    if (!isNaN(itemGroupId) && itemGroupId <= 95) {
                        itemGroups.add(product.itemGroup);
                    }
                }
                cursor.continue();
            } else {
                resolve(Array.from(itemGroups).sort());
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const getProductsByCriteria = async (filters: {
  warehouseIds?: string[];
  itemGroupIds?: string[];
  statusIds?: string[];
}): Promise<Product[]> => {
  const db = await openDB();
  const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(PRODUCTS_STORE_NAME);
  const request = store.openCursor();
  const products: Product[] = [];

  const hasWarehouseFilter = filters.warehouseIds && filters.warehouseIds.length > 0;
  const hasItemGroupFilter = filters.itemGroupIds && filters.itemGroupIds.length > 0;
  const hasStatusFilter = filters.statusIds && filters.statusIds.length > 0;

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const product: Product = cursor.value;

        const matchesWarehouse = !hasWarehouseFilter || filters.warehouseIds!.includes(product.warehouseId);
        const matchesItemGroup = !hasItemGroupFilter || filters.itemGroupIds!.includes(product.itemGroup);
        const matchesStatus = !hasStatusFilter || filters.statusIds!.includes(product.status);
        
        if (matchesWarehouse && matchesItemGroup && matchesStatus) {
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


export const findProductsByPartialId = async (partialId: string, limit: number = 10, warehouseId?: string): Promise<Product[]> => {
    if (!partialId) return [];
    const db = await openDB();
    const transaction = db.transaction(PRODUCTS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PRODUCTS_STORE_NAME);
    const index = store.index('productId_lower_idx');

    const lowerCasePartialId = partialId.toLowerCase();
    const range = IDBKeyRange.bound(lowerCasePartialId, lowerCasePartialId + '\uffff');
    const request = index.openCursor(range);

    const products: Product[] = [];

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor && products.length < limit * 2) { // Fetch more to allow for filtering
                const product: Product = cursor.value;
                if (!warehouseId || product.warehouseId === warehouseId) {
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

const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result ?? []);
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

export const getAllProducts = (): Promise<Product[]> => getAllFromStore<Product>(PRODUCTS_STORE_NAME);
export const getAllOpenOrders = (): Promise<OpenOrder[]> => getAllFromStore<OpenOrder>(OPEN_ORDERS_STORE_NAME);
export const getAllShcData = (): Promise<ShcDataRow[]> => getAllFromStore<ShcDataRow>(SHC_STORE_NAME);
export const getAllPlanogramData = (): Promise<PlanogramRow[]> => getAllFromStore<PlanogramRow>(PLANOGRAM_STORE_NAME);
export const getAllOrgStructureData = (): Promise<OrgStructureRow[]> => getAllFromStore<OrgStructureRow>(ORG_STRUCTURE_STORE_NAME);
export const getAllCategoryRelationData = (): Promise<CategoryRelationRow[]> => getAllFromStore<CategoryRelationRow>(CATEGORY_RELATION_STORE_NAME);
export const getAllWriteOffsWeekly = (): Promise<WriteOffsActual[]> => getAllFromStore<WriteOffsActual>(WRITE_OFFS_WEEKLY_STORE_NAME);
export const getAllWriteOffsYTD = (): Promise<WriteOffsActual[]> => getAllFromStore<WriteOffsActual>(WRITE_OFFS_YTD_STORE_NAME);
export const getAllWriteOffsTargets = (): Promise<WriteOffsTarget[]> => getAllFromStore<WriteOffsTarget>(WRITE_OFFS_TARGETS_STORE_NAME);


export const getAllGoodsReceiptsForProduct = (warehouseId: string, fullProductId: string): Promise<GoodsReceipt[]> => {
    return getAllFromIndex<GoodsReceipt>(GOODS_RECEIPTS_STORE_NAME, 'productIndex', [warehouseId, fullProductId]);
};

export const getAllOpenOrdersForProduct = (warehouseId: string, fullProductId: string): Promise<OpenOrder[]> => {
    return getAllFromIndex<OpenOrder>(OPEN_ORDERS_STORE_NAME, 'productIndex', [warehouseId, fullProductId]);
};

export const getAllSalesForProduct = (warehouseId: string, productId: string): Promise<Sale[]> => {
    return getAllFromIndex<Sale>(SALES_STORE_NAME, 'productIndex', [warehouseId, productId]);
};

export const updateImportMetadata = async (dataType: DataType | ShcDataType): Promise<void> => {
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
                shc: null,
                planogram: null,
                orgStructure: null,
                categoryRelation: null,
                writeOffsWeekly: null,
                writeOffsYTD: null,
            };
            const allMeta = request.result as ImportMeta[];
            allMeta.forEach(meta => {
                (result as any)[meta.dataType] = meta;
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

// --- Exclusion List Functions ---
export const saveExclusionList = (list: string[]): Promise<void> => {
    const data = {
        list,
        lastUpdated: new Date(),
    };
    return saveSetting(EXCLUSION_LIST_KEY, data);
};

export const loadExclusionList = async (): Promise<ExclusionListData> => {
    const data = await loadSetting<{ list: string[], lastUpdated: string }>(EXCLUSION_LIST_KEY);
    if (data && Array.isArray(data.list)) {
        return {
            list: new Set(data.list),
            lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : null,
        };
    }
    return { list: new Set(), lastUpdated: null };
};

export const getUniqueShcSections = async (): Promise<string[]> => {
    const db = await openDB();
    const transaction = db.transaction(CATEGORY_RELATION_STORE_NAME, 'readonly');
    const store = transaction.objectStore(CATEGORY_RELATION_STORE_NAME);
    const request = store.openCursor();
    
    const sections = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const relation: CategoryRelationRow = cursor.value;
                if (relation.settingSpecificallyFor) {
                    sections.add(relation.settingSpecificallyFor);
                }
                cursor.continue();
            } else {
                resolve(Array.from(sections).sort());
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const getUniqueShcSectionsGrouped = async (): Promise<ShcSectionGroup[]> => {
    const allRelations = await getAllCategoryRelationData();
    const groups = new Map<string, Set<string>>();

    for (const relation of allRelations) {
        if (relation.generalStoreArea && relation.settingSpecificallyFor) {
            if (!groups.has(relation.generalStoreArea)) {
                groups.set(relation.generalStoreArea, new Set());
            }
            groups.get(relation.generalStoreArea)!.add(relation.settingSpecificallyFor);
        }
    }

    const result: ShcSectionGroup[] = Array.from(groups.entries())
        .map(([groupName, sectionsSet]) => ({
            groupName,
            sections: Array.from(sectionsSet).sort(),
        }))
        .sort((a, b) => a.groupName.localeCompare(b.groupName));
    
    return result;
};

const getUniqueStoreNumbersFromShc = async (): Promise<Set<string>> => {
    const db = await openDB();
    const transaction = db.transaction(SHC_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SHC_STORE_NAME);
    const index = store.index('storeNumberIndex');
    const request = index.openKeyCursor(null, 'nextunique');
    const numbers = new Set<string>();
    return new Promise((resolve, reject) => {
        request.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursor>).result;
            if (cursor) {
                numbers.add(cursor.key as string);
                cursor.continue();
            } else {
                resolve(numbers);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

const getStoreNumbersFromOrgStructure = async (rdcId?: string): Promise<Set<string>> => {
    const db = await openDB();
    const transaction = db.transaction(ORG_STRUCTURE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(ORG_STRUCTURE_STORE_NAME);
    const request = store.openCursor();
    const numbers = new Set<string>();

    return new Promise((resolve, reject) => {
        request.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const org: OrgStructureRow = cursor.value;
                if (!rdcId || org.warehouseId === rdcId) {
                    numbers.add(org.storeNumber);
                }
                cursor.continue();
            } else {
                resolve(numbers);
            }
        };
        request.onerror = () => reject(request.error);
    });
};


export const validateStoresExistInShc = async (rdcId: string): Promise<string[]> => {
    const [orgStores, shcStores] = await Promise.all([
        getStoreNumbersFromOrgStructure(rdcId),
        getUniqueStoreNumbersFromShc(),
    ]);
    
    const missingStores: string[] = [];
    orgStores.forEach(storeNum => {
        if (!shcStores.has(storeNum)) {
            missingStores.push(storeNum);
        }
    });
    return missingStores.sort();
};

export const getStoreCountsForShcReport = async (rdcId: string): Promise<{ shcStoreCount: number, orgStoreCount: number }> => {
    const [rdcStoreNumbers, allShcStoreNumbers] = await Promise.all([
        getStoreNumbersFromOrgStructure(rdcId),
        getUniqueStoreNumbersFromShc(),
    ]);
    
    let shcStoreCountInRdc = 0;
    rdcStoreNumbers.forEach(storeNum => {
        if (allShcStoreNumbers.has(storeNum)) {
            shcStoreCountInRdc++;
        }
    });

    return {
        shcStoreCount: shcStoreCountInRdc,
        orgStoreCount: rdcStoreNumbers.size,
    };
};

export const clearExclusionList = (): Promise<void> => deleteSetting(EXCLUSION_LIST_KEY);

// --- SHC Exclusion List Functions ---
export const saveShcExclusionList = (list: string[]): Promise<void> => saveSetting(SHC_EXCLUSION_LIST_KEY, list);
export const loadShcExclusionList = async (): Promise<Set<string>> => {
    const list = await loadSetting<string[]>(SHC_EXCLUSION_LIST_KEY);
    return new Set(list || []);
};
export const clearShcExclusionList = (): Promise<void> => deleteSetting(SHC_EXCLUSION_LIST_KEY);

// --- SHC Compliance Report Data Functions ---
export const saveShcBaselineData = (data: ShcSnapshot): Promise<void> => saveSetting(SHC_BASELINE_DATA_KEY, data);
export const loadShcBaselineData = (): Promise<ShcSnapshot | null> => loadSetting<ShcSnapshot>(SHC_BASELINE_DATA_KEY);

export const saveShcPreviousWeekData = (data: ShcSnapshot): Promise<void> => saveSetting(SHC_PREVIOUS_WEEK_DATA_KEY, data);
export const loadShcPreviousWeekData = (): Promise<ShcSnapshot | null> => loadSetting<ShcSnapshot>(SHC_PREVIOUS_WEEK_DATA_KEY);


export type { Product, GoodsReceipt, OpenOrder, Sale, ImportMeta, ImportMetadata, DataType, ShcDataType, ShcDataRow, PlanogramRow, OrgStructureRow, CategoryRelationRow, ShcWorkerMessage, ShcWorkerRequest, ShcSectionConfig, WriteOffsActual, WriteOffsTarget } from './utils/types';

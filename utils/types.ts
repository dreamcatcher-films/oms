export type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
  progress?: number;
};

export type View = 'import' | 'report' | 'dashboard' | 'simulations' | 'data-preview' | 'settings';

export type DataType = 'products' | 'goodsReceipts' | 'openOrders' | 'sales';

export type ManualDelivery = {
    date: string;
    quantity: number;
    bestBeforeDate: string;
    id: number;
};

export type RDC = {
    id: string;
    name: string;
};

export type UserSession = {
    mode: 'hq' | 'rdc';
    rdc?: RDC;
};

export type Product = {
    warehouseId: string;
    productId: string;
    fullProductId: string;
    name: string;
    caseSize: number;
    shelfLifeAtReceiving: number;
    shelfLifeAtStore: number;
    customerShelfLife: number;
    price: number;
    status: string;
    promoDate: string;
    supplierId: string;
    supplierName: string;
    stockOnHand: number;
    storeAllocationToday: number;
    storeAllocationTotal: number;
    estimatedReceivings: { date: string, quantity: number }[];
    dispoGroup: string;
    itemGroup: string;
    orderArea: string;
    cartonsPerLayer: number;
    duessFactor: number;
    cartonsPerPallet: number;
    itemLocked: string;
    slotNr: string;
    unprocessedDeliveryQty: number;
};

export type GoodsReceipt = {
    warehouseId: string;
    fullProductId: string;
    deliveryNote: string;
    productId: string;
    name: string;
    deliveryUnit: string;
    deliveryQtyUom: number;
    caseSize: number;
    deliveryQtyPcs: number;
    poNr: string;
    deliveryDate: string;
    bestBeforeDate: string;
    bolNr: string;
    supplierId: string;
    supplierName: string;
    intSupplierNr: string;
    intItemNr: string;
    caseGtin: string;
    liaReference: string;
    deliveryDateSortable: string;
    bestBeforeDateSortable: string;
};

export type OpenOrder = {
    warehouseId: string;
    fullProductId: string;
    poNr: string;
    productId: string;
    name: string;
    orderUnit: string;
    orderQtyUom: number;
    caseSize: number;
    orderQtyPcs: number;
    supplierId: string;
    supplierName: string;
    deliveryDate: string;
    creationDate: string;
    deliveryLeadTime: number;
    deliveryDateSortable: string;
};

export type Sale = {
    resaleDate: string;
    warehouseId: string;
    productId: string;
    productName: string;
    quantity: number;
    resaleDateSortable: string;
};

export type ImportMeta = {
    dataType: DataType;
    lastImported: Date;
};

export type ImportMetadata = {
    products: ImportMeta | null;
    goodsReceipts: ImportMeta | null;
    openOrders: ImportMeta | null;
    sales: ImportMeta | null;
};

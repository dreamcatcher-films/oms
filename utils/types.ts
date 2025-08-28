export type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
  progress?: number;
};

export type View = 'import' | 'threat-report' | 'dashboard' | 'simulations' | 'data-preview' | 'settings' | 'status-report' | 'shc-report' | 'write-offs-report' | 'shc-compliance-report';

export type DataType = 'products' | 'goodsReceipts' | 'openOrders' | 'sales' | 'writeOffsWeekly' | 'writeOffsYTD';
export type ShcDataType = 'shc' | 'planogram' | 'orgStructure' | 'categoryRelation';

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

export type DirectorOfOperations = {
    directorName: string;
    rdcIds: string[];
};

export type UserSession = {
    mode: 'hq' | 'rdc';
    rdc?: RDC;
};

export type ExclusionListData = {
  list: Set<string>;
  lastUpdated: Date | null;
};

export type Product = {
    warehouseId: string;
    productId: string;
    productId_lower?: string;
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

export type WriteOffsActual = {
    id: string; // composite key e.g. `${storeNumber}-${itemGroupNumber}-${metricId}`
    metricName: string;
    metricId: string;
    period: string;
    storeNumber: string;
    storeName: string;
    itemGroupNumber: string;
    itemGroupName: string;
    value: number;
};

export type WriteOffsTarget = {
    id: string; // composite key e.g. `${storeNumber}-${itemGroupNumber}`
    storeNumber: string;
    itemGroupNumber: string;
    monthlyTarget?: number;
    yearlyTarget?: number;
};

// --- Write-Offs Report ---
export type WriteOffsMetrics = {
  turnover: number;
  writeOffsValue: number;
  writeOffsPercent: number;
  writeOffsTotalValue: number;
  writeOffsTotalPercent: number;
  discountsValue: number;
  discountsPercent: number;
  damagesValue: number;
  damagesPercent: number;
  target: number | null;
  deviation: number | null;
};

export type ReportRow = {
  id: string;
  name: string;
  level: 0 | 1 | 2 | 3 | 4 | 5; // 0: All, 1: DoO, 2: RDC, 3: HoS, 4: AM, 5: Store
  metrics: WriteOffsMetrics;
  children: ReportRow[];
  storeCount: number;
  summedMetrics: WriteOffsMetrics & { ytd?: WriteOffsMetrics };
  maxValuesInScope?: {
      turnover: number;
      writeOffsValue: number;
      writeOffsTotalValue: number;
      discountsValue: number;
      damagesValue: number;
      writeOffsPercent: number;
      writeOffsTotalPercent: number;
      discountsPercent: number;
      damagesPercent: number;
  };
  ytdMetrics?: {
    writeOffsTotalPercent: number;
    target: number | null;
    deviation: number | null;
  };
};


export type ImportMeta = {
    dataType: DataType | ShcDataType;
    lastImported: Date;
};

export type ImportMetadata = {
    [key in DataType | ShcDataType]: ImportMeta | null;
};


// --- Threat Report Worker Types ---
export type WorkerRequest = {
    warehouseIds: string[];
    itemGroupIds: string[];
    statusIds: string[];
};

export type ReportResultItem = {
    warehouseId: string;
    productId: string;
    fullProductId: string;
    productName: string;
    caseSize: number;
    cartonsPerPallet: number;
    daysOfStock: number;
    aldValue: number;
    avgDailySales: number;
    nonCompliantReceipts: number;
    totalWriteOffValue: number;
};

export type ProgressPayload = {
    processed: number;
    total: number;
};

export type WorkerMessage = 
    | { type: 'progress', payload: ProgressPayload }
    | { type: 'complete', payload: ReportResultItem[] };

// --- Status Report Worker Types ---
export type StatusReportWorkerRequest = {
    allWarehouseIds: string[];
};

export type DominantStatusInfo = {
    status: string; // The status value, or '-' if none
    type: 'dominant' | 'mostFrequent' | 'none';
};

export type StatusReportResultItem = {
    productId: string;
    productName: string;
    dispoGroup: string;
    itemGroup: string;
    caseSize: number;
    dominantStatusInfo: DominantStatusInfo;
    statusesByWarehouse: Record<string, string>; 
    stockByWarehouse: Record<string, number>;
    openOrdersByWarehouse: Record<string, {
        hasFutureOrders: boolean;
        nextOrderDate: string | null;
    }>;
    isInconsistent: boolean;
};

export type StatusReportProgressPayload = {
    processed: number;
    total: number;
};

export type StatusReportWorkerMessage = 
    | { type: 'progress', payload: StatusReportProgressPayload }
    | { type: 'complete', payload: StatusReportResultItem[] };

// --- SHC vs Planogram Report Worker Types ---

// Data structures for parsed files
export type ShcDataRow = {
    id?: number;
    storeNumber: string;
    itemNumber: string;
    itemDescription: string;
    piecesInBox: number;
    itemStatus: string;
    itemGroup: string;
    shelfCapacity: number;
    shelfCapacityUnit: string;
};

export type PlanogramRow = {
    id?: number;
    generalStoreArea: string; // X23
    settingSpecificallyFor: string; // X24
    settingWidth: string; // X25
    itemNumber: string;
    itemName: string;
    targetShc: number; // Anzahl VSE
    facings: number;
    depth: number; // Fronts tief
    locatorKey?: string;
};

export type OrgStructureRow = {
    id?: number;
    storeNumber: string;
    storeName: string;
    warehouseId: string;
    areaManager: string;
    headOfSales: string;
};

export type CategoryRelationRow = {
    id?: number;
    generalStoreArea: string; // Hierarchy03
    settingSpecificallyFor: string; // Hierarchy04
    settingWidth: string; // Hierarchy05
    storeNumber: string;
    locatorKey?: string;
};


export type ShcWorkerRequest = {
    sectionConfig: ShcSectionConfigItem[];
    rdcId?: string;
};

export type ShcResultItem = {
    locator: string;
    articleNumber: string;
    articleName: string;
    itemGroup: string;
    planShc: number;
    storeShc: number;
    diff: number;
    generalStoreArea: string; // from CategoryHierarchy03
    settingSpecificallyFor: string; // from CategoryHierarchy04
    settingWidth: string; // from CategoryHierarchy05
};

export type ShcStoreResult = {
    storeNumber: string;
    discrepancyCount: number;
    items: ShcResultItem[];
    isExcluded?: boolean;
};

export type ShcManagerResult = {
    managerName: string;
    storeCount: number;
    activeStoreCount?: number;
    discrepancyCount: number;
    stores: ShcStoreResult[];
};

export type ShcHeadOfSalesResult = {
    hosName: string;
    storeCount: number;
    activeStoreCount?: number;
    discrepancyCount: number;
    managers: ShcManagerResult[];
};

export type ShcWarehouseResult = {
    warehouseName: string;
    storeCount: number;
    activeStoreCount?: number;
    discrepancyCount: number;
    hos: ShcHeadOfSalesResult[];
};

export type ShcAnalysisResult = ShcWarehouseResult[];

export type ShcMismatchItem = {
    type: 'NO_PLANOGRAM_MATCH' | 'NO_LOCATION_MATCH' | 'NO_ORG_STRUCTURE_MATCH';
    storeNumber: string;
    articleNumber: string;
    details: string;
};

export type ShcWorkerProgressPayload = {
    message: string;
    percentage: number;
};

export type ShcSectionConfigItem = {
    id: string;
    enabled: boolean;
    order: number;
};

export type ShcSectionGroup = {
    groupName: string;
    sections: string[];
};

export type ShcSectionConfig = ShcSectionConfigItem[];

export type ShcWorkerMessage = 
    | { type: 'progress', payload: ShcWorkerProgressPayload }
    | { type: 'complete', payload: { results: ShcAnalysisResult; mismatches: ShcMismatchItem[]; } }
    | { type: 'error', payload: string };

// --- SHC Parsing Worker Types ---
export type ShcParsingWorkerRequest = {
    dataType: ShcDataType;
    file: File;
};

export type ShcParsingWorkerProgressPayload = {
    message: string;
    percentage?: number;
};

export type ShcParsingWorkerDataPayload = any[];

export type ShcParsingWorkerCompletePayload = {
    totalRows: number;
};

export type ShcParsingWorkerMessage =
    | { type: 'progress', payload: ShcParsingWorkerProgressPayload }
    | { type: 'data', payload: ShcParsingWorkerDataPayload }
    | { type: 'complete', payload: ShcParsingWorkerCompletePayload }
    | { type: 'save_complete', payload: null }
    | { type: 'error', payload: string };

// --- SHC Compliance Report Types ---
export type ShcSnapshot = {
    weekNumber: number;
    year: number;
    generatedDate: string; // ISO string
    scores: Record<string, number>; // { [storeNumber]: score }
};

export type ShcComplianceStoreData = {
    storeNumber: string;
    storeName: string;
    am: string;
    hos: string;
    current: number | null;
    previous: number | null;
    start: number | null;
    change: number | null; // Percentage change from start
    isExcluded: boolean;
};

export type ShcComplianceManagerData = {
    name: string;
    stores: ShcComplianceStoreData[];
    current: number;
    previous: number;
    start: number;
    change: number | null;
    maxScores: {
        current: number;
        previous: number;
        start: number;
    };
};

export type ShcComplianceHosData = {
    name: string;
    managers: ShcComplianceManagerData[];
    current: number;
    previous: number;
    start: number;
    change: number | null;
};

export type ShcComplianceReportSummary = {
    current: number;
    previous: number;
    start: number;
    change: number | null;
}

export type ShcComplianceReportData = {
    rdcId: string;
    rdcName: string;
    hosData: ShcComplianceHosData[];
    snapshotInfo: {
        baseline: ShcSnapshot | null;
        previousWeek: ShcSnapshot | null;
    };
    rdcSummary: ShcComplianceReportSummary;
    bestRdcChange?: number;
};

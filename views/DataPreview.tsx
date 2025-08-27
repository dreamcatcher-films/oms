import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { useTranslation } from '../i18n';
import {
  Product, GoodsReceipt, OpenOrder, Sale, WriteOffsActual, WriteOffsTarget,
  ShcDataRow, PlanogramRow, OrgStructureRow, CategoryRelationRow,
  getProductsPaginatedAndFiltered, getGoodsReceiptsPaginatedAndFiltered,
  getOpenOrdersPaginatedAndFiltered, getSalesPaginatedAndFiltered,
  getShcDataPaginated, getPlanogramDataPaginated, getOrgStructureDataPaginated, getCategoryRelationDataPaginated,
  getWriteOffsWeeklyPaginated, getWriteOffsYTDPaginated, getWriteOffsTargetsPaginated,
  getUniqueProductStatuses, getUniqueWarehouseIds, getUniqueWarehouseIdsForGoodsReceipts,
  getUniqueWarehouseIdsForOpenOrders, getUniqueWarehouseIdsForSales,
  findProductsByPartialId,
} from "../db";
import { UserSession } from "../utils/types";
import styles from './DataPreview.module.css';
import sharedStyles from '../styles/shared.module.css';

const PAGE_SIZE = 20;

type TabType = 'products' | 'goodsReceipts' | 'openOrders' | 'sales' | 'shc' | 'planogram' | 'orgStructure' | 'categoryRelation' | 'writeOffsWeekly' | 'writeOffsYTD' | 'writeOffsTargets';

export const DataPreview = ({ userSession }: { userSession: UserSession | null }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [shcData, setShcData] = useState<ShcDataRow[]>([]);
  const [planogramData, setPlanogramData] = useState<PlanogramRow[]>([]);
  const [orgStructureData, setOrgStructureData] = useState<OrgStructureRow[]>([]);
  const [categoryRelationData, setCategoryRelationData] = useState<CategoryRelationRow[]>([]);
  const [writeOffsWeeklyData, setWriteOffsWeeklyData] = useState<WriteOffsActual[]>([]);
  const [writeOffsYTDData, setWriteOffsYTDData] = useState<WriteOffsActual[]>([]);
  const [writeOffsTargetsData, setWriteOffsTargetsData] = useState<WriteOffsTarget[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [productFilters, setProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  const [appliedProductFilters, setAppliedProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  
  const [goodsReceiptsFilters, setGoodsReceiptsFilters] = useState({ warehouseId: '', productId: '' });
  const [appliedGoodsReceiptsFilters, setAppliedGoodsReceiptsFilters] = useState({ warehouseId: '', productId: '' });

  const [openOrderFilters, setOpenOrderFilters] = useState({ warehouseId: '', productId: '' });
  const [appliedOpenOrderFilters, setAppliedOpenOrderFilters] = useState({ warehouseId: '', productId: '' });

  const [salesFilters, setSalesFilters] = useState({ warehouseId: '', productId: '' });
  const [appliedSalesFilters, setAppliedSalesFilters] = useState({ warehouseId: '', productId: '' });

  const [productStatuses, setProductStatuses] = useState<string[]>([]);
  const [productWarehouseIds, setProductWarehouseIds] = useState<string[]>([]);
  const [goodsReceiptsWarehouseIds, setGoodsReceiptsWarehouseIds] = useState<string[]>([]);
  const [openOrdersWarehouseIds, setOpenOrdersWarehouseIds] = useState<string[]>([]);
  const [salesWarehouseIds, setSalesWarehouseIds] = useState<string[]>([]);

  const [productIdSuggestions, setProductIdSuggestions] = useState<Product[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  
    const PRODUCT_COLUMNS: { key: keyof Product; labelKey: string }[] = [
        { key: 'warehouseId', labelKey: 'columns.product.warehouseId' },
        { key: 'dispoGroup', labelKey: 'columns.product.dispoGroup' },
        { key: 'itemGroup', labelKey: 'columns.product.itemGroup' },
        { key: 'orderArea', labelKey: 'columns.product.orderArea' },
        { key: 'productId', labelKey: 'columns.product.productId' },
        { key: 'fullProductId', labelKey: 'columns.product.fullProductId' },
        { key: 'name', labelKey: 'columns.product.name' },
        { key: 'caseSize', labelKey: 'columns.product.caseSize' },
        { key: 'cartonsPerLayer', labelKey: 'columns.product.cartonsPerLayer' },
        { key: 'duessFactor', labelKey: 'columns.product.duessFactor' },
        { key: 'cartonsPerPallet', labelKey: 'columns.product.cartonsPerPallet' },
        { key: 'shelfLifeAtReceiving', labelKey: 'columns.product.shelfLifeAtReceiving' },
        { key: 'shelfLifeAtStore', labelKey: 'columns.product.shelfLifeAtStore' },
        { key: 'customerShelfLife', labelKey: 'columns.product.customerShelfLife' },
        { key: 'price', labelKey: 'columns.product.price' },
        { key: 'status', labelKey: 'columns.product.status' },
        { key: 'itemLocked', labelKey: 'columns.product.itemLocked' },
        { key: 'slotNr', labelKey: 'columns.product.slotNr' },
        { key: 'unprocessedDeliveryQty', labelKey: 'columns.product.unprocessedDeliveryQty' },
        { key: 'supplierId', labelKey: 'columns.product.supplierId' },
        { key: 'supplierName', labelKey: 'columns.product.supplierName' },
        { key: 'stockOnHand', labelKey: 'columns.product.stockOnHand' },
        { key: 'storeAllocationToday', labelKey: 'columns.product.storeAllocationToday' },
        { key: 'storeAllocationTotal', labelKey: 'columns.product.storeAllocationTotal' },
        { key: 'promoDate', labelKey: 'columns.product.promoDate' },
        { key: 'estimatedReceivings', labelKey: 'columns.product.estimatedReceivings' },
    ];
    
    const GOODS_RECEIPT_COLUMNS: { key: keyof GoodsReceipt; labelKey: string }[] = [
        { key: 'warehouseId', labelKey: 'columns.goodsReceipt.warehouseId' },
        { key: 'productId', labelKey: 'columns.goodsReceipt.productId' },
        { key: 'fullProductId', labelKey: 'columns.goodsReceipt.fullProductId' },
        { key: 'name', labelKey: 'columns.goodsReceipt.name' },
        { key: 'deliveryUnit', labelKey: 'columns.goodsReceipt.deliveryUnit' },
        { key: 'deliveryQtyUom', labelKey: 'columns.goodsReceipt.deliveryQtyUom' },
        { key: 'caseSize', labelKey: 'columns.goodsReceipt.caseSize' },
        { key: 'deliveryQtyPcs', labelKey: 'columns.goodsReceipt.deliveryQtyPcs' },
        { key: 'poNr', labelKey: 'columns.goodsReceipt.poNr' },
        { key: 'deliveryDate', labelKey: 'columns.goodsReceipt.deliveryDate' },
        { key: 'bestBeforeDate', labelKey: 'columns.goodsReceipt.bestBeforeDate' },
        { key: 'supplierId', labelKey: 'columns.goodsReceipt.supplierId' },
        { key: 'supplierName', labelKey: 'columns.goodsReceipt.supplierName' },
        { key: 'bolNr', labelKey: 'columns.goodsReceipt.bolNr' },
        { key: 'deliveryNote', labelKey: 'columns.goodsReceipt.deliveryNote' },
        { key: 'intSupplierNr', labelKey: 'columns.goodsReceipt.intSupplierNr' },
        { key: 'intItemNr', labelKey: 'columns.goodsReceipt.intItemNr' },
        { key: 'caseGtin', labelKey: 'columns.goodsReceipt.caseGtin' },
        { key: 'liaReference', labelKey: 'columns.goodsReceipt.liaReference' },
    ];

    const OPEN_ORDER_COLUMNS: { key: keyof OpenOrder; labelKey: string }[] = [
        { key: 'warehouseId', labelKey: 'columns.openOrder.warehouseId' },
        { key: 'productId', labelKey: 'columns.openOrder.productId' },
        { key: 'fullProductId', labelKey: 'columns.openOrder.fullProductId' },
        { key: 'name', labelKey: 'columns.openOrder.name' },
        { key: 'orderUnit', labelKey: 'columns.openOrder.orderUnit' },
        { key: 'orderQtyUom', labelKey: 'columns.openOrder.orderQtyUom' },
        { key: 'caseSize', labelKey: 'columns.openOrder.caseSize' },
        { key: 'orderQtyPcs', labelKey: 'columns.openOrder.orderQtyPcs' },
        { key: 'poNr', labelKey: 'columns.openOrder.poNr' },
        { key: 'supplierId', labelKey: 'columns.openOrder.supplierId' },
        { key: 'supplierName', labelKey: 'columns.openOrder.supplierName' },
        { key: 'deliveryDate', labelKey: 'columns.openOrder.deliveryDate' },
        { key: 'creationDate', labelKey: 'columns.openOrder.creationDate' },
        { key: 'deliveryLeadTime', labelKey: 'columns.openOrder.deliveryLeadTime' },
    ];

    const SALES_COLUMNS: { key: keyof Sale, labelKey: string }[] = [
        { key: 'resaleDate', labelKey: 'columns.sale.resaleDate' },
        { key: 'warehouseId', labelKey: 'columns.sale.warehouseId' },
        { key: 'productId', labelKey: 'columns.sale.productId' },
        { key: 'productName', labelKey: 'columns.sale.productName' },
        { key: 'quantity', labelKey: 'columns.sale.quantity' },
    ];
    
    const SHC_COLUMNS: { key: string, labelKey: string }[] = [
        { key: 'storeNumber', labelKey: 'columns.shc.storeNumber' },
        { key: 'itemNumber', labelKey: 'columns.shc.itemNumber' },
        { key: 'itemDescription', labelKey: 'columns.shc.itemDescription' },
        { key: 'piecesInBox', labelKey: 'columns.shc.piecesInBox' },
        { key: 'itemStatus', labelKey: 'columns.shc.itemStatus' },
        { key: 'itemGroup', labelKey: 'columns.shc.itemGroup' },
        { key: 'shelfCapacity', labelKey: 'columns.shc.shelfCapacity' },
        { key: 'shelfCapacityUnit', labelKey: 'columns.shc.shelfCapacityUnit' },
    ];

    const PLANOGRAM_COLUMNS: { key: string, labelKey: string }[] = [
        { key: 'generalStoreArea', labelKey: 'columns.planogram.generalStoreArea' },
        { key: 'settingSpecificallyFor', labelKey: 'columns.planogram.settingSpecificallyFor' },
        { key: 'settingWidth', labelKey: 'columns.planogram.settingWidth' },
        { key: 'itemNumber', labelKey: 'columns.planogram.itemNumber' },
        { key: 'itemName', labelKey: 'columns.planogram.itemName' },
        { key: 'targetShc', labelKey: 'columns.planogram.targetShc' },
        { key: 'facings', labelKey: 'columns.planogram.facings' },
        { key: 'depth', labelKey: 'columns.planogram.depth' },
    ];

    const ORG_STRUCTURE_COLUMNS: { key: string, labelKey: string }[] = [
        { key: 'storeNumber', labelKey: 'columns.orgStructure.storeNumber' },
        { key: 'storeName', labelKey: 'columns.orgStructure.storeName' },
        { key: 'warehouseId', labelKey: 'columns.orgStructure.warehouseId' },
        { key: 'areaManager', labelKey: 'columns.orgStructure.areaManager' },
        { key: 'headOfSales', labelKey: 'columns.orgStructure.headOfSales' },
    ];

    const CATEGORY_RELATION_COLUMNS: { key: string, labelKey: string }[] = [
        { key: 'storeNumber', labelKey: 'columns.categoryRelation.storeNumber' },
        { key: 'generalStoreArea', labelKey: 'columns.categoryRelation.generalStoreArea' },
        { key: 'settingSpecificallyFor', labelKey: 'columns.categoryRelation.settingSpecificallyFor' },
        { key: 'settingWidth', labelKey: 'columns.categoryRelation.settingWidth' },
    ];
    
    const WRITE_OFFS_COLUMNS: { key: keyof WriteOffsActual, labelKey: string }[] = [
        { key: 'metricName', labelKey: 'columns.writeOffsActual.metricName' },
        { key: 'period', labelKey: 'columns.writeOffsActual.period' },
        { key: 'storeNumber', labelKey: 'columns.writeOffsActual.storeNumber' },
        { key: 'storeName', labelKey: 'columns.writeOffsActual.storeName' },
        { key: 'itemGroupNumber', labelKey: 'columns.writeOffsActual.itemGroupNumber' },
        { key: 'itemGroupName', labelKey: 'columns.writeOffsActual.itemGroupName' },
        { key: 'value', labelKey: 'columns.writeOffsActual.value' },
    ];
    
    const WRITE_OFFS_TARGETS_COLUMNS: { key: keyof WriteOffsTarget, labelKey: string }[] = [
        { key: 'storeNumber', labelKey: 'columns.writeOffsTargets.storeNumber' },
        { key: 'itemGroupNumber', labelKey: 'columns.writeOffsTargets.itemGroupNumber' },
        { key: 'monthlyTarget', labelKey: 'columns.writeOffsTargets.monthlyTarget' },
        { key: 'yearlyTarget', labelKey: 'columns.writeOffsTargets.yearlyTarget' },
    ];


  useEffect(() => {
    if (userSession?.mode === 'rdc' && userSession.rdc?.id) {
      const rdcId = userSession.rdc.id;
      setProductFilters(prev => ({ ...prev, warehouseId: rdcId }));
      setAppliedProductFilters(prev => ({ ...prev, warehouseId: rdcId }));
      setGoodsReceiptsFilters(prev => ({ ...prev, warehouseId: rdcId }));
      setAppliedGoodsReceiptsFilters(prev => ({ ...prev, warehouseId: rdcId }));
      setOpenOrderFilters(prev => ({ ...prev, warehouseId: rdcId }));
      setAppliedOpenOrderFilters(prev => ({ ...prev, warehouseId: rdcId }));
      setSalesFilters(prev => ({ ...prev, warehouseId: rdcId }));
      setAppliedSalesFilters(prev => ({ ...prev, warehouseId: rdcId }));
    }
  }, [userSession]);

  const fetchDropdownData = useCallback(async () => {
    const [statuses, pWarehouses, grWarehouses, ooWarehouses, sWarehouses] = await Promise.all([
      getUniqueProductStatuses(),
      getUniqueWarehouseIds(),
      getUniqueWarehouseIdsForGoodsReceipts(),
      getUniqueWarehouseIdsForOpenOrders(),
      getUniqueWarehouseIdsForSales(),
    ]);
    setProductStatuses(statuses);
    setProductWarehouseIds(pWarehouses);
    setGoodsReceiptsWarehouseIds(grWarehouses);
    setOpenOrdersWarehouseIds(ooWarehouses);
    setSalesWarehouseIds(sWarehouses);
  }, []);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    let result: { data: any[]; total: number; };

    switch(activeTab) {
        case 'products':
            result = await getProductsPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedProductFilters);
            setProducts(result.data);
            break;
        case 'goodsReceipts':
            result = await getGoodsReceiptsPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedGoodsReceiptsFilters);
            setGoodsReceipts(result.data);
            break;
        case 'openOrders':
            result = await getOpenOrdersPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedOpenOrderFilters);
            setOpenOrders(result.data);
            break;
        case 'sales':
            result = await getSalesPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedSalesFilters);
            setSales(result.data);
            break;
        case 'shc':
            result = await getShcDataPaginated(currentPage, PAGE_SIZE);
            setShcData(result.data);
            break;
        case 'planogram':
            result = await getPlanogramDataPaginated(currentPage, PAGE_SIZE);
            setPlanogramData(result.data);
            break;
        case 'orgStructure':
            result = await getOrgStructureDataPaginated(currentPage, PAGE_SIZE);
            setOrgStructureData(result.data);
            break;
        case 'categoryRelation':
            result = await getCategoryRelationDataPaginated(currentPage, PAGE_SIZE);
            setCategoryRelationData(result.data);
            break;
        case 'writeOffsWeekly':
            result = await getWriteOffsWeeklyPaginated(currentPage, PAGE_SIZE);
            setWriteOffsWeeklyData(result.data);
            break;
        case 'writeOffsYTD':
            result = await getWriteOffsYTDPaginated(currentPage, PAGE_SIZE);
            setWriteOffsYTDData(result.data);
            break;
        case 'writeOffsTargets':
            result = await getWriteOffsTargetsPaginated(currentPage, PAGE_SIZE);
            setWriteOffsTargetsData(result.data);
            break;
        default:
            result = { data: [], total: 0 };
    }
    setTotalItems(result.total);
    setIsLoading(false);
  }, [currentPage, activeTab, appliedProductFilters, appliedGoodsReceiptsFilters, appliedOpenOrderFilters, appliedSalesFilters]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);
  
  const handleTabChange = (tab: TabType) => {
      setCurrentPage(1);
      setActiveTab(tab);
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, appliedProductFilters, appliedGoodsReceiptsFilters, appliedOpenOrderFilters, appliedSalesFilters, activeTab, fetchData]);


  const handleFilterChange = (e: Event, type: 'products' | 'goodsReceipts' | 'openOrders' | 'sales') => {
    const { name, value } = e.target as HTMLInputElement | HTMLSelectElement;
    switch (type) {
        case 'products':
            setProductFilters(prev => ({ ...prev, [name]: value }));
            break;
        case 'goodsReceipts':
            setGoodsReceiptsFilters(prev => ({ ...prev, [name]: value }));
            break;
        case 'openOrders':
            setOpenOrderFilters(prev => ({ ...prev, [name]: value }));
            break;
        case 'sales':
            setSalesFilters(prev => ({ ...prev, [name]: value }));
            break;
    }
  };
  
  const handleProductIdChange = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      switch (activeTab) {
          case 'products':
              setProductFilters(prev => ({ ...prev, productId: value }));
              break;
          case 'goodsReceipts':
              setGoodsReceiptsFilters(prev => ({ ...prev, productId: value }));
              break;
          case 'openOrders':
              setOpenOrderFilters(prev => ({ ...prev, productId: value }));
              break;
          case 'sales':
              setSalesFilters(prev => ({ ...prev, productId: value }));
              break;
      }

      if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
      }

      if (value.trim().length < 2) {
          setProductIdSuggestions([]);
          setIsSuggestionsVisible(false);
          return;
      }

      debounceTimeoutRef.current = window.setTimeout(async () => {
          const suggestions = await findProductsByPartialId(value, 5, productFilters.warehouseId);
          setProductIdSuggestions(suggestions);
          setIsSuggestionsVisible(suggestions.length > 0);
      }, 300);
  };

  const handleSuggestionClick = (product: Product) => {
    switch(activeTab) {
        case 'products':
            setProductFilters(prev => ({ ...prev, productId: product.productId }));
            break;
        case 'goodsReceipts':
            setGoodsReceiptsFilters(prev => ({ ...prev, productId: product.productId }));
            break;
        case 'openOrders':
            setOpenOrderFilters(prev => ({ ...prev, productId: product.productId }));
            break;
        case 'sales':
            setSalesFilters(prev => ({ ...prev, productId: product.productId }));
            break;
    }
    setIsSuggestionsVisible(false);
  };


  const applyFilters = () => {
    setCurrentPage(1);
    if(activeTab === 'products') {
        setAppliedProductFilters(productFilters);
    } else if (activeTab === 'goodsReceipts'){
        setAppliedGoodsReceiptsFilters(goodsReceiptsFilters);
    } else if (activeTab === 'openOrders') {
        setAppliedOpenOrderFilters(openOrderFilters);
    } else if (activeTab === 'sales') {
        setAppliedSalesFilters(salesFilters);
    }
    setIsSuggestionsVisible(false);
  };
  
  const clearFilters = () => {
    setCurrentPage(1);
    const rdcFilter = userSession?.mode === 'rdc' && userSession.rdc ? { warehouseId: userSession.rdc.id } : { warehouseId: '' };

    if(activeTab === 'products') {
        setProductFilters({ ...rdcFilter, productId: '', status: '' });
        setAppliedProductFilters({ ...rdcFilter, productId: '', status: '' });
    } else if (activeTab === 'goodsReceipts') {
        setGoodsReceiptsFilters({ ...rdcFilter, productId: '' });
        setAppliedGoodsReceiptsFilters({ ...rdcFilter, productId: '' });
    } else if (activeTab === 'openOrders') {
        setOpenOrderFilters({ ...rdcFilter, productId: '' });
        setAppliedOpenOrderFilters({ ...rdcFilter, productId: '' });
    } else if (activeTab === 'sales') {
        setSalesFilters({ ...rdcFilter, productId: '' });
        setAppliedSalesFilters({ ...rdcFilter, productId: '' });
    }
    setIsSuggestionsVisible(false);
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        applyFilters();
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderSimpleTable = (data: any[], columns: {key: string, labelKey: string}[]) => (
    <>
      <div class={sharedStyles['table-container']}>
        {isLoading ? ( <div class={sharedStyles['spinner-overlay']}><div class={sharedStyles.spinner}></div></div> ) : (
          <table>
            <thead>
              <tr>{columns.map(col => <th key={col.key}>{t(col.labelKey)}</th>)}</tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  {columns.map(col => <td key={col.key}>{String((row as any)[col.key] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
       <div class={sharedStyles.pagination}>
        <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
        <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
        <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
      </div>
    </>
  );

  const renderTargetsTable = () => (
    <>
      <div class={sharedStyles['table-container']}>
        {isLoading ? ( <div class={sharedStyles['spinner-overlay']}><div class={sharedStyles.spinner}></div></div> ) : (
          <table>
            <thead>
              <tr>{WRITE_OFFS_TARGETS_COLUMNS.map(col => <th key={col.key}>{t(col.labelKey)}</th>)}</tr>
            </thead>
            <tbody>
              {writeOffsTargetsData.map(row => (
                <tr key={row.id}>
                  {WRITE_OFFS_TARGETS_COLUMNS.map(col => {
                    const value = row[col.key];
                    const formattedValue = (col.key === 'monthlyTarget' || col.key === 'yearlyTarget') && typeof value === 'number'
                        ? `${(value * 100).toFixed(2)}%`
                        : String(value ?? '');
                    return <td key={col.key}>{formattedValue}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
       <div class={sharedStyles.pagination}>
        <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
        <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
        <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
      </div>
    </>
  );
  
  const isRdcMode = userSession?.mode === 'rdc';

  return (
    <div class={styles['data-preview-container']} onBlur={() => setIsSuggestionsVisible(false)}>
      <div class={sharedStyles.tabs}>
        <button class={`${sharedStyles.tab} ${activeTab === 'products' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('products')}>{t('dataPreview.tabs.products')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'goodsReceipts' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('goodsReceipts')}>{t('dataPreview.tabs.goodsReceipts')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'openOrders' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('openOrders')}>{t('dataPreview.tabs.openOrders')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'sales' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('sales')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'shc' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('shc')}>{t('dataPreview.tabs.shc')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'planogram' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('planogram')}>{t('dataPreview.tabs.planogram')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'orgStructure' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('orgStructure')}>{t('dataPreview.tabs.orgStructure')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'categoryRelation' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('categoryRelation')}>{t('dataPreview.tabs.categoryRelation')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'writeOffsWeekly' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('writeOffsWeekly')}>{t('dataPreview.tabs.writeOffsWeekly')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'writeOffsYTD' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('writeOffsYTD')}>{t('dataPreview.tabs.writeOffsYTD')}</button>
        <button class={`${sharedStyles.tab} ${activeTab === 'writeOffsTargets' ? sharedStyles.active : ''}`} onClick={() => handleTabChange('writeOffsTargets')}>{t('dataPreview.tabs.writeOffsTargets')}</button>
      </div>

      {activeTab === 'products' && (
        <>
        <div class={sharedStyles['filter-bar']}>
          <div class={sharedStyles['filter-group']}>
            <label for="p-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="p-warehouseId" name="warehouseId" value={productFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'products')} onKeyDown={handleKeyDown} disabled={isRdcMode}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {productWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class={sharedStyles['filter-group']}>
            <label for="p-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="p-productId" name="productId" value={productFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
            {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class={sharedStyles['suggestions-list']}>
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class={sharedStyles['filter-group']}>
            <label for="p-status">{t('dataPreview.filters.status')}</label>
            <select id="p-status" name="status" value={productFilters.status} onChange={(e) => handleFilterChange(e, 'products')} onKeyDown={handleKeyDown}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {productStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div class={sharedStyles['filter-actions']}>
            <button onClick={applyFilters} class={sharedStyles['button-primary']}>{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class={sharedStyles['button-secondary']}>{t('dataPreview.filters.clear')}</button>
          </div>
        </div>

        <div class={sharedStyles['table-container']}>
          {isLoading ? ( <div class={sharedStyles['spinner-overlay']}><div class={sharedStyles.spinner}></div></div> ) : (
            <table>
              <thead>
                <tr>
                  {PRODUCT_COLUMNS.map(col => <th key={col.key}>{t(col.labelKey)}</th>)}
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={`${product.warehouseId}-${product.fullProductId}`}>
                    {PRODUCT_COLUMNS.map(col => (
                       <td key={col.key}>
                         {(() => {
                           const value = product[col.key];
                           if (Array.isArray(value)) {
                               return value.length > 0 ? `${value.length} ${t('dataPreview.table.deliveries')}` : t('dataPreview.table.none');
                           }
                           return String(value ?? '');
                         })()}
                       </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div class={sharedStyles.pagination}>
          <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
          <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
          <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
        </div>
        </>
      )}

      {activeTab === 'goodsReceipts' && (
         <>
         <div class={sharedStyles['filter-bar']}>
          <div class={sharedStyles['filter-group']}>
            <label for="gr-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="gr-warehouseId" name="warehouseId" value={goodsReceiptsFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'goodsReceipts')} onKeyDown={handleKeyDown} disabled={isRdcMode}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {goodsReceiptsWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class={sharedStyles['filter-group']}>
            <label for="gr-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="gr-productId" name="productId" value={goodsReceiptsFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
            {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class={sharedStyles['suggestions-list']}>
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class={sharedStyles['filter-actions']}>
            <button onClick={applyFilters} class={sharedStyles['button-primary']}>{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class={sharedStyles['button-secondary']}>{t('dataPreview.filters.clear')}</button>
          </div>
        </div>
         <div class={sharedStyles['table-container']}>
           {isLoading ? ( <div class={sharedStyles['spinner-overlay']}><div class={sharedStyles.spinner}></div></div> ) : (
             <table>
               <thead>
                 <tr>
                   {GOODS_RECEIPT_COLUMNS.map(col => <th key={col.key}>{t(col.labelKey)}</th>)}
                 </tr>
               </thead>
               <tbody>
                 {goodsReceipts.map(receipt => (
                   <tr key={`${receipt.warehouseId}-${receipt.fullProductId}-${receipt.deliveryNote}`}>
                     {GOODS_RECEIPT_COLUMNS.map(col => (
                        <td key={col.key}>
                          {String(receipt[col.key] ?? '')}
                        </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </div>
 
         <div class={sharedStyles.pagination}>
           <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
           <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
         </div>
         </>
      )}

      {activeTab === 'openOrders' && (
         <>
         <div class={sharedStyles['filter-bar']}>
          <div class={sharedStyles['filter-group']}>
            <label for="oo-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="oo-warehouseId" name="warehouseId" value={openOrderFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'openOrders')} onKeyDown={handleKeyDown} disabled={isRdcMode}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {openOrdersWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class={sharedStyles['filter-group']}>
            <label for="oo-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="oo-productId" name="productId" value={openOrderFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
             {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class={sharedStyles['suggestions-list']}>
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class={sharedStyles['filter-actions']}>
            <button onClick={applyFilters} class={sharedStyles['button-primary']}>{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class={sharedStyles['button-secondary']}>{t('dataPreview.filters.clear')}</button>
          </div>
        </div>
         <div class={sharedStyles['table-container']}>
           {isLoading ? ( <div class={sharedStyles['spinner-overlay']}><div class={sharedStyles.spinner}></div></div> ) : (
             <table>
               <thead>
                 <tr>
                   {OPEN_ORDER_COLUMNS.map(col => <th key={col.key}>{t(col.labelKey)}</th>)}
                 </tr>
               </thead>
               <tbody>
                 {openOrders.map(order => (
                   <tr key={`${order.warehouseId}-${order.fullProductId}-${order.poNr}`}>
                     {OPEN_ORDER_COLUMNS.map(col => (
                        <td key={col.key}>
                          {String(order[col.key] ?? '')}
                        </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </div>
 
         <div class={sharedStyles.pagination}>
           <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
           <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
         </div>
         </>
      )}

      {activeTab === 'sales' && (
         <>
         <div class={sharedStyles['filter-bar']}>
          <div class={sharedStyles['filter-group']}>
            <label for="s-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="s-warehouseId" name="warehouseId" value={salesFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'sales')} onKeyDown={handleKeyDown} disabled={isRdcMode}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {salesWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class={sharedStyles['filter-group']}>
            <label for="s-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="s-productId" name="productId" value={salesFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
             {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class={sharedStyles['suggestions-list']}>
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class={sharedStyles['filter-actions']}>
            <button onClick={applyFilters} class={sharedStyles['button-primary']}>{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class={sharedStyles['button-secondary']}>{t('dataPreview.filters.clear')}</button>
          </div>
        </div>
         <div class={sharedStyles['table-container']}>
           {isLoading ? ( <div class={sharedStyles['spinner-overlay']}><div class={sharedStyles.spinner}></div></div> ) : (
             <table>
               <thead>
                 <tr>
                   {SALES_COLUMNS.map(col => <th key={col.key}>{t(col.labelKey)}</th>)}
                 </tr>
               </thead>
               <tbody>
                 {sales.map(sale => (
                   <tr key={`${sale.resaleDate}-${sale.warehouseId}-${sale.productId}`}>
                     {SALES_COLUMNS.map(col => (
                        <td key={col.key}>
                          {String(sale[col.key] ?? '')}
                        </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </div>
 
         <div class={sharedStyles.pagination}>
           <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
           <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
         </div>
         </>
      )}

      {activeTab === 'shc' && renderSimpleTable(shcData, SHC_COLUMNS)}
      {activeTab === 'planogram' && renderSimpleTable(planogramData, PLANOGRAM_COLUMNS)}
      {activeTab === 'orgStructure' && renderSimpleTable(orgStructureData, ORG_STRUCTURE_COLUMNS)}
      {activeTab === 'categoryRelation' && renderSimpleTable(categoryRelationData, CATEGORY_RELATION_COLUMNS)}
      {activeTab === 'writeOffsWeekly' && renderSimpleTable(writeOffsWeeklyData, WRITE_OFFS_COLUMNS)}
      {activeTab === 'writeOffsYTD' && renderSimpleTable(writeOffsYTDData, WRITE_OFFS_COLUMNS)}
      {activeTab === 'writeOffsTargets' && renderTargetsTable()}

    </div>
  );
};

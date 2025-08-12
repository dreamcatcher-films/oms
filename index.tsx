import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import {
  clearAllData,
  checkDBStatus,
  addProducts,
  addGoodsReceipts,
  addOpenOrders,
  addSales,
  clearProducts,
  clearGoodsReceipts,
  clearOpenOrders,
  clearSales,
  Product,
  GoodsReceipt,
  OpenOrder,
  Sale,
  getProductsPaginatedAndFiltered,
  getGoodsReceiptsPaginatedAndFiltered,
  getOpenOrdersPaginatedAndFiltered,
  getSalesPaginatedAndFiltered,
  getUniqueProductStatuses,
  getUniqueWarehouseIds,
  getUniqueWarehouseIdsForGoodsReceipts,
  getUniqueWarehouseIdsForOpenOrders,
  getUniqueWarehouseIdsForSales,
  findProductsByPartialId,
  getImportMetadata,
  updateImportMetadata,
  ImportMetadata,
} from "./db";
import { LanguageProvider, useTranslation } from './i18n';
import Papa from "papaparse";

const BATCH_SIZE = 5000;
const PAGE_SIZE = 20;

type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
  progress?: number;
};

type View = 'import' | 'report' | 'dashboard' | 'simulations' | 'data-preview';
type DataType = 'products' | 'goodsReceipts' | 'openOrders' | 'sales';


const isDateToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear();
};

const LanguageSelector = () => {
    const { language, setLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'pl', name: 'Polski', flag: '🇵🇱' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    ];

    const selectedLanguage = languages.find(lang => lang.code === language);

    return (
        <div class="language-selector" onBlur={() => setIsOpen(false)} tabIndex={0}>
            <button class="selector-button" onClick={() => setIsOpen(!isOpen)}>
                {selectedLanguage?.flag}
                <span class="arrow">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
                <ul class="selector-dropdown">
                    {languages.map(lang => (
                        <li key={lang.code} onMouseDown={() => { setLanguage(lang.code); setIsOpen(false); }}>
                            {lang.flag} {lang.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const ImportView = ({
    isLoading,
    importMetadata,
    counts,
    onFileSelect,
    onClear,
}: {
    isLoading: boolean;
    importMetadata: ImportMetadata;
    counts: { products: number; goodsReceipts: number; openOrders: number; sales: number };
    onFileSelect: (type: DataType, event: Event) => void;
    onClear: (type: DataType) => void;
}) => {
    const { t, language } = useTranslation();
    
    const formatStatusDate = (date: Date): string => {
        if (isDateToday(date)) {
            return `${t('import.status.todayAt')} ${date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString(language, { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const dataTypes: {
        key: DataType;
        titleKey: string;
        descriptionKey: string;
        accept: string;
    }[] = [
        {
            key: 'products',
            titleKey: 'import.products.title',
            descriptionKey: 'import.products.description',
            accept: '.csv',
        },
        {
            key: 'goodsReceipts',
            titleKey: 'import.goodsReceipts.title',
            descriptionKey: 'import.goodsReceipts.description',
            accept: '.csv',
        },
        {
            key: 'openOrders',
            titleKey: 'import.openOrders.title',
            descriptionKey: 'import.openOrders.description',
            accept: '.csv',
        },
        {
            key: 'sales',
            titleKey: 'import.sales.title',
            descriptionKey: 'import.sales.description',
            accept: '.csv,.txt',
        },
    ];

    return (
        <div class="import-container">
            {dataTypes.map(({ key, titleKey, descriptionKey, accept }) => {
                const meta = importMetadata[key];
                const count = counts[key];
                const isUpdatedToday = meta && meta.lastImported ? isDateToday(meta.lastImported) : false;
                const statusIcon = count > 0 && isUpdatedToday ? '✓' : '✗';
                const statusClass = count > 0 && isUpdatedToday ? 'success' : 'error';
                let statusText = t('import.status.noData');
                if (meta && meta.lastImported) {
                    statusText = `${t('import.status.updated')} ${formatStatusDate(meta.lastImported)}`;
                }

                return (
                    <div class="import-section" key={key}>
                        <div class="import-section-header">
                            <h2>{t(titleKey)}</h2>
                            <div class={`import-status-details`}>
                                <span class={`status-icon ${statusClass}`}>{statusIcon}</span>
                                <div>
                                    <p class="status-main-text">{statusText}</p>
                                    <p class="status-sub-text">{count.toLocaleString(language)} {t('import.status.records')}</p>
                                </div>
                            </div>
                        </div>
                        <div class="import-section-description">
                            <p>{t(descriptionKey)}</p>
                        </div>
                        <div class="import-section-actions">
                            <label htmlFor={`${key}-file-input`} class={`file-label ${isLoading ? 'disabled' : ''}`}>
                                {t('import.buttons.selectFile')}
                            </label>
                            <input id={`${key}-file-input`} type="file" accept={accept} onChange={(e) => onFileSelect(key, e)} disabled={isLoading} />
                            {count > 0 && <button onClick={() => onClear(key)} class="button-clear" disabled={isLoading}>{t('import.buttons.clear')}</button>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const DataPreview = () => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'products' | 'goodsReceipts' | 'openOrders' | 'sales'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
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
        { key: 'quantity', labelKey: 'columns.sale.quantity' },
    ];


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
  
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const { data, total } = await getProductsPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedProductFilters);
    setProducts(data);
    setTotalItems(total);
    setIsLoading(false);
  }, [currentPage, appliedProductFilters]);
  
  const fetchGoodsReceipts = useCallback(async () => {
    setIsLoading(true);
    const { data, total } = await getGoodsReceiptsPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedGoodsReceiptsFilters);
    setGoodsReceipts(data);
    setTotalItems(total);
    setIsLoading(false);
  }, [currentPage, appliedGoodsReceiptsFilters]);
  
  const fetchOpenOrders = useCallback(async () => {
    setIsLoading(true);
    const { data, total } = await getOpenOrdersPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedOpenOrderFilters);
    setOpenOrders(data);
    setTotalItems(total);
    setIsLoading(false);
  }, [currentPage, appliedOpenOrderFilters]);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    const { data, total } = await getSalesPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedSalesFilters);
    setSales(data);
    setTotalItems(total);
    setIsLoading(false);
  }, [currentPage, appliedSalesFilters]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);
  
  const handleTabChange = (tab: 'products' | 'goodsReceipts' | 'openOrders' | 'sales') => {
      setCurrentPage(1);
      setActiveTab(tab);
  };

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'goodsReceipts') {
      fetchGoodsReceipts();
    } else if (activeTab === 'openOrders') {
      fetchOpenOrders();
    } else if (activeTab === 'sales') {
        fetchSales();
    }
  }, [currentPage, appliedProductFilters, appliedGoodsReceiptsFilters, appliedOpenOrderFilters, appliedSalesFilters, activeTab, fetchProducts, fetchGoodsReceipts, fetchOpenOrders, fetchSales]);


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
          const suggestions = await findProductsByPartialId(value, 5);
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
    if(activeTab === 'products') {
        setProductFilters({ warehouseId: '', productId: '', status: '' });
        setAppliedProductFilters({ warehouseId: '', productId: '', status: '' });
    } else if (activeTab === 'goodsReceipts') {
        setGoodsReceiptsFilters({ warehouseId: '', productId: '' });
        setAppliedGoodsReceiptsFilters({ warehouseId: '', productId: '' });
    } else if (activeTab === 'openOrders') {
        setOpenOrderFilters({ warehouseId: '', productId: '' });
        setAppliedOpenOrderFilters({ warehouseId: '', productId: '' });
    } else if (activeTab === 'sales') {
        setSalesFilters({ warehouseId: '', productId: '' });
        setAppliedSalesFilters({ warehouseId: '', productId: '' });
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
  
  return (
    <div class="data-preview-container" onBlur={() => setIsSuggestionsVisible(false)}>
      <div class="tabs">
        <button class={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => handleTabChange('products')}>{t('dataPreview.tabs.products')}</button>
        <button class={`tab ${activeTab === 'goodsReceipts' ? 'active' : ''}`} onClick={() => handleTabChange('goodsReceipts')}>{t('dataPreview.tabs.goodsReceipts')}</button>
        <button class={`tab ${activeTab === 'openOrders' ? 'active' : ''}`} onClick={() => handleTabChange('openOrders')}>{t('dataPreview.tabs.openOrders')}</button>
        <button class={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => handleTabChange('sales')}>{t('dataPreview.tabs.sales')}</button>
      </div>

      {activeTab === 'products' && (
        <>
        <div class="filter-bar">
          <div class="filter-group">
            <label for="p-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="p-warehouseId" name="warehouseId" value={productFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'products')} onKeyDown={handleKeyDown}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {productWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="p-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="p-productId" name="productId" value={productFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
            {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class="suggestions-list">
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="filter-group">
            <label for="p-status">{t('dataPreview.filters.status')}</label>
            <select id="p-status" name="status" value={productFilters.status} onChange={(e) => handleFilterChange(e, 'products')} onKeyDown={handleKeyDown}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {productStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div class="filter-actions">
            <button onClick={applyFilters} class="button-primary">{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class="button-secondary">{t('dataPreview.filters.clear')}</button>
          </div>
        </div>

        <div class="table-container">
          {isLoading ? ( <div class="spinner-overlay"><div class="spinner"></div></div> ) : (
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

        <div class="pagination">
          <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
          <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
          <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
        </div>
        </>
      )}

      {activeTab === 'goodsReceipts' && (
         <>
         <div class="filter-bar">
          <div class="filter-group">
            <label for="gr-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="gr-warehouseId" name="warehouseId" value={goodsReceiptsFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'goodsReceipts')} onKeyDown={handleKeyDown}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {goodsReceiptsWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="gr-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="gr-productId" name="productId" value={goodsReceiptsFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
            {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class="suggestions-list">
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="filter-actions">
            <button onClick={applyFilters} class="button-primary">{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class="button-secondary">{t('dataPreview.filters.clear')}</button>
          </div>
        </div>
         <div class="table-container">
           {isLoading ? ( <div class="spinner-overlay"><div class="spinner"></div></div> ) : (
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
 
         <div class="pagination">
           <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
           <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
         </div>
         </>
      )}

      {activeTab === 'openOrders' && (
         <>
         <div class="filter-bar">
          <div class="filter-group">
            <label for="oo-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="oo-warehouseId" name="warehouseId" value={openOrderFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'openOrders')} onKeyDown={handleKeyDown}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {openOrdersWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="oo-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="oo-productId" name="productId" value={openOrderFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
             {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class="suggestions-list">
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="filter-actions">
            <button onClick={applyFilters} class="button-primary">{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class="button-secondary">{t('dataPreview.filters.clear')}</button>
          </div>
        </div>
         <div class="table-container">
           {isLoading ? ( <div class="spinner-overlay"><div class="spinner"></div></div> ) : (
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
 
         <div class="pagination">
           <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
           <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
         </div>
         </>
      )}

      {activeTab === 'sales' && (
         <>
         <div class="filter-bar">
          <div class="filter-group">
            <label for="s-warehouseId">{t('dataPreview.filters.warehouse')}</label>
            <select id="s-warehouseId" name="warehouseId" value={salesFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'sales')} onKeyDown={handleKeyDown}>
              <option value="">{t('dataPreview.filters.all')}</option>
              {salesWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="s-productId">{t('dataPreview.filters.productId')}</label>
            <input type="text" id="s-productId" name="productId" value={salesFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder={t('dataPreview.filters.productIdPlaceholder')} autocomplete="off"/>
             {isSuggestionsVisible && productIdSuggestions.length > 0 && (
              <ul class="suggestions-list">
                {productIdSuggestions.map(p => (
                  <li key={`${p.warehouseId}-${p.fullProductId}`} onMouseDown={() => handleSuggestionClick(p)}>
                    <strong>{p.productId}</strong> - {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="filter-actions">
            <button onClick={applyFilters} class="button-primary">{t('dataPreview.filters.apply')}</button>
            <button onClick={clearFilters} class="button-secondary">{t('dataPreview.filters.clear')}</button>
          </div>
        </div>
         <div class="table-container">
           {isLoading ? ( <div class="spinner-overlay"><div class="spinner"></div></div> ) : (
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
 
         <div class="pagination">
           <span>{totalItems.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>{t('dataPreview.pagination.previous')}</button>
           <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>{t('dataPreview.pagination.next')}</button>
         </div>
         </>
      )}

    </div>
  );
};


const App = () => {
  const { t, language } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<Status>({ text: 'Inicjalizacja aplikacji...', type: 'info' });
  
  const [counts, setCounts] = useState({ products: 0, goodsReceipts: 0, openOrders: 0, sales: 0 });
  const [importMetadata, setImportMetadata] = useState<ImportMetadata>({ products: null, goodsReceipts: null, openOrders: null, sales: null });
  
  const [currentView, setCurrentView] = useState<View>('import');

  const performInitialCheck = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage({ text: t('status.checkingDb'), type: 'info' });
    try {
      const [{ productsCount, goodsReceiptsCount, openOrdersCount, salesCount }, metadata] = await Promise.all([
          checkDBStatus(),
          getImportMetadata()
      ]);
      setCounts({ products: productsCount, goodsReceipts: goodsReceiptsCount, openOrders: openOrdersCount, sales: salesCount });
      setImportMetadata(metadata);

      if (productsCount > 0 || goodsReceiptsCount > 0 || openOrdersCount > 0 || salesCount > 0) {
        setStatusMessage({ text: t('status.dbOk'), type: 'success' });
      } else {
        setStatusMessage({ text: 'status.dbEmpty', type: 'info' });
      }
    } catch (error) {
      console.error("Failed to check DB status", error);
      setStatusMessage({ text: t('status.dbError'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    performInitialCheck();
  }, [performInitialCheck]);
  
  const parseDateToObj = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      return new Date(year, month - 1, day);
  };
  
  const parseDateToSortableFormat = (dateStr: string | undefined): string => {
    if (!dateStr) return '00000000';
    const parts = dateStr.match(/(\d+)/g);
    if (!parts || parts.length < 3) return '00000000';
    let [day, month, year] = parts;
    if (day.length === 4) { // Handle YYYY/DD/MM
        [year, day, month] = parts;
    } else if (month.length === 4) { // Handle MM/YYYY/DD
        [month, year, day] = parts;
    } // Assume DD/MM/YYYY otherwise
    
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear.padStart(4, '0')}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  };

  const productRowMapper = (row: { [key: string]: string }): Product => {
      const parseNum = (val: string | undefined) => {
          if (val === undefined) return 0;
          const num = parseFloat(val);
          return isNaN(num) ? 0 : num;
      };

      const estimatedReceivings: { date: string, quantity: number }[] = [];
      const dateRegex = /^\d{1,2}\.\d{1,2}\.\d{2,4}$/;
      for (const key in row) {
          if (dateRegex.test(key.trim())) {
              const quantity = parseNum(row[key]);
              if (quantity > 0) {
                  estimatedReceivings.push({ date: key.trim(), quantity });
              }
          }
      }
      
      const rawProductId = row['ITEM NR SHORT']?.trim() ?? '';
      let processedProductId = rawProductId;
      if (/^\d+$/.test(rawProductId)) {
          processedProductId = String(parseInt(rawProductId, 10));
      }

      return {
          warehouseId: row['WH NR']?.trim() ?? '',
          productId: processedProductId,
          fullProductId: row['ITEM NR FULL']?.trim() ?? '',
          name: row['ITEM DESC']?.trim() ?? '',
          caseSize: parseNum(row['CASE SIZE']),
          shelfLifeAtReceiving: parseNum(row['W-DATE DAYS']),
          shelfLifeAtStore: parseNum(row['S-DATE DAYS']),
          customerShelfLife: parseNum(row['C-DATE DAYS']),
          price: parseNum(row['RETAIL PRICE']),
          status: row['ITEM STATUS']?.trim() ?? '',
          promoDate: row['ADV DATE']?.trim() ?? '',
          supplierId: row['SUPPLIER NR']?.trim() ?? '',
          supplierName: row['SUPPLIER NAME']?.trim() ?? '',
          stockOnHand: parseNum(row['STOCK ON HAND']),
          storeAllocationToday: parseNum(row['STORE ALLOC C']),
          storeAllocationTotal: parseNum(row['STORE ALLOC C <']),
          estimatedReceivings: estimatedReceivings,
          dispoGroup: row['DISPO GROUP']?.trim() ?? '',
          itemGroup: row['ITEM GROUP']?.trim() ?? '',
          orderArea: row['ORDER AREA']?.trim() ?? '',
          cartonsPerLayer: parseNum(row['LAYER FACTOR']),
          duessFactor: parseNum(row['DUESS FACTOR']),
          cartonsPerPallet: parseNum(row['EURO FACTOR']),
          itemLocked: row['ITEM LOCKED']?.trim() ?? '',
          slotNr: row['SLOT NR']?.trim() ?? '',
          unprocessedDeliveryQty: parseNum(row['UNPROC DEL QTY']),
      };
  };
  
  const goodsReceiptRowMapper = (row: { [key: string]: string }): GoodsReceipt => {
    const parseNum = (val: string | undefined) => {
        if (val === undefined) return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };
    
    const fullProductId = row['ITEM NR']?.trim() ?? '';
    let productId = '';
    if (fullProductId && fullProductId.length > 4) {
        const productIdWithoutLast4 = fullProductId.slice(0, -4);
        if (/^\d+$/.test(productIdWithoutLast4)) {
            productId = String(parseInt(productIdWithoutLast4, 10));
        } else {
            productId = productIdWithoutLast4;
        }
    }
    
    const deliveryDate = row['DELIVERY DATE']?.trim() ?? '';
    const bestBeforeDate = row['BEST BEFORE DATE']?.trim() ?? '';

    return {
        warehouseId: row['WH NR']?.trim() ?? '',
        fullProductId: fullProductId,
        deliveryNote: row['DELIVERY NOTE']?.trim() ?? '',
        productId: productId,
        name: row['ITEM DESC']?.trim() ?? '',
        deliveryUnit: row['DELIVERY UNIT OF MEASURE (CASES)']?.trim() ?? '',
        deliveryQtyUom: parseNum(row['DELIVERY QTY (in UOM)']),
        caseSize: parseNum(row['CASE SIZE']),
        deliveryQtyPcs: parseNum(row['DELIVERY QTY (in PIECES)']),
        poNr: row['PO NR']?.trim() ?? '',
        deliveryDate,
        bestBeforeDate,
        bolNr: row['BOL NR']?.trim() ?? '',
        supplierId: row['SUPPLIER NR']?.trim() ?? '',
        supplierName: row['SUPPLIER DESC']?.trim() ?? '',
        intSupplierNr: row['INT SUPPLIER NR']?.trim() ?? '',
        intItemNr: row['INT ITEM NR']?.trim() ?? '',
        caseGtin: row['CASE GTIN']?.trim() ?? '',
        liaReference: row['LIA REFERENCE']?.trim() ?? '',
        deliveryDateSortable: parseDateToSortableFormat(deliveryDate),
        bestBeforeDateSortable: parseDateToSortableFormat(bestBeforeDate),
    };
  };

  const openOrderRowMapper = (row: { [key: string]: string }): OpenOrder => {
    const parseNum = (val: string | undefined) => {
        if (val === undefined) return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    const fullProductId = row['ITEM NR']?.trim() ?? '';
    let productId = '';
    if (fullProductId && fullProductId.length > 4) {
        const productIdWithoutLast4 = fullProductId.slice(0, -4);
        if (/^\d+$/.test(productIdWithoutLast4)) {
            productId = String(parseInt(productIdWithoutLast4, 10));
        } else {
            productId = productIdWithoutLast4;
        }
    }

    const deliveryDateStr = row['DELIVERY DATE']?.trim();
    const creationDateStr = row['CREATION DATE']?.trim();
    
    const deliveryDate = parseDateToObj(deliveryDateStr);
    const creationDate = parseDateToObj(creationDateStr);
    
    let deliveryLeadTime = -1;
    if (deliveryDate && creationDate) {
        const timeDiff = deliveryDate.getTime() - creationDate.getTime();
        deliveryLeadTime = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    return {
        warehouseId: row['WH NR']?.trim() ?? '',
        fullProductId,
        poNr: row['PO NR']?.trim() ?? '',
        productId: productId,
        name: row['ITEM DESC']?.trim() ?? '',
        orderUnit: row['ORDER UNIT OF MEASURE (CASES)']?.trim() ?? '',
        orderQtyUom: parseNum(row['ORDER QTY (in UOM)']),
        caseSize: parseNum(row['CASE SIZE']),
        orderQtyPcs: parseNum(row['ORDER QTY (in PIECES)']),
        supplierId: row['SUPPLIER NR']?.trim() ?? '',
        supplierName: row['SUPPLIER DESC']?.trim() ?? '',
        deliveryDate: deliveryDateStr ?? '',
        creationDate: creationDateStr ?? '',
        deliveryLeadTime,
        deliveryDateSortable: parseDateToSortableFormat(deliveryDateStr)
    };
  };
  
    const saleRowMapper = (row: string[]): Sale | null => {
        if (row.length < 6) return null;
        
        const resaleDate = row[0]?.trim() ?? '';
        const warehouseId = row[1]?.trim() ?? '';
        const productId = row[3]?.trim() ?? '';
        const quantityStr = row[5]?.trim()?.replace(/,/g, '') ?? '0';
        const quantity = parseFloat(quantityStr);

        if (!resaleDate || !warehouseId || !productId || isNaN(quantity)) {
            return null;
        }

        return {
            resaleDate,
            warehouseId,
            productId,
            quantity,
            resaleDateSortable: parseDateToSortableFormat(resaleDate),
        };
    };

  const handleComplexFileParse = (
    file: File,
    dataType: 'products' | 'goodsReceipts' | 'openOrders',
    dataTypeName: string,
    clearDbFn: () => Promise<void>,
    addDbFn: (batch: any[]) => Promise<void>,
    rowMapperFn: (row: { [key: string]: string }) => any
  ) => {
      setIsLoading(true);
      setStatusMessage({ text: t('status.import.preparing', { dataTypeName }), type: 'info', progress: 0 });

      (async () => {
        try {
          await clearDbFn();
          setCounts(prev => ({ ...prev, [dataType]: 0 }));
          setImportMetadata(prev => ({ ...prev, [dataType]: null }));
        } catch (error) {
          console.error(`Error clearing database for ${dataTypeName}.`, error);
          setStatusMessage({ text: t('status.import.clearError'), type: 'error' });
          setIsLoading(false);
          return;
        }

        setStatusMessage({ text: t('status.import.starting', { dataTypeName }), type: 'info', progress: 0 });
        
        let header1: string[] = [];
        let header2: string[] = [];
        let combinedHeader: string[] = [];
        let batch: any[] = [];
        let processedCount = 0;
        let rowIndex = 0;

        const processBatch = async () => {
          if (batch.length > 0) {
            await addDbFn(batch);
            processedCount += batch.length;
            setCounts(prev => ({ ...prev, [dataType]: (prev[dataType] || 0) + batch.length }));
            batch = [];
          }
        };

        Papa.parse(file, {
          header: false,
          worker: false,
          skipEmptyLines: true,
          chunk: (results, parser) => {
              parser.pause();
              (async () => {
                  for (let i = 0; i < results.data.length; i++) {
                      const row = results.data[i] as string[];
                      if (rowIndex === 0) {
                          header1 = row;
                      } else if (rowIndex === 1) {
                          header2 = row;
                          let lastH1 = '';
                          combinedHeader = header1.map((h1, j) => {
                              const currentH1 = (h1 || '').trim();
                              if (currentH1 !== '') { lastH1 = currentH1; }
                              const currentH2 = (header2[j] || '').trim();
                              return `${lastH1} ${currentH2}`.trim();
                          });
                      } else {
                          const rowObject: { [key: string]: string } = {};
                          combinedHeader.forEach((header, k) => {
                              rowObject[header] = row[k];
                          });
                          const mappedRow = rowMapperFn(rowObject);
                          batch.push(mappedRow);
                          if (batch.length >= BATCH_SIZE) {
                              await processBatch();
                          }
                      }
                      rowIndex++;
                  }
                  const progress = file ? (results.meta.cursor / file.size) * 100 : 0;
                  setStatusMessage({
                    text: t('status.import.processing', { processedCount: processedCount.toLocaleString(language) }),
                    type: 'info',
                    progress: progress,
                  });
                  parser.resume();
              })();
          },
          complete: async () => {
            await processBatch();
            await updateImportMetadata(dataType);
            setImportMetadata(prev => ({...prev, [dataType]: { dataType, lastImported: new Date() }}));
            setStatusMessage({ text: t('status.import.complete', { processedCount: processedCount.toLocaleString(language), dataTypeName }), type: 'success' });
            setIsLoading(false);
          },
          error: (error) => {
            console.error("PapaParse error:", error);
            setStatusMessage({ text: t('status.import.parseError', { dataTypeName }), type: 'error' });
            setIsLoading(false);
          }
        });
      })();
  };

  const handleSalesFileParse = (file: File) => {
      const dataTypeName = t('dataType.sales');
      setIsLoading(true);
      setStatusMessage({ text: t('status.import.preparing', { dataTypeName }), type: 'info', progress: 0 });

      (async () => {
          try {
              await clearSales();
              setCounts(prev => ({ ...prev, sales: 0 }));
              setImportMetadata(prev => ({ ...prev, sales: null }));
          } catch (error) {
              console.error(`Error clearing database for ${dataTypeName}.`, error);
              setStatusMessage({ text: t('status.import.clearError'), type: 'error' });
              setIsLoading(false);
              return;
          }

          let batch: Sale[] = [];
          let processedCount = 0;
          let isFirstChunk = true;

          const processBatch = async () => {
              if (batch.length > 0) {
                  await addSales(batch);
                  processedCount += batch.length;
                  setCounts(prev => ({ ...prev, sales: (prev.sales || 0) + batch.length }));
                  batch = [];
              }
          };

          Papa.parse(file, {
              worker: false,
              skipEmptyLines: true,
              chunk: async (results, parser) => {
                  parser.pause();
                  
                  let rows = results.data as string[][];
                  if (isFirstChunk) {
                      rows.shift(); // Skip header row
                      isFirstChunk = false;
                  }

                  for (const row of rows) {
                      const mappedRow = saleRowMapper(row as string[]);
                      if (mappedRow) {
                          batch.push(mappedRow);
                      }
                      if (batch.length >= BATCH_SIZE) {
                          await processBatch();
                      }
                  }

                  const progress = file ? (results.meta.cursor / file.size) * 100 : 0;
                  setStatusMessage({
                      text: t('status.import.processing', { processedCount: processedCount.toLocaleString(language) }),
                      type: 'info',
                      progress: progress,
                  });

                  parser.resume();
              },
              complete: async () => {
                  await processBatch();
                  await updateImportMetadata('sales');
                  setImportMetadata(prev => ({ ...prev, sales: { dataType: 'sales', lastImported: new Date() } }));
                  setStatusMessage({ text: t('status.import.complete', { processedCount: processedCount.toLocaleString(language), dataTypeName }), type: 'success' });
                  setIsLoading(false);
              },
              error: (error) => {
                  console.error("PapaParse error:", error);
                  setStatusMessage({ text: t('status.import.parseError', { dataTypeName }), type: 'error' });
                  setIsLoading(false);
              }
          });
      })();
  };
  
  const handleFileSelect = (dataType: DataType, event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = ''; 
    
    switch (dataType) {
        case 'products':
            handleComplexFileParse(file, 'products', t('dataType.products'), clearProducts, addProducts, productRowMapper);
            break;
        case 'goodsReceipts':
            handleComplexFileParse(file, 'goodsReceipts', t('dataType.goodsReceipts'), clearGoodsReceipts, addGoodsReceipts, goodsReceiptRowMapper);
            break;
        case 'openOrders':
            handleComplexFileParse(file, 'openOrders', t('dataType.openOrders'), clearOpenOrders, addOpenOrders, openOrderRowMapper);
            break;
        case 'sales':
            handleSalesFileParse(file);
            break;
    }
  };
  
  const handleClearIndividualData = async (dataType: DataType) => {
    setIsLoading(true);
    const dataTypeName = t(`dataType.${dataType}`);
    let clearFn: () => Promise<void>;
    
    switch (dataType) {
        case 'products': clearFn = clearProducts; break;
        case 'goodsReceipts': clearFn = clearGoodsReceipts; break;
        case 'openOrders': clearFn = clearOpenOrders; break;
        case 'sales': clearFn = clearSales; break;
    }

    setStatusMessage({ text: t('status.clear.clearing', { dataTypeName }), type: 'info' });
    try {
        await clearFn();
        setCounts(prev => ({...prev, [dataType]: 0}));
        setImportMetadata(prev => ({...prev, [dataType]: null}));
        setStatusMessage({ text: t('status.clear.cleared', { dataTypeName }), type: 'success' });
    } catch(error) {
        console.error(`Error clearing data for ${dataTypeName}.`, error);
        setStatusMessage({ text: t('status.clear.clearError', { dataTypeName }), type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    setIsLoading(true);
    setStatusMessage({ text: t('status.clear.clearingAll'), type: 'info' });
    try {
      await clearAllData();
      setCounts({ products: 0, goodsReceipts: 0, openOrders: 0, sales: 0 });
      setImportMetadata({ products: null, goodsReceipts: null, openOrders: null, sales: null });
      setStatusMessage({ text: t('status.clear.clearedAll'), type: 'success' });
    } catch (error) {
      console.error("Failed to clear DB", error);
      setStatusMessage({ text: t('status.clear.clearAllError'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'import':
        return (
          <ImportView 
            isLoading={isLoading}
            importMetadata={importMetadata}
            counts={counts}
            onFileSelect={handleFileSelect}
            onClear={handleClearIndividualData}
          />
        );
      case 'data-preview':
        return <DataPreview />;
      case 'report':
        return (
          <div class="placeholder-view">
            <h2>{t('placeholders.report.title')}</h2>
            <p>{t('placeholders.report.description')}</p>
          </div>
        );
      case 'dashboard':
        return (
          <div class="placeholder-view">
            <h2>{t('placeholders.dashboard.title')}</h2>
            <p>{t('placeholders.dashboard.description')}</p>
          </div>
        );
      case 'simulations':
        return (
          <div class="placeholder-view">
            <h2>{t('placeholders.simulations.title')}</h2>
            <p>{t('placeholders.simulations.description')}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const hasAnyData = counts.products > 0 || counts.goodsReceipts > 0 || counts.openOrders > 0 || counts.sales > 0;
  const canAnalyze = counts.products > 0 && counts.goodsReceipts > 0;

  return (
    <>
      <header class="top-header">
        <h1>{t('header.title')}</h1>
        <LanguageSelector />
      </header>
      <div class="app-layout">
        <nav class="sidebar">
          <ul>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('import')}} class={currentView === 'import' ? 'active' : ''}>{t('sidebar.import')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('data-preview')}} class={currentView === 'data-preview' ? 'active' : ''}>{t('sidebar.dataPreview')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('report')}} class={currentView === 'report' ? 'active' : ''}>{t('sidebar.threatReport')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('dashboard')}} class={currentView === 'dashboard' ? 'active' : ''}>{t('sidebar.dashboard')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('simulations')}} class={currentView === 'simulations' ? 'active' : ''}>{t('sidebar.simulations')}</a></li>
          </ul>
        </nav>
        <main class="main-content">
          {statusMessage.text && (
              <div class={`status-container ${statusMessage.type}`} role="status">
                <div class="status-info">
                   {isLoading && statusMessage.type === 'info' && <div class="spinner"></div>}
                   <div class="status-content">
                      <p class="status-text">{statusMessage.text}</p>
                      {isLoading && typeof statusMessage.progress === 'number' && (
                        <div class="progress-bar-container">
                           <div class="progress-bar" style={{ width: `${statusMessage.progress}%` }}></div>
                        </div>
                      )}
                   </div>
                </div>
              </div>
          )}
          <div class="content-wrapper">
            {renderContent()}
          </div>
          <div class="actions-container">
            <button class="button-primary" disabled={!canAnalyze || isLoading}>
              {t('actions.runAnalysis')}
            </button>
            {hasAnyData && !isLoading && (
              <button onClick={handleClearAllData} class="button-secondary">{t('actions.clearAll')}</button>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

render(<LanguageProvider><App /></LanguageProvider>, document.getElementById("root")!);

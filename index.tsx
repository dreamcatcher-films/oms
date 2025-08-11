import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import {
  clearAllData,
  checkDBStatus,
  addProducts,
  addGoodsReceipts,
  addOpenOrders,
  clearProducts,
  clearGoodsReceipts,
  clearOpenOrders,
  Product,
  GoodsReceipt,
  OpenOrder,
  getProductsPaginatedAndFiltered,
  getGoodsReceiptsPaginatedAndFiltered,
  getOpenOrdersPaginatedAndFiltered,
  getUniqueProductStatuses,
  getUniqueWarehouseIds,
  getUniqueWarehouseIdsForGoodsReceipts,
  getUniqueWarehouseIdsForOpenOrders,
  findProductsByPartialId,
  getImportMetadata,
  updateImportMetadata,
  ImportMetadata,
} from "./db";
import Papa from "papaparse";

const BATCH_SIZE = 5000;
const PAGE_SIZE = 20;

const PRODUCT_COLUMNS: { key: keyof Product; label: string }[] = [
    { key: 'warehouseId', label: 'Magazyn' },
    { key: 'dispoGroup', label: 'Grupa Dispo' },
    { key: 'itemGroup', label: 'Grupa Tow.' },
    { key: 'orderArea', label: 'Obszar Zam.' },
    { key: 'productId', label: 'Nr art. krótki' },
    { key: 'fullProductId', label: 'Nr art. pełny' },
    { key: 'name', label: 'Nazwa' },
    { key: 'caseSize', label: 'Szt. w kart.' },
    { key: 'cartonsPerLayer', label: 'Kart. na war.' },
    { key: 'duessFactor', label: 'DD' },
    { key: 'cartonsPerPallet', label: 'Kart. na pal.' },
    { key: 'shelfLifeAtReceiving', label: 'W-DATE dni' },
    { key: 'shelfLifeAtStore', label: 'S-DATE dni' },
    { key: 'customerShelfLife', label: 'C-DATE dni' },
    { key: 'price', label: 'Cena' },
    { key: 'status', label: 'Status' },
    { key: 'itemLocked', label: 'Zablokowany' },
    { key: 'slotNr', label: 'Slot' },
    { key: 'unprocessedDeliveryQty', label: 'Nieroz. dost.' },
    { key: 'supplierId', label: 'ID Dostawcy' },
    { key: 'supplierName', label: 'Nazwa Dostawcy' },
    { key: 'stockOnHand', label: 'Stan mag.' },
    { key: 'storeAllocationToday', label: 'Alok. dzisiaj' },
    { key: 'storeAllocationTotal', label: 'Alok. łączna' },
    { key: 'promoDate', label: 'Data promo' },
    { key: 'estimatedReceivings', label: 'Szac. dostawy' },
];

const GOODS_RECEIPT_COLUMNS: { key: keyof GoodsReceipt; label: string }[] = [
    { key: 'warehouseId', label: 'Magazyn' },
    { key: 'productId', label: 'Nr art. krótki' },
    { key: 'fullProductId', label: 'Nr art. pełny' },
    { key: 'name', label: 'Nazwa' },
    { key: 'deliveryUnit', label: 'Jedn. dostawy' },
    { key: 'deliveryQtyUom', label: 'Ilość (J.m.)' },
    { key: 'caseSize', label: 'Szt. w kart.' },
    { key: 'deliveryQtyPcs', label: 'Ilość (szt.)' },
    { key: 'poNr', label: 'Nr zamówienia' },
    { key: 'deliveryDate', label: 'Data dostawy' },
    { key: 'bestBeforeDate', label: 'Data przydatności' },
    { key: 'supplierId', label: 'ID Dostawcy' },
    { key: 'supplierName', label: 'Nazwa Dostawcy' },
    { key: 'bolNr', label: 'BOL Nr' },
    { key: 'deliveryNote', label: 'Nota dostawy' },
    { key: 'intSupplierNr', label: 'Międz. ID Dostawcy' },
    { key: 'intItemNr', label: 'Międz. nr art.' },
    { key: 'caseGtin', label: 'GTIN kartonu' },
    { key: 'liaReference', label: 'LIA Ref' },
];

const OPEN_ORDER_COLUMNS: { key: keyof OpenOrder; label: string }[] = [
    { key: 'warehouseId', label: 'Magazyn' },
    { key: 'productId', label: 'Nr art. krótki' },
    { key: 'fullProductId', label: 'Nr art. pełny' },
    { key: 'name', label: 'Nazwa' },
    { key: 'orderUnit', label: 'Jedn. zamówienia' },
    { key: 'orderQtyUom', label: 'Ilość (J.m.)' },
    { key: 'caseSize', label: 'Szt. w kart.' },
    { key: 'orderQtyPcs', label: 'Ilość (szt.)' },
    { key: 'poNr', label: 'Nr zamówienia' },
    { key: 'supplierId', label: 'ID Dostawcy' },
    { key: 'supplierName', label: 'Nazwa Dostawcy' },
    { key: 'deliveryDate', label: 'Plan. data dostawy' },
    { key: 'creationDate', label: 'Data utworzenia' },
    { key: 'deliveryLeadTime', label: 'Czas realizacji (dni)' },
];


type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
  progress?: number;
};

type View = 'import' | 'report' | 'dashboard' | 'simulations' | 'data-preview';
type DataType = 'products' | 'goodsReceipts' | 'openOrders';


const isDateToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear();
};

const formatStatusDate = (date: Date): string => {
    if (isDateToday(date)) {
        return `dzisiaj o ${date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    counts: { products: number; goodsReceipts: number; openOrders: number };
    onFileSelect: (type: DataType, event: Event) => void;
    onClear: (type: DataType) => void;
}) => {
    const dataTypes: {
        key: DataType;
        title: string;
        description: string;
    }[] = [
        {
            key: 'products',
            title: '1. Dane Podstawowe Artykułów',
            description: 'Plik z informacjami o produktach. Wymaga dwóch wierszy nagłówka.',
        },
        {
            key: 'goodsReceipts',
            title: '2. Przyjęcie Towaru (eGIN)',
            description: 'Plik z informacjami o przyjęciach towaru. Wymaga dwóch wierszy nagłówka.',
        },
        {
            key: 'openOrders',
            title: '3. Otwarte Zamówienia',
            description: 'Plik z otwartymi zamówieniami, które nie dotarły jeszcze do magazynu.',
        },
    ];

    return (
        <div class="import-list-container">
            {dataTypes.map(({ key, title, description }) => {
                const meta = importMetadata[key];
                const count = counts[key];
                const isUpdatedToday = meta && meta.lastImported ? isDateToday(meta.lastImported) : false;
                const statusIcon = count > 0 && isUpdatedToday ? '✓' : '✗';
                const statusClass = count > 0 && isUpdatedToday ? 'success' : 'error';
                let statusText = 'Brak danych';
                if (meta && meta.lastImported) {
                    statusText = `Zaktualizowano ${formatStatusDate(meta.lastImported)}`;
                }

                return (
                    <div class="import-section" key={key}>
                        <div class="import-section-header">
                            <h2>{title}</h2>
                            <div class={`import-status-details`}>
                                <span class={`status-icon ${statusClass}`}>{statusIcon}</span>
                                <div>
                                    <p class="status-main-text">{statusText}</p>
                                    <p class="status-sub-text">{count.toLocaleString('pl-PL')} rekordów</p>
                                </div>
                            </div>
                        </div>
                        <div class="import-section-description">
                            <p>{description}</p>
                        </div>
                        <div class="import-section-actions">
                            <label htmlFor={`${key}-file-input`} class={`file-label ${isLoading ? 'disabled' : ''}`}>
                                Wybierz plik
                            </label>
                            <input id={`${key}-file-input`} type="file" accept=".csv" onChange={(e) => onFileSelect(key, e)} disabled={isLoading} />
                            {count > 0 && <button onClick={() => onClear(key)} class="button-clear" disabled={isLoading}>Wyczyść</button>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const DataPreview = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'goodsReceipts' | 'openOrders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [productFilters, setProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  const [appliedProductFilters, setAppliedProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  
  const [goodsReceiptsFilters, setGoodsReceiptsFilters] = useState({ warehouseId: '', productId: '' });
  const [appliedGoodsReceiptsFilters, setAppliedGoodsReceiptsFilters] = useState({ warehouseId: '', productId: '' });

  const [openOrderFilters, setOpenOrderFilters] = useState({ warehouseId: '', productId: '' });
  const [appliedOpenOrderFilters, setAppliedOpenOrderFilters] = useState({ warehouseId: '', productId: '' });

  const [productStatuses, setProductStatuses] = useState<string[]>([]);
  const [productWarehouseIds, setProductWarehouseIds] = useState<string[]>([]);
  const [goodsReceiptsWarehouseIds, setGoodsReceiptsWarehouseIds] = useState<string[]>([]);
  const [openOrdersWarehouseIds, setOpenOrdersWarehouseIds] = useState<string[]>([]);

  const [productIdSuggestions, setProductIdSuggestions] = useState<Product[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const fetchDropdownData = useCallback(async () => {
    const [statuses, pWarehouses, grWarehouses, ooWarehouses] = await Promise.all([
      getUniqueProductStatuses(),
      getUniqueWarehouseIds(),
      getUniqueWarehouseIdsForGoodsReceipts(),
      getUniqueWarehouseIdsForOpenOrders(),
    ]);
    setProductStatuses(statuses);
    setProductWarehouseIds(pWarehouses);
    setGoodsReceiptsWarehouseIds(grWarehouses);
    setOpenOrdersWarehouseIds(ooWarehouses);
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

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);
  
  const handleTabChange = (tab: 'products' | 'goodsReceipts' | 'openOrders') => {
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
    }
  }, [currentPage, appliedProductFilters, appliedGoodsReceiptsFilters, appliedOpenOrderFilters, activeTab, fetchProducts, fetchGoodsReceipts, fetchOpenOrders]);


  const handleFilterChange = (e: Event, type: 'products' | 'goodsReceipts' | 'openOrders') => {
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
    }
    setIsSuggestionsVisible(false);
  };


  const applyFilters = () => {
    setCurrentPage(1);
    if(activeTab === 'products') {
        setAppliedProductFilters(productFilters);
    } else if (activeTab === 'goodsReceipts'){
        setAppliedGoodsReceiptsFilters(goodsReceiptsFilters);
    } else {
        setAppliedOpenOrderFilters(openOrderFilters);
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
    } else {
        setOpenOrderFilters({ warehouseId: '', productId: '' });
        setAppliedOpenOrderFilters({ warehouseId: '', productId: '' });
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
        <button class={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => handleTabChange('products')}>Produkty</button>
        <button class={`tab ${activeTab === 'goodsReceipts' ? 'active' : ''}`} onClick={() => handleTabChange('goodsReceipts')}>Przyjęcie Towaru (eGIN)</button>
        <button class={`tab ${activeTab === 'openOrders' ? 'active' : ''}`} onClick={() => handleTabChange('openOrders')}>Otwarte Zamówienia</button>
      </div>

      {activeTab === 'products' && (
        <>
        <div class="filter-bar">
          <div class="filter-group">
            <label for="p-warehouseId">Magazyn</label>
            <select id="p-warehouseId" name="warehouseId" value={productFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'products')} onKeyDown={handleKeyDown}>
              <option value="">Wszystkie</option>
              {productWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="p-productId">Nr artykułu</label>
            <input type="text" id="p-productId" name="productId" value={productFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder="np. 40006" autocomplete="off"/>
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
            <label for="p-status">Status</label>
            <select id="p-status" name="status" value={productFilters.status} onChange={(e) => handleFilterChange(e, 'products')} onKeyDown={handleKeyDown}>
              <option value="">Wszystkie</option>
              {productStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div class="filter-actions">
            <button onClick={applyFilters} class="button-primary">Filtruj</button>
            <button onClick={clearFilters} class="button-secondary">Wyczyść</button>
          </div>
        </div>

        <div class="table-container">
          {isLoading ? ( <div class="spinner-overlay"><div class="spinner"></div></div> ) : (
            <table>
              <thead>
                <tr>
                  {PRODUCT_COLUMNS.map(col => <th key={col.key}>{col.label}</th>)}
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
                               return value.length > 0 ? `${value.length} dostaw` : 'Brak';
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
          <span>{totalItems.toLocaleString('pl-PL')} rekordów</span>
          <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>Poprzednia</button>
          <span>Strona {currentPage} z {totalPages}</span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>Następna</button>
        </div>
        </>
      )}

      {activeTab === 'goodsReceipts' && (
         <>
         <div class="filter-bar">
          <div class="filter-group">
            <label for="gr-warehouseId">Magazyn</label>
            <select id="gr-warehouseId" name="warehouseId" value={goodsReceiptsFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'goodsReceipts')} onKeyDown={handleKeyDown}>
              <option value="">Wszystkie</option>
              {goodsReceiptsWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="gr-productId">Nr artykułu</label>
            <input type="text" id="gr-productId" name="productId" value={goodsReceiptsFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder="np. 40006" autocomplete="off"/>
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
            <button onClick={applyFilters} class="button-primary">Filtruj</button>
            <button onClick={clearFilters} class="button-secondary">Wyczyść</button>
          </div>
        </div>
         <div class="table-container">
           {isLoading ? ( <div class="spinner-overlay"><div class="spinner"></div></div> ) : (
             <table>
               <thead>
                 <tr>
                   {GOODS_RECEIPT_COLUMNS.map(col => <th key={col.key}>{col.label}</th>)}
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
           <span>{totalItems.toLocaleString('pl-PL')} rekordów</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>Poprzednia</button>
           <span>Strona {currentPage} z {totalPages}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>Następna</button>
         </div>
         </>
      )}

      {activeTab === 'openOrders' && (
         <>
         <div class="filter-bar">
          <div class="filter-group">
            <label for="oo-warehouseId">Magazyn</label>
            <select id="oo-warehouseId" name="warehouseId" value={openOrderFilters.warehouseId} onChange={(e) => handleFilterChange(e, 'openOrders')} onKeyDown={handleKeyDown}>
              <option value="">Wszystkie</option>
              {openOrdersWarehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="oo-productId">Nr artykułu</label>
            <input type="text" id="oo-productId" name="productId" value={openOrderFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder="np. 40006" autocomplete="off"/>
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
            <button onClick={applyFilters} class="button-primary">Filtruj</button>
            <button onClick={clearFilters} class="button-secondary">Wyczyść</button>
          </div>
        </div>
         <div class="table-container">
           {isLoading ? ( <div class="spinner-overlay"><div class="spinner"></div></div> ) : (
             <table>
               <thead>
                 <tr>
                   {OPEN_ORDER_COLUMNS.map(col => <th key={col.key}>{col.label}</th>)}
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
           <span>{totalItems.toLocaleString('pl-PL')} rekordów</span>
           <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>Poprzednia</button>
           <span>Strona {currentPage} z {totalPages}</span>
           <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>Następna</button>
         </div>
         </>
      )}
    </div>
  );
};


const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<Status>({ text: 'Inicjalizacja aplikacji...', type: 'info' });
  
  const [counts, setCounts] = useState({ products: 0, goodsReceipts: 0, openOrders: 0 });
  const [importMetadata, setImportMetadata] = useState<ImportMetadata>({ products: null, goodsReceipts: null, openOrders: null });
  
  const [currentView, setCurrentView] = useState<View>('import');

  const performInitialCheck = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage({ text: 'Sprawdzanie lokalnej bazy danych...', type: 'info' });
    try {
      const [{ productsCount, goodsReceiptsCount, openOrdersCount }, metadata] = await Promise.all([
          checkDBStatus(),
          getImportMetadata()
      ]);
      setCounts({ products: productsCount, goodsReceipts: goodsReceiptsCount, openOrders: openOrdersCount });
      setImportMetadata(metadata);

      if (productsCount > 0 || goodsReceiptsCount > 0 || openOrdersCount > 0) {
        setStatusMessage({ text: 'Znaleziono dane. Możesz uruchomić analizę lub wgrać nowe pliki.', type: 'success' });
      } else {
        setStatusMessage({ text: 'Wybierz pliki z danymi, aby rozpocząć.', type: 'info' });
      }
    } catch (error) {
      console.error("Failed to check DB status", error);
      setStatusMessage({ text: 'Błąd podczas sprawdzania bazy danych.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const handleFileParse = (
    file: File,
    dataType: DataType,
    dataTypeName: string,
    clearDbFn: () => Promise<void>,
    addDbFn: (batch: any[]) => Promise<void>,
    rowMapperFn: (row: { [key: string]: string }) => any
  ) => {
      setIsLoading(true);
      setStatusMessage({ text: `Przygotowywanie do importu: ${dataTypeName}...`, type: 'info', progress: 0 });

      (async () => {
        try {
          await clearDbFn();
          setCounts(prev => ({ ...prev, [dataType]: 0 }));
          setImportMetadata(prev => ({ ...prev, [dataType]: null }));
        } catch (error) {
          console.error(`Błąd podczas czyszczenia bazy danych (${dataTypeName}).`, error);
          setStatusMessage({ text: 'Błąd podczas czyszczenia bazy danych.', type: 'error' });
          setIsLoading(false);
          return;
        }

        setStatusMessage({ text: `Rozpoczynanie importu pliku: ${dataTypeName}...`, type: 'info', progress: 0 });
        
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
            setCounts(prev => ({ ...prev, [dataType]: prev[dataType] + batch.length }));
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
                    text: `Przetwarzanie pliku... Zapisano ${processedCount.toLocaleString('pl-PL')} rekordów.`,
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
            setStatusMessage({ text: `Import zakończony. Zapisano ${processedCount.toLocaleString('pl-PL')} rekordów (${dataTypeName}).`, type: 'success' });
            setIsLoading(false);
          },
          error: (error) => {
            console.error("PapaParse error:", error);
            setStatusMessage({ text: `Błąd krytyczny podczas parsowania pliku: ${dataTypeName}.`, type: 'error' });
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
            handleFileParse(file, 'products', "Dane podstawowe", clearProducts, addProducts, productRowMapper);
            break;
        case 'goodsReceipts':
            handleFileParse(file, 'goodsReceipts', "Przyjęcia towaru", clearGoodsReceipts, addGoodsReceipts, goodsReceiptRowMapper);
            break;
        case 'openOrders':
            handleFileParse(file, 'openOrders', "Otwarte zamówienia", clearOpenOrders, addOpenOrders, openOrderRowMapper);
            break;
    }
  };
  
  const handleClearIndividualData = async (dataType: DataType) => {
    setIsLoading(true);
    let clearFn: () => Promise<void>;
    let dataTypeName: string;
    
    switch (dataType) {
        case 'products':
            clearFn = clearProducts;
            dataTypeName = 'Dane podstawowe';
            break;
        case 'goodsReceipts':
            clearFn = clearGoodsReceipts;
            dataTypeName = 'Przyjęcia towaru';
            break;
        case 'openOrders':
            clearFn = clearOpenOrders;
            dataTypeName = 'Otwarte zamówienia';
            break;
    }

    setStatusMessage({ text: `Usuwanie danych: ${dataTypeName}...`, type: 'info' });
    try {
        await clearFn();
        setCounts(prev => ({...prev, [dataType]: 0}));
        setImportMetadata(prev => ({...prev, [dataType]: null}));
        setStatusMessage({ text: `Dane "${dataTypeName}" zostały usunięte.`, type: 'success' });
    } catch(error) {
        console.error(`Błąd podczas usuwania danych (${dataTypeName}).`, error);
        setStatusMessage({ text: `Błąd podczas usuwania danych: ${dataTypeName}.`, type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearAllData = async () => {
    setIsLoading(true);
    setStatusMessage({ text: 'Usuwanie wszystkich danych...', type: 'info' });
    try {
      await clearAllData();
      setCounts({ products: 0, goodsReceipts: 0, openOrders: 0 });
      setImportMetadata({ products: null, goodsReceipts: null, openOrders: null });
      setStatusMessage({ text: 'Wszystkie dane zostały usunięte. Możesz załadować nowe pliki.', type: 'success' });
    } catch (error) {
      console.error("Failed to clear DB", error);
      setStatusMessage({ text: 'Błąd podczas usuwania danych.', type: 'error' });
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
            <h2>Raport Zagrożeń</h2>
            <p>Tutaj znajdzie się lista artykułów z potencjalnym ryzykiem strat, posortowana według pilności. Ta funkcjonalność jest w budowie.</p>
          </div>
        );
      case 'dashboard':
        return (
          <div class="placeholder-view">
            <h2>Dashboard</h2>
            <p>Główny pulpit z kluczowymi wskaźnikami (KPI), wykresami i podsumowaniem stanu magazynu. Ta funkcjonalność jest w budowie.</p>
          </div>
        );
      case 'simulations':
        return (
          <div class="placeholder-view">
            <h2>Symulacje</h2>
            <p>Narzędzie do przeprowadzania analiz "co-jeśli" przez modyfikację parametrów wejściowych. Ta funkcjonalność jest w budowie.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const hasAnyData = counts.products > 0 || counts.goodsReceipts > 0 || counts.openOrders > 0;
  const canAnalyze = counts.products > 0 && counts.goodsReceipts > 0;

  return (
    <>
      <header class="top-header">
        <h1>OMS</h1>
      </header>
      <div class="app-layout">
        <nav class="sidebar">
          <ul>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('import')}} class={currentView === 'import' ? 'active' : ''}>Import Danych</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('data-preview')}} class={currentView === 'data-preview' ? 'active' : ''}>Przeglądanie Danych</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('report')}} class={currentView === 'report' ? 'active' : ''}>Raport Zagrożeń</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('dashboard')}} class={currentView === 'dashboard' ? 'active' : ''}>Dashboard</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('simulations')}} class={currentView === 'simulations' ? 'active' : ''}>Symulacje</a></li>
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
              Uruchom Analizę
            </button>
            {hasAnyData && !isLoading && (
              <button onClick={handleClearAllData} class="button-secondary">Wyczyść Wszystkie Dane</button>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

render(<App />, document.getElementById("root")!);

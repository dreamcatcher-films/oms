
import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import {
  clearAllData,
  checkDBStatus,
  addProducts,
  addGoodsReceipts,
  clearProducts,
  clearGoodsReceipts,
  Product,
  GoodsReceipt,
  getProductsPaginatedAndFiltered,
  getGoodsReceiptsPaginated,
  getUniqueProductStatuses,
  getUniqueWarehouseIds,
  findProductsByPartialId
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

type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
  progress?: number;
};

type View = 'import' | 'report' | 'dashboard' | 'simulations' | 'data-preview';

const DataPreview = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'goodsReceipts'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [productFilters, setProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  const [appliedProductFilters, setAppliedProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  
  const [productStatuses, setProductStatuses] = useState<string[]>([]);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);
  const [productIdSuggestions, setProductIdSuggestions] = useState<Product[]>([]);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const fetchDropdownData = useCallback(async () => {
    const [statuses, warehouses] = await Promise.all([
      getUniqueProductStatuses(),
      getUniqueWarehouseIds()
    ]);
    setProductStatuses(statuses);
    setWarehouseIds(warehouses);
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
    const { data, total } = await getGoodsReceiptsPaginated(currentPage, PAGE_SIZE);
    setGoodsReceipts(data);
    setTotalItems(total);
    setIsLoading(false);
  }, [currentPage]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);
  
  useEffect(() => {
    setCurrentPage(1); // Reset page on tab change
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'goodsReceipts') {
      fetchGoodsReceipts();
    }
  }, [activeTab, fetchProducts, fetchGoodsReceipts]);

  useEffect(() => {
    // Refetch data when page changes
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'goodsReceipts') {
      fetchGoodsReceipts();
    }
  }, [currentPage]);


  const handleFilterChange = (e: Event) => {
    const { name, value } = e.target as HTMLInputElement | HTMLSelectElement;
    setProductFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleProductIdChange = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      setProductFilters(prev => ({ ...prev, productId: value }));

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
      setProductFilters(prev => ({ ...prev, productId: product.productId }));
      setIsSuggestionsVisible(false);
  };


  const applyFilters = () => {
    setCurrentPage(1);
    setAppliedProductFilters(productFilters);
    setIsSuggestionsVisible(false);
  };
  
  const clearFilters = () => {
    setCurrentPage(1);
    setProductFilters({ warehouseId: '', productId: '', status: '' });
    setAppliedProductFilters({ warehouseId: '', productId: '', status: '' });
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
        <button class={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>Produkty ({activeTab === 'products' ? totalItems : '...'})</button>
        <button class={`tab ${activeTab === 'goodsReceipts' ? 'active' : ''}`} onClick={() => setActiveTab('goodsReceipts')}>Przyjęcie Towaru (eGIN) ({activeTab === 'goodsReceipts' ? totalItems : '...'})</button>
      </div>

      {activeTab === 'products' && (
        <>
        <div class="filter-bar">
          <div class="filter-group">
            <label for="warehouseId">Magazyn</label>
            <select id="warehouseId" name="warehouseId" value={productFilters.warehouseId} onChange={handleFilterChange} onKeyDown={handleKeyDown}>
              <option value="">Wszystkie</option>
              {warehouseIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div class="filter-group">
            <label for="productId">Nr artykułu</label>
            <input type="text" id="productId" name="productId" value={productFilters.productId} onInput={handleProductIdChange} onKeyDown={handleKeyDown} placeholder="np. 40006" autocomplete="off"/>
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
            <label for="status">Status</label>
            <select id="status" name="status" value={productFilters.status} onChange={handleFilterChange} onKeyDown={handleKeyDown}>
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
          <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>Poprzednia</button>
          <span>Strona {currentPage} z {totalPages}</span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading}>Następna</button>
        </div>
        </>
      )}

      {activeTab === 'goodsReceipts' && (
         <>
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
  
  const [productsCount, setProductsCount] = useState(0);
  const [goodsReceiptsCount, setGoodsReceiptsCount] = useState(0);
  const [currentView, setCurrentView] = useState<View>('import');

  useEffect(() => {
    const performInitialCheck = async () => {
      setIsLoading(true);
      setStatusMessage({ text: 'Sprawdzanie lokalnej bazy danych...', type: 'info' });
      try {
        const { productsCount, goodsReceiptsCount } = await checkDBStatus();
        setProductsCount(productsCount);
        setGoodsReceiptsCount(goodsReceiptsCount);
        if (productsCount > 0 || goodsReceiptsCount > 0) {
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
    };
    performInitialCheck();
  }, []);
  
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
      // Only strip leading zeros if the string consists purely of digits.
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
        deliveryDate: row['DELIVERY DATE']?.trim() ?? '',
        bestBeforeDate: row['BEST BEFORE DATE']?.trim() ?? '',
        bolNr: row['BOL NR']?.trim() ?? '',
        supplierId: row['SUPPLIER NR']?.trim() ?? '',
        supplierName: row['SUPPLIER DESC']?.trim() ?? '',
        intSupplierNr: row['INT SUPPLIER NR']?.trim() ?? '',
        intItemNr: row['INT ITEM NR']?.trim() ?? '',
        caseGtin: row['CASE GTIN']?.trim() ?? '',
        liaReference: row['LIA REFERENCE']?.trim() ?? '',
    };
};

  const handleProductFile = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    (event.target as HTMLInputElement).value = ''; 
    setIsLoading(true);
    setStatusMessage({ text: 'Przygotowywanie do importu produktów...', type: 'info', progress: 0 });

    (async () => {
      try {
        await clearProducts();
        setProductsCount(0);
      } catch (error) {
        console.error("Błąd podczas czyszczenia bazy danych produktów.", error);
        setStatusMessage({ text: 'Błąd podczas czyszczenia bazy danych.', type: 'error' });
        setIsLoading(false);
        return;
      }

      setStatusMessage({ text: `Rozpoczynanie importu pliku produktów...`, type: 'info', progress: 0 });
      
      let header1: string[] = [];
      let header2: string[] = [];
      let combinedHeader: string[] = [];
      let batch: Product[] = [];
      let processedCount = 0;
      let rowIndex = 0;

      const processBatch = async () => {
        if (batch.length > 0) {
          await addProducts(batch);
          processedCount += batch.length;
          setProductsCount(prev => prev + batch.length);
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
                        // Smart header combination logic to handle merged cells
                        let lastH1 = '';
                        combinedHeader = header1.map((h1, j) => {
                            const currentH1 = (h1 || '').trim();
                            if (currentH1 !== '') {
                                lastH1 = currentH1;
                            }
                            const currentH2 = (header2[j] || '').trim();
                            return `${lastH1} ${currentH2}`.trim();
                        });
                    } else {
                        const rowObject: { [key: string]: string } = {};
                        combinedHeader.forEach((header, k) => {
                            rowObject[header] = row[k];
                        });
                        const mappedRow = productRowMapper(rowObject);
                        batch.push(mappedRow);
                        if (batch.length >= BATCH_SIZE) {
                            await processBatch();
                        }
                    }
                    rowIndex++;
                }
                const progress = file ? (results.meta.cursor / file.size) * 100 : 0;
                setStatusMessage({
                  text: `Przetwarzanie pliku... Zapisano ${processedCount.toLocaleString('pl-PL')} produktów.`,
                  type: 'info',
                  progress: progress,
                });
                parser.resume();
            })();
        },
        complete: async () => {
          await processBatch();
          setProductsCount(processedCount);
          setStatusMessage({ text: `Import zakończony. Zapisano ${processedCount.toLocaleString('pl-PL')} produktów.`, type: 'success' });
          setIsLoading(false);
        },
        error: (error) => {
          console.error("PapaParse error:", error);
          setStatusMessage({ text: `Błąd krytyczny podczas parsowania pliku produktów.`, type: 'error' });
          setIsLoading(false);
        }
      });
    })();
  };

  const handleGoodsReceiptFile = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    (event.target as HTMLInputElement).value = ''; 
    setIsLoading(true);
    setStatusMessage({ text: 'Przygotowywanie do importu przyjęć towaru...', type: 'info', progress: 0 });

    (async () => {
      try {
        await clearGoodsReceipts();
        setGoodsReceiptsCount(0);
      } catch (error) {
        console.error("Błąd podczas czyszczenia bazy danych przyjęć.", error);
        setStatusMessage({ text: 'Błąd podczas czyszczenia bazy danych.', type: 'error' });
        setIsLoading(false);
        return;
      }

      setStatusMessage({ text: `Rozpoczynanie importu pliku przyjęć towaru...`, type: 'info', progress: 0 });
      
      let header1: string[] = [];
      let header2: string[] = [];
      let combinedHeader: string[] = [];
      let batch: GoodsReceipt[] = [];
      let processedCount = 0;
      let rowIndex = 0;

      const processBatch = async () => {
        if (batch.length > 0) {
          await addGoodsReceipts(batch);
          processedCount += batch.length;
          setGoodsReceiptsCount(prev => prev + batch.length);
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
                        // Smart header combination logic to handle merged cells
                        let lastH1 = '';
                        combinedHeader = header1.map((h1, j) => {
                            const currentH1 = (h1 || '').trim();
                            if (currentH1 !== '') {
                                lastH1 = currentH1;
                            }
                            const currentH2 = (header2[j] || '').trim();
                            return `${lastH1} ${currentH2}`.trim();
                        });
                    } else {
                        const rowObject: { [key: string]: string } = {};
                        combinedHeader.forEach((header, k) => {
                            rowObject[header] = row[k];
                        });
                        const mappedRow = goodsReceiptRowMapper(rowObject);
                        batch.push(mappedRow);
                        if (batch.length >= BATCH_SIZE) {
                            await processBatch();
                        }
                    }
                    rowIndex++;
                }
                const progress = file ? (results.meta.cursor / file.size) * 100 : 0;
                setStatusMessage({
                  text: `Przetwarzanie pliku... Zapisano ${processedCount.toLocaleString('pl-PL')} przyjęć.`,
                  type: 'info',
                  progress: progress,
                });
                parser.resume();
            })();
        },
        complete: async () => {
          await processBatch();
          setGoodsReceiptsCount(processedCount);
          setStatusMessage({ text: `Import zakończony. Zapisano ${processedCount.toLocaleString('pl-PL')} przyjęć.`, type: 'success' });
          setIsLoading(false);
        },
        error: (error) => {
          console.error("PapaParse error:", error);
          setStatusMessage({ text: `Błąd krytyczny podczas parsowania pliku przyjęć towaru.`, type: 'error' });
          setIsLoading(false);
        }
      });
    })();
  };

  const handleClearData = async () => {
    setIsLoading(true);
    setStatusMessage({ text: 'Usuwanie wszystkich danych...', type: 'info' });
    try {
      await clearAllData();
      setProductsCount(0);
      setGoodsReceiptsCount(0);
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
          <div class="import-container">
            <div class="import-section">
              <h2>1. Dane Podstawowe Artykułów</h2>
              <p>Plik z informacjami o produktach. Wymaga dwóch wierszy nagłówka, dane od trzeciego wiersza.</p>
              <label htmlFor="product-file-input" class={`file-label ${isLoading ? 'disabled' : ''}`}>
                Wybierz plik produktów
              </label>
              <input id="product-file-input" type="file" accept=".csv" onChange={handleProductFile} disabled={isLoading} />
              <div class="import-status">
                <p>Zaimportowano: <strong>{productsCount.toLocaleString('pl-PL')}</strong> rekordów</p>
              </div>
            </div>

            <div class="import-section">
              <h2>2. Przyjęcie Towaru (eGIN)</h2>
              <p>Plik z informacjami o przyjęciach towaru. Wymaga dwóch wierszy nagłówka.</p>
              <label htmlFor="goods-receipt-file-input" class={`file-label ${isLoading ? 'disabled' : ''}`}>
                Wybierz plik eGIN
              </label>
              <input id="goods-receipt-file-input" type="file" accept=".csv" onChange={handleGoodsReceiptFile} disabled={isLoading} />
              <div class="import-status">
                <p>Zaimportowano: <strong>{goodsReceiptsCount.toLocaleString('pl-PL')}</strong> rekordów</p>
              </div>
            </div>
          </div>
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

  const hasAnyData = productsCount > 0 || goodsReceiptsCount > 0;
  const canAnalyze = productsCount > 0 && goodsReceiptsCount > 0;

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
              <button onClick={handleClearData} class="button-secondary">Wyczyść Wszystkie Dane</button>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

render(<App />, document.getElementById("root")!);

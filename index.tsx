
import { render } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
import {
  clearAllData,
  checkDBStatus,
  addProducts,
  addPallets,
  clearProducts,
  clearPallets,
  Product,
  Pallet,
  getProductsPaginatedAndFiltered,
  getUniqueProductStatuses
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


type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
  progress?: number;
};

type View = 'import' | 'report' | 'dashboard' | 'simulations' | 'data-preview';

const DataPreview = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'pallets'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [productFilters, setProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  const [appliedProductFilters, setAppliedProductFilters] = useState({ warehouseId: '', productId: '', status: '' });
  const [productStatuses, setProductStatuses] = useState<string[]>([]);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const fetchStatuses = useCallback(async () => {
    const statuses = await getUniqueProductStatuses();
    setProductStatuses(statuses);
  }, []);
  
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const { data, total } = await getProductsPaginatedAndFiltered(currentPage, PAGE_SIZE, appliedProductFilters);
    setProducts(data);
    setTotalItems(total);
    setIsLoading(false);
  }, [currentPage, appliedProductFilters]);


  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);
  
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else {
      // Logic for fetching pallets will go here
      setPallets([]);
      setTotalItems(0);
    }
  }, [activeTab, fetchProducts]);

  const handleFilterChange = (e: Event) => {
    const { name, value } = e.target as HTMLInputElement | HTMLSelectElement;
    setProductFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setAppliedProductFilters(productFilters);
  };
  
  const clearFilters = () => {
    setCurrentPage(1);
    setProductFilters({ warehouseId: '', productId: '', status: '' });
    setAppliedProductFilters({ warehouseId: '', productId: '', status: '' });
  };

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
    <div class="data-preview-container">
      <div class="tabs">
        <button class={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>Produkty ({totalItems})</button>
        <button class={`tab ${activeTab === 'pallets' ? 'active' : ''}`} onClick={() => setActiveTab('pallets')}>Palety</button>
      </div>

      {activeTab === 'products' && (
        <>
        <div class="filter-bar">
          <div class="filter-group">
            <label for="warehouseId">Magazyn</label>
            <input type="text" id="warehouseId" name="warehouseId" value={productFilters.warehouseId} onInput={handleFilterChange} placeholder="np. 220" />
          </div>
          <div class="filter-group">
            <label for="productId">Nr artykułu</label>
            <input type="text" id="productId" name="productId" value={productFilters.productId} onInput={handleFilterChange} placeholder="np. 40006"/>
          </div>
          <div class="filter-group">
            <label for="status">Status</label>
            <select id="status" name="status" value={productFilters.status} onChange={handleFilterChange}>
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

      {activeTab === 'pallets' && <p>Przeglądanie palet zostanie dodane wkrótce.</p>}
    </div>
  );
};


const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<Status>({ text: 'Inicjalizacja aplikacji...', type: 'info' });
  
  const [productsCount, setProductsCount] = useState(0);
  const [palletsCount, setPalletsCount] = useState(0);
  const [currentView, setCurrentView] = useState<View>('import');

  useEffect(() => {
    const performInitialCheck = async () => {
      setIsLoading(true);
      setStatusMessage({ text: 'Sprawdzanie lokalnej bazy danych...', type: 'info' });
      try {
        const { productsCount, palletsCount } = await checkDBStatus();
        setProductsCount(productsCount);
        setPalletsCount(palletsCount);
        if (productsCount > 0 || palletsCount > 0) {
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

      return {
          warehouseId: row['WH NR']?.trim() ?? '',
          productId: row['ITEM NR SHORT']?.trim() ?? '',
          fullProductId: row['ITEM NR FULL']?.trim() ?? '',
          name: row['ITEM DESC']?.trim() ?? '',
          caseSize: parseNum(row['CASE SIZE']),
          shelfLifeAtReceiving: parseNum(row['W-DATE DAYS']),
          shelfLifeAtStore: parseNum(row['S-DATE DAYS']),
          customerShelfLife: parseNum(row['C-DATE DAYS']),
          price: parseNum(row['RETAIL PRICE']),
          status: row['ITEM STATUS']?.trim() ?? '',
          promoDate: row['ADV DATE']?.trim() ?? '',
          supplierId: row['SUPPLIE NR']?.trim() ?? '',
          supplierName: row['SUPPLIE NAME']?.trim() ?? '',
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

  const handlePalletFile = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    (event.target as HTMLInputElement).value = ''; // Reset input
    
    // UWAGA: Mapper tymczasowy do czasu podania schematu pliku palet.
    const palletRowMapper = (row: { [key: string]: string }): Pallet => ({
      palletId: row['Pallet ID']?.trim() ?? '',
      productId: row['Product ID']?.trim() ?? '',
      warehouseId: row['Warehouse ID']?.trim() ?? '',
      arrivalDate: new Date(row['Arrival Date']?.trim() ?? ''),
      expiryDate: new Date(row['Expiry Date']?.trim() ?? '')
    });
    
    (async () => {
      setIsLoading(true);
      setStatusMessage({ text: 'Przygotowywanie do importu palet...', type: 'info', progress: 0 });
      try {
        await clearPallets();
        setPalletsCount(0);
      } catch (error) {
        console.error("Błąd podczas czyszczenia bazy danych palet.", error);
        setStatusMessage({ text: 'Błąd podczas czyszczenia bazy danych.', type: 'error' });
        setIsLoading(false);
        return;
      }
      
      setStatusMessage({ text: `Rozpoczynanie importu pliku palet...`, type: 'info', progress: 0 });

      let parsedRowCount = 0;
      let batch: Pallet[] = [];

      const processBatch = async () => {
        if (batch.length > 0) {
          await addPallets(batch);
          parsedRowCount += batch.length;
          setPalletsCount(prev => prev + batch.length);
          batch = [];
        }
      };

      Papa.parse<{ [key: string]: string }>(file, {
        worker: true,
        header: true,
        skipEmptyLines: true,
        chunk: (results, parser) => {
          parser.pause();
          (async () => {
            try {
              for (const row of results.data) {
                const mappedRow = palletRowMapper(row);
                batch.push(mappedRow);
                if (batch.length >= BATCH_SIZE) {
                  await processBatch();
                }
              }
              const progress = file ? (results.meta.cursor / file.size) * 100 : 0;
              setStatusMessage({
                text: `Przetwarzanie pliku... Zapisano ${parsedRowCount.toLocaleString('pl-PL')} palet.`,
                type: 'info',
                progress: progress,
              });
              parser.resume();
            } catch (err) {
              console.error("Error processing CSV step:", err);
              setStatusMessage({ text: `Błąd w strukturze pliku palet. Sprawdź nazwy kolumn.`, type: 'error' });
              setIsLoading(false);
              parser.abort();
            }
          })();
        },
        complete: async () => {
          try {
            await processBatch();
            setPalletsCount(parsedRowCount);
            setStatusMessage({ text: `Import zakończony. Zapisano ${parsedRowCount.toLocaleString('pl-PL')} palet.`, type: 'success' });
          } catch (err) {
            console.error("Error during CSV completion:", err);
            setStatusMessage({ text: `Błąd podczas finalizowania importu palet.`, type: 'error' });
          } finally {
            setIsLoading(false);
          }
        },
        error: (error) => {
          console.error("PapaParse error:", error);
          setStatusMessage({ text: `Błąd krytyczny podczas parsowania pliku palet.`, type: 'error' });
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
      setPalletsCount(0);
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
              <h2>2. Dane o Paletach</h2>
              <p>Plik z informacjami o poszczególnych paletach. Wymaga nagłówków w pierwszym wierszu.</p>
              <label htmlFor="pallet-file-input" class={`file-label ${isLoading ? 'disabled' : ''}`}>
                Wybierz plik palet
              </label>
              <input id="pallet-file-input" type="file" accept=".csv" onChange={handlePalletFile} disabled={isLoading} />
              <div class="import-status">
                <p>Zaimportowano: <strong>{palletsCount.toLocaleString('pl-PL')}</strong> rekordów</p>
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

  const hasAnyData = productsCount > 0 || palletsCount > 0;
  const canAnalyze = productsCount > 0 && palletsCount > 0;

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

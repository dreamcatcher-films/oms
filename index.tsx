
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  clearAllData,
  checkDBStatus,
  addProducts,
  addPallets,
  clearProducts,
  clearPallets,
  Product,
  Pallet
} from "./db";
import Papa from "papaparse";

const BATCH_SIZE = 5000;

type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
};

type View = 'import' | 'report' | 'dashboard' | 'simulations';

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
          productId: row['ITEM NR SHOP']?.trim() ?? '',
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
      };
  };

  const handleProductFile = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    (event.target as HTMLInputElement).value = ''; // Reset input to allow re-uploading the same file
    setIsLoading(true);
    setStatusMessage({ text: 'Przygotowywanie do importu produktów...', type: 'info' });

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

      setStatusMessage({ text: `Rozpoczynanie importu pliku produktów...`, type: 'info' });
      
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
          setStatusMessage({ text: `Przetwarzanie pliku... Zapisano ${processedCount.toLocaleString('pl-PL')} produktów.`, type: 'info' });
          batch = [];
        }
      };

      Papa.parse(file, {
        header: false,
        worker: false,
        skipEmptyLines: true,
        step: (results, parser) => {
          const row = results.data as string[];
          if (rowIndex === 0) {
            header1 = row;
          } else if (rowIndex === 1) {
            header2 = row;
            combinedHeader = header1.map((h1, i) =>
              `${(h1 || '').trim()} ${(header2[i] || '').trim()}`.trim()
            );
          } else {
            parser.pause();
            (async () => {
              const rowObject: { [key: string]: string } = {};
              combinedHeader.forEach((header, i) => {
                rowObject[header] = row[i];
              });

              const mappedRow = productRowMapper(rowObject);
              batch.push(mappedRow);

              if (batch.length >= BATCH_SIZE) {
                await processBatch();
              }
              parser.resume();
            })();
          }
          rowIndex++;
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
      setStatusMessage({ text: 'Przygotowywanie do importu palet...', type: 'info' });
      try {
        await clearPallets();
        setPalletsCount(0);
      } catch (error) {
        console.error("Błąd podczas czyszczenia bazy danych palet.", error);
        setStatusMessage({ text: 'Błąd podczas czyszczenia bazy danych.', type: 'error' });
        setIsLoading(false);
        return;
      }
      
      setStatusMessage({ text: `Rozpoczynanie importu pliku palet...`, type: 'info' });

      let parsedRowCount = 0;
      let batch: Pallet[] = [];

      const processBatch = async () => {
        if (batch.length > 0) {
          await addPallets(batch);
          parsedRowCount += batch.length;
          setStatusMessage({ text: `Przetwarzanie pliku... Zapisano ${parsedRowCount.toLocaleString('pl-PL')} palet.`, type: 'info' });
          batch = [];
        }
      };

      Papa.parse<{ [key: string]: string }>(file, {
        worker: true,
        header: true,
        skipEmptyLines: true,
        step: (results, parser) => {
          parser.pause();
          (async () => {
            try {
              const mappedRow = palletRowMapper(results.data);
              batch.push(mappedRow);
              if (batch.length >= BATCH_SIZE) {
                await processBatch();
              }
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
            const finalCount = parsedRowCount + batch.length;
            setPalletsCount(finalCount);
            setStatusMessage({ text: `Import zakończony. Zapisano ${finalCount.toLocaleString('pl-PL')} palet.`, type: 'success' });
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
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('report')}} class={currentView === 'report' ? 'active' : ''}>Raport Zagrożeń</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('dashboard')}} class={currentView === 'dashboard' ? 'active' : ''}>Dashboard</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('simulations')}} class={currentView === 'simulations' ? 'active' : ''}>Symulacje</a></li>
          </ul>
        </nav>
        <main class="main-content">
          {statusMessage.text && (
              <div class={`status-container ${statusMessage.type}`} role="status">
                <div class="status-info">
                   {isLoading && <div class="spinner"></div>}
                   <div class="status-content">
                      <p class="status-text">{statusMessage.text}</p>
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

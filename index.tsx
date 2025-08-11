
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  clearAllData,
  checkDBStatus,
  saveProducts,
  savePallets,
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

  const handleFileParse = <T,>(
    file: File,
    setDataCount: (count: number) => void,
    saveFunction: (data: T[]) => Promise<void>,
    rowMapper: (row: string[]) => T,
    dataType: 'produktów' | 'palet'
  ) => {
    setIsLoading(true);
    setStatusMessage({ text: `Rozpoczynanie importu pliku ${dataType}...`, type: 'info' });

    let parsedRowCount = 0;
    let batch: T[] = [];

    const processBatch = async () => {
      if (batch.length > 0) {
        await saveFunction(batch);
        parsedRowCount += batch.length;
        setStatusMessage({ text: `Przetwarzanie pliku... Zapisano ${parsedRowCount.toLocaleString('pl-PL')} ${dataType}.`, type: 'info' });
        batch = [];
      }
    };

    Papa.parse<string[]>(file, {
      worker: true,
      header: false,
      skipEmptyLines: true,
      step: (results, parser) => {
        if (parsedRowCount === 0) { // Skip header row
            parsedRowCount = -1; // so it becomes 0 after first data row
            return;
        }
        
        parser.pause();
        (async () => {
          try {
            const mappedRow = rowMapper(results.data);
            batch.push(mappedRow);
            if (batch.length >= BATCH_SIZE) {
              await processBatch();
            }
            parser.resume();
          } catch (err) {
            console.error("Error processing CSV step:", err);
            setStatusMessage({ text: `Błąd w strukturze pliku ${dataType}.`, type: 'error' });
            setIsLoading(false);
            parser.abort();
          }
        })();
      },
      complete: () => {
        (async () => {
          try {
            await processBatch();
            const finalCount = parsedRowCount + batch.length;
            setDataCount(finalCount);
            setStatusMessage({ text: `Import zakończony. Zapisano ${finalCount.toLocaleString('pl-PL')} ${dataType}.`, type: 'success' });
            setIsLoading(false);
          } catch (err) {
            console.error("Error during CSV completion:", err);
            setStatusMessage({ text: `Błąd podczas finalizowania importu ${dataType}.`, type: 'error' });
            setIsLoading(false);
          }
        })();
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        setStatusMessage({ text: `Błąd krytyczny podczas parsowania pliku ${dataType}.`, type: 'error' });
        setIsLoading(false);
      }
    });
  };

  const handleProductFile = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      handleFileParse<Product>(file, setProductsCount, saveProducts, (row) => ({
        productId: row[0],
        warehouseId: row[1],
        name: row[2],
        price: parseFloat(row[3]),
        resellTime: parseInt(row[4], 10)
      }), 'produktów');
       (event.target as HTMLInputElement).value = '';
    }
  };

  const handlePalletFile = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      handleFileParse<Pallet>(file, setPalletsCount, savePallets, (row) => ({
        palletId: row[0],
        productId: row[1],
        warehouseId: row[2],
        arrivalDate: new Date(row[3]),
        expiryDate: new Date(row[4])
      }), 'palet');
       (event.target as HTMLInputElement).value = '';
    }
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
              <p>Plik z informacjami o produktach (ID, nazwa, cena, itp.).</p>
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
              <p>Plik z informacjami o paletach (ID, daty, przynależność).</p>
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

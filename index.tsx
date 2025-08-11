import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  clearData,
  checkDBStatus,
  appendRows,
  saveHeaders,
  getPaginatedData,
} from "./db";
import Papa from "papaparse";

const PAGE_SIZE = 100;
const BATCH_SIZE = 5000;

const App = () => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Sprawdzanie lokalnej bazy danych...');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [dbHasData, setDbHasData] = useState(false);

  const totalPages = Math.ceil(totalRows / PAGE_SIZE);

  useEffect(() => {
    const performInitialCheck = async () => {
      setIsLoading(true);
      setStatusMessage('Sprawdzanie lokalnej bazy danych...');
      try {
        const { hasData, headers, rowCount } = await checkDBStatus();
        setDbHasData(hasData);
        if (hasData) {
          setHeaders(headers);
          setTotalRows(rowCount);
          setStatusMessage(`Znaleziono ${rowCount.toLocaleString('pl-PL')} wierszy w lokalnej bazie. Gotowe do załadowania.`);
        } else {
          setStatusMessage('Wybierz plik CSV, aby rozpocząć.');
        }
      } catch (error) {
        console.error("Failed to check DB status", error);
        setStatusMessage('Błąd podczas sprawdzania bazy danych.');
        setDbHasData(false);
      } finally {
        setIsLoading(false);
      }
    };
    performInitialCheck();
  }, []);

  const loadPage = async (page: number) => {
    if (page < 1 || page > totalPages || !dbHasData) return;
    
    setIsLoading(true);
    setStatusMessage(`Ładowanie strony ${page} z ${totalPages}...`);
    try {
      const { rows: loadedRows } = await getPaginatedData({ page, pageSize: PAGE_SIZE });
      setRows(loadedRows);
      setCurrentPage(page);
      setStatusMessage(`Wyświetlanie strony ${page} z ${totalPages} (${totalRows.toLocaleString('pl-PL')} wierszy).`);
    } catch (error) {
      console.error(`Failed to load page ${page}`, error);
      setStatusMessage(`Błąd podczas ładowania strony ${page}.`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLoadData = async () => {
    await loadPage(1);
  };

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      setRows([]);
      setHeaders([]);
      setTotalRows(0);
      setCurrentPage(1);
      setIsLoading(true);

      let parsedRowCount = 0;
      let batch: string[][] = [];
      let fileHeaders: string[] = [];

      const processBatch = async () => {
        if (batch.length > 0) {
          await appendRows(batch);
          parsedRowCount += batch.length;
          setStatusMessage(`Przetwarzanie pliku... Zapisano ${parsedRowCount.toLocaleString('pl-PL')} wierszy.`);
          batch = [];
        }
      };

      Papa.parse(file, {
        worker: true,
        header: false,
        skipEmptyLines: true,
        step: async (results: Papa.ParseStepResult<string[]>) => {
          if (fileHeaders.length === 0) {
            fileHeaders = results.data;
            setHeaders(fileHeaders);
            await clearData();
            await saveHeaders(fileHeaders);
          } else {
            batch.push(results.data);
            if (batch.length >= BATCH_SIZE) {
              await processBatch();
            }
          }
        },
        complete: async () => {
          await processBatch(); // process any remaining rows
          setTotalRows(parsedRowCount);
          setDbHasData(true);
          setStatusMessage(`Import zakończony. Zapisano ${parsedRowCount.toLocaleString('pl-PL')} wierszy.`);
          setIsLoading(false);
          await loadPage(1);
        },
        error: (error: Papa.ParseError) => {
          console.error("PapaParse error:", error);
          setStatusMessage(`Błąd podczas przetwarzania pliku: ${error.message}`);
          setIsLoading(false);
        }
      });
      target.value = ''; 
    }
  };
  
  const handleClearData = async () => {
    setIsLoading(true);
    setStatusMessage('Usuwanie danych...');
    try {
        await clearData();
        setHeaders([]);
        setRows([]);
        setTotalRows(0);
        setCurrentPage(1);
        setStatusMessage('Dane zostały usunięte. Możesz teraz załadować nowy plik.');
        setDbHasData(false);
    } catch(error) {
        console.error("Failed to clear DB", error);
        setStatusMessage('Błąd podczas usuwania danych.');
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <>
      <h1>Przeglądarka plików CSV z lokalną bazą danych</h1>
      
      <div class="file-uploader">
        <p>Wybierz plik CSV lub załaduj istniejące dane z lokalnej bazy.</p>
        <div class="actions-container">
           {dbHasData && !isLoading && (
             <button onClick={handleLoadData} class="button-primary">Załaduj dane</button>
           )}
           <label htmlFor="csv-file-input" class={`file-label ${isLoading ? 'disabled' : ''}`}>
             Wybierz plik
           </label>
           {dbHasData && !isLoading && (
             <button onClick={handleClearData} class="button-secondary">Wyczyść dane</button>
           )}
        </div>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          aria-label="File uploader"
          disabled={isLoading}
        />
      </div>

      {(isLoading || statusMessage) && (
        <div class="status-container" role="status">
          <div class="status-info">
             {isLoading && <div class="spinner"></div>}
             <div class="status-content">
                <p class="status-text">{statusMessage}</p>
             </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div class="table-container" role="region" aria-labelledby="table-caption">
          <h2 id="table-caption" class="sr-only">Dane z pliku CSV</h2>
          <table>
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} scope="col">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div class="pagination-container">
              <button onClick={() => loadPage(currentPage - 1)} disabled={currentPage <= 1 || isLoading}>
                  Poprzednia
              </button>
              <span>Strona {currentPage} z {totalPages}</span>
              <button onClick={() => loadPage(currentPage + 1)} disabled={currentPage >= totalPages || isLoading}>
                  Następna
              </button>
          </div>
        </div>
      )}
    </>
  );
};

render(<App />, document.getElementById("root")!);

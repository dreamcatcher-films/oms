import { render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { saveData, getData, clearData } from "./db";

const App = () => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Sprawdzanie lokalnej bazy danych...');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dbMightHaveData, setDbMightHaveData] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      abortControllerRef.current = new AbortController();
      try {
        const { headers, rows } = await getData({ signal: abortControllerRef.current.signal });
        if (rows.length > 0) {
          setHeaders(headers);
          setRows(rows);
          setStatusMessage('Dane załadowane z lokalnej bazy danych.');
          setDbMightHaveData(true);
        } else {
          setStatusMessage('Wybierz plik CSV, aby rozpocząć.');
          setDbMightHaveData(false);
        }
      } catch (error) {
        setDbMightHaveData(true); // Assume data might be corrupted
        if (error instanceof DOMException && error.name === 'AbortError') {
          setStatusMessage('Sprawdzanie przerwane. Wybierz plik, aby rozpocząć.');
        } else {
          console.error("Failed to load data from DB", error);
          setStatusMessage('Nie udało się załadować danych. Spróbuj wyczyścić dane i załadować plik ponownie.');
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    };
    loadInitialData();

    return () => {
      abortControllerRef.current?.abort();
    }
  }, []);

  const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      setIsLoading(true);
      setUploadProgress(0);
      setStatusMessage('Wczytywanie pliku: 0%');
      
      const reader = new FileReader();

      reader.onprogress = (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
          setStatusMessage(`Wczytywanie pliku: ${progress}%`);
        }
      };

      reader.onerror = () => {
        setIsLoading(false);
        setUploadProgress(null);
        setStatusMessage('Błąd podczas wczytywania pliku.');
        setDbMightHaveData(true);
      };

      reader.onload = async (e) => {
        setUploadProgress(100);
        setStatusMessage('Plik wczytany. Przetwarzanie i zapisywanie danych...');
        
        setTimeout(async () => {
            const text = e.target?.result as string;
            if (text) {
              const lines = text.split('\n').filter(line => line.trim() !== '');
              if (lines.length > 0) {
                const fileHeaders = lines[0].split(',').map(header => header.trim());
                const fileRows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
                
                try {
                  await saveData(fileHeaders, fileRows);
                  setHeaders(fileHeaders);
                  setRows(fileRows);
                  setStatusMessage('Dane zostały pomyślnie zapisane.');
                  setDbMightHaveData(true);
                } catch(error) {
                  console.error("Failed to save data to DB", error);
                  setStatusMessage('Błąd podczas zapisywania danych.');
                  setDbMightHaveData(true);
                } finally {
                  setIsLoading(false);
                  setUploadProgress(null);
                }
              } else {
                setHeaders([]);
                setRows([]);
                setIsLoading(false);
                setUploadProgress(null);
                setStatusMessage('Plik jest pusty.');
                setDbMightHaveData(false);
              }
            }
        }, 50);
      };
      reader.readAsText(file);
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
        setStatusMessage('Dane zostały usunięte. Możesz teraz załadować nowy plik.');
        setDbMightHaveData(false);
    } catch(error) {
        console.error("Failed to clear DB", error);
        setStatusMessage('Błąd podczas usuwania danych.');
        setDbMightHaveData(true);
    } finally {
        setIsLoading(false);
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
  }

  return (
    <>
      <h1>Przeglądarka plików CSV z lokalną bazą danych</h1>
      
      <div class="file-uploader">
        <p>Wybierz plik CSV, aby zapisać go w lokalnej bazie danych przeglądarki (IndexedDB).</p>
        <div class="actions-container">
           <label htmlFor="csv-file-input" class={`file-label ${isLoading ? 'disabled' : ''}`}>
             Wybierz plik
           </label>
           {dbMightHaveData && !isLoading && (
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
             {isLoading && uploadProgress === null && <div class="spinner"></div>}
             <div class="status-content">
                <p class="status-text">{statusMessage}</p>
                {uploadProgress !== null && (
                   <div class="progress-bar-container">
                     <div class="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                   </div>
                )}
             </div>
          </div>
          {isLoading && uploadProgress === null && (
            <button onClick={handleCancel} class="button-cancel">Anuluj</button>
          )}
        </div>
      )}

      {!isLoading && rows.length > 0 && (
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
        </div>
      )}
    </>
  );
};

render(<App />, document.getElementById("root")!);

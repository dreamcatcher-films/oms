import { render } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
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
  Sale,
  getImportMetadata,
  updateImportMetadata,
  ImportMetadata,
} from "./db";
import { LanguageProvider, useTranslation } from './i18n';
import Papa from "papaparse";
import { productRowMapper, goodsReceiptRowMapper, openOrderRowMapper, saleRowMapper } from './utils/parsing';
import { Status, View, DataType } from './utils/types';

import { LanguageSelector } from './components/LanguageSelector';
import { ImportView } from './views/ImportView';
import { DataPreview } from './views/DataPreview';
import { SimulationView } from './views/SimulationView';

const BATCH_SIZE = 5000;

const App = () => {
  const { t, language } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<Status | null>({ text: 'Inicjalizacja aplikacji...', type: 'info' });
  
  const [counts, setCounts] = useState({ products: 0, goodsReceipts: 0, openOrders: 0, sales: 0 });
  const [importMetadata, setImportMetadata] = useState<ImportMetadata>({ products: null, goodsReceipts: null, openOrders: null, sales: null });
  
  const [currentView, setCurrentView] = useState<View>('import');

  useEffect(() => {
    const splashScreen = document.getElementById('splash-screen');
    const continueButton = document.getElementById('continue-button');

    if (splashScreen && continueButton) {
        const hideSplash = () => {
            splashScreen.classList.add('splash-hidden');
            splashScreen.addEventListener('animationend', () => {
                splashScreen.remove();
            }, { once: true });
        };
        
        continueButton.addEventListener('click', hideSplash, { once: true });
    }
  }, []);

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
        setStatusMessage({ text: t('status.dbEmpty'), type: 'info' });
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
              delimiter: ';',
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
        return <SimulationView />;
      default:
        return null;
    }
  };

  const hasAnyData = counts.products > 0 || counts.goodsReceipts > 0 || counts.openOrders > 0 || counts.sales > 0;
  const canAnalyze = counts.products > 0 && counts.goodsReceipts > 0 && counts.sales > 0;

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
          <div class="sidebar-footer">
              <p>Proof of Concept Supply Chain UK</p>
              <p>OMS - Outdate Mitigation System</p>
              <p>&copy; 2025 | Version 0.1</p>
          </div>
        </nav>
        <main class="main-content">
          {statusMessage && (
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
                 <button 
                  class="status-close-button"
                  onClick={() => setStatusMessage(null)}
                  aria-label={t('status.close')}
                 >&times;</button>
              </div>
          )}
          <div class="content-wrapper">
            {renderContent()}
          </div>
          {currentView === 'import' && (
            <div class="actions-container">
              <button 
                  class="button-primary" 
                  disabled={!canAnalyze || isLoading}
                  onClick={() => setCurrentView('simulations')}
              >
                {t('actions.runAnalysis')}
              </button>
              {hasAnyData && !isLoading && (
                <button onClick={handleClearAllData} class="button-secondary">{t('actions.clearAll')}</button>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

render(<LanguageProvider><App /></LanguageProvider>, document.getElementById("root")!);

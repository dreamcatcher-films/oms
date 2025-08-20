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
  Sale,
  getImportMetadata,
  updateImportMetadata,
  ImportMetadata,
  saveSetting,
  loadAllSettings,
  deleteSetting,
  loadRdcList,
  saveRdcList,
  loadExclusionList,
  saveExclusionList,
  clearExclusionList,
} from "./db";
import { LanguageProvider, useTranslation } from './i18n';
import Papa from "papaparse";
import { productRowMapper, goodsReceiptRowMapper, openOrderRowMapper, saleRowMapper } from './utils/parsing';
import { Status, View, DataType, RDC, UserSession, ReportResultItem, ExclusionListData } from './utils/types';

import { LanguageSelector } from './components/LanguageSelector';
import { LoginModal } from './components/LoginModal';
import { ImportView } from './views/ImportView';
import { DataPreview } from './views/DataPreview';
import { SimulationView } from './views/SimulationView';
import { SettingsView } from './views/SettingsView';
import { ThreatReportView } from './views/ThreatReportView';
import { StatusReportView } from './views/StatusReportView';

import './styles/global.css';
import sharedStyles from './styles/shared.module.css';


const BATCH_SIZE = 5000;

const App = () => {
  const { t, language } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<Status | null>({ text: 'Inicjalizacja aplikacji...', type: 'info' });
  
  const [counts, setCounts] = useState({ products: 0, goodsReceipts: 0, openOrders: 0, sales: 0 });
  const [importMetadata, setImportMetadata] = useState<ImportMetadata>({ products: null, goodsReceipts: null, openOrders: null, sales: null });
  const [linkedFiles, setLinkedFiles] = useState<Map<DataType, FileSystemFileHandle>>(new Map());
  
  const [currentView, setCurrentView] = useState<View>('import');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [rdcList, setRdcList] = useState<RDC[]>([]);
  
  const [simulationContext, setSimulationContext] = useState<{ warehouseId: string; fullProductId: string; } | null>(null);
  const [watchlist, setWatchlist] = useState<ReportResultItem[]>([]);
  const [watchlistIndex, setWatchlistIndex] = useState<number | null>(null);
  const [exclusionList, setExclusionList] = useState<ExclusionListData>({ list: new Set(), lastUpdated: null });

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const exclusionFileInputRef = useRef<HTMLInputElement>(null);

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

  const loadSettings = useCallback(async () => {
    if ('showOpenFilePicker' in window) {
        try {
            const settings = await loadAllSettings();
            const fileHandles = new Map<DataType, FileSystemFileHandle>();
            for (const [key, value] of settings.entries()) {
                if (key.startsWith('linkedFile:')) {
                    const dataType = key.split(':')[1] as DataType;
                    const permission = await (value as any).queryPermission({ mode: 'read' });
                    if (permission === 'granted') {
                      fileHandles.set(dataType, value as FileSystemFileHandle);
                    }
                }
            }
            setLinkedFiles(fileHandles);
        } catch(e) {
            console.error("Error loading settings:", e);
        }
    }
    const [rdcs, exclusions] = await Promise.all([loadRdcList(), loadExclusionList()]);
    setRdcList(rdcs);
    setExclusionList(exclusions);
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
    const savedSession = localStorage.getItem('oms-session');
    if(savedSession) {
        setUserSession(JSON.parse(savedSession));
    }
    performInitialCheck();
    loadSettings();
  }, [performInitialCheck, loadSettings]);
  
  const processFile = (dataType: DataType, file: File) => {
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
            const metadata = await getImportMetadata();
            setImportMetadata(metadata);
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
                  const metadata = await getImportMetadata();
                  setImportMetadata(metadata);
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
    processFile(dataType, file);
    (event.target as HTMLInputElement).value = ''; 
  };
  
  const handleLinkFile = async (dataType: DataType) => {
      if (!('showOpenFilePicker' in window)) {
          alert("Your browser does not support this feature.");
          return;
      }
      try {
          const [handle] = await (window as any).showOpenFilePicker();
          await saveSetting(`linkedFile:${dataType}`, handle);
          setLinkedFiles(prev => new Map(prev).set(dataType, handle as FileSystemFileHandle));
          setStatusMessage({ text: t('settings.dataSources.linkSuccess'), type: 'success' });
          const file = await (handle as any).getFile();
          processFile(dataType, file);
      } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.error('Error linking file:', err);
            setStatusMessage({ text: t('settings.dataSources.linkError'), type: 'error' });
          }
      }
  };

  const handleReloadFile = async (dataType: DataType) => {
      const handle = linkedFiles.get(dataType);
      if (!handle) return;
      setIsLoading(true);
      try {
          const permission = await (handle as any).queryPermission({ mode: 'read' });
          if (permission === 'denied') {
              setStatusMessage({ text: t('settings.dataSources.permissionDenied'), type: 'error' });
              setIsLoading(false);
              return;
          }
          if (permission === 'prompt') {
              if ((await (handle as any).requestPermission({ mode: 'read' })) !== 'granted') {
                  setStatusMessage({ text: t('settings.dataSources.permissionNeeded'), type: 'error' });
                  setIsLoading(false);
                  return;
              }
          }
          const file = await handle.getFile();
          processFile(dataType, file);
      } catch (err) {
           console.error('Error reloading file:', err);
           setStatusMessage({ text: t('settings.dataSources.reloadError'), type: 'error' });
           setIsLoading(false);
      }
  };
  
  const handleClearLink = async (dataType: DataType) => {
      await deleteSetting(`linkedFile:${dataType}`);
      setLinkedFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(dataType);
          return newMap;
      });
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
        const metadata = await getImportMetadata();
        setImportMetadata(metadata);
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
      
      const newLinkedFiles = new Map();
      for (const [key, value] of linkedFiles.entries()) {
          newLinkedFiles.set(key, value);
      }
      for (const key of newLinkedFiles.keys()) {
          await handleClearLink(key);
      }
      
      setStatusMessage({ text: t('status.clear.clearedAll'), type: 'success' });
    } catch (error) {
      console.error("Failed to clear DB", error);
      setStatusMessage({ text: t('status.clear.clearAllError'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    localStorage.setItem('oms-session', JSON.stringify(session));
  };

  const handleLogout = () => {
    setUserSession(null);
    localStorage.removeItem('oms-session');
    setCurrentView('import');
  };

  const handleAddRdc = async (rdc: RDC) => {
    const newList = [...rdcList, rdc].sort((a,b) => a.id.localeCompare(b.id));
    setRdcList(newList);
    await saveRdcList(newList);
    setStatusMessage({ text: t('settings.rdcManagement.addSuccess'), type: 'success' });
  };
  
  const handleDeleteRdc = async (rdcId: string) => {
    const newList = rdcList.filter(r => r.id !== rdcId);
    setRdcList(newList);
    await saveRdcList(newList);
    setStatusMessage({ text: t('settings.rdcManagement.deleteSuccess'), type: 'success' });
  };
  
  const handleExportConfig = () => {
    const config = {
        rdcList: rdcList,
        exclusionList: {
            list: Array.from(exclusionList.list),
            lastUpdated: exclusionList.lastUpdated,
        },
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oms_config_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ text: t('settings.configManagement.exportSuccess'), type: 'success' });
  };

  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportConfig = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const config = JSON.parse(text);
        let importedSomething = false;

        if (config.rdcList && Array.isArray(config.rdcList)) {
            const rdcs = config.rdcList as RDC[];
            setRdcList(rdcs);
            await saveRdcList(rdcs);
            importedSomething = true;
        }

        if (config.exclusionList) {
            const exclusionArray = Array.isArray(config.exclusionList) 
                ? config.exclusionList 
                : (config.exclusionList.list || []);

            if (Array.isArray(exclusionArray)) {
                await saveExclusionList(exclusionArray as string[]);
                const reloadedList = await loadExclusionList();
                setExclusionList(reloadedList);
                importedSomething = true;
            }
        }
        
        if (importedSomething) {
             setStatusMessage({ text: t('settings.configManagement.importSuccess'), type: 'success' });
        } else {
            throw new Error("Invalid config file format");
        }
    } catch (e) {
        console.error("Config import failed", e);
        setStatusMessage({ text: t('settings.configManagement.importError'), type: 'error' });
    } finally {
        if(importFileInputRef.current) {
            importFileInputRef.current.value = '';
        }
    }
  };
  
  const handleExclusionImportClick = () => {
    exclusionFileInputRef.current?.click();
  };
  
  const handleImportExclusionList = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const productIds = text.split(/[\r\n]+/)
            .map(line => {
                const trimmed = line.trim();
                // Strip leading zeros from purely numeric IDs to match DB format
                if (/^\d+$/.test(trimmed)) {
                    return String(parseInt(trimmed, 10));
                }
                return trimmed;
            })
            .filter(Boolean);
            
        const uniqueIds = new Set(productIds);
        const idArray = Array.from(uniqueIds);
        await saveExclusionList(idArray);
        const reloadedList = await loadExclusionList();
        setExclusionList(reloadedList);
        setStatusMessage({ text: t('settings.exclusionList.importSuccess', { count: idArray.length }), type: 'success' });
    } catch (e) {
        console.error("Exclusion list import failed", e);
        setStatusMessage({ text: t('settings.exclusionList.importError'), type: 'error' });
    } finally {
        if(exclusionFileInputRef.current) {
            exclusionFileInputRef.current.value = '';
        }
    }
  }
  
  const handleClearExclusionList = async () => {
    if (confirm(t('settings.exclusionList.clearConfirm'))) {
        await clearExclusionList();
        const reloadedList = await loadExclusionList();
        setExclusionList(reloadedList);
        setStatusMessage({ text: t('settings.exclusionList.clearSuccess'), type: 'success' });
    }
  }

  const handleNavigateToSimulation = (warehouseId: string, fullProductId: string) => {
    setSimulationContext({ warehouseId, fullProductId });
    setCurrentView('simulations');
  };
  
  const handleStartWatchlist = (items: ReportResultItem[]) => {
      if (items.length === 0) return;
      setWatchlist(items);
      setWatchlistIndex(0);
      const firstItem = items[0];
      handleNavigateToSimulation(firstItem.warehouseId, firstItem.fullProductId);
  };
  
  const handleClearWatchlist = () => {
      setWatchlist([]);
      setWatchlistIndex(null);
  }

  const handleNavigateWatchlist = (direction: 1 | -1) => {
      if (watchlistIndex === null) return;
      
      const newIndex = watchlistIndex + direction;
      if (newIndex >= 0 && newIndex < watchlist.length) {
          setWatchlistIndex(newIndex);
          const nextItem = watchlist[newIndex];
          handleNavigateToSimulation(nextItem.warehouseId, nextItem.fullProductId);
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
            linkedFiles={linkedFiles}
            onReload={handleReloadFile}
            userSession={userSession}
          />
        );
      case 'data-preview':
        return <DataPreview userSession={userSession} />;
      case 'report':
        return <ThreatReportView 
            userSession={userSession}
            onNavigateToSimulation={handleNavigateToSimulation}
            onStartWatchlist={handleStartWatchlist}
        />;
      case 'status-report':
        return <StatusReportView 
            rdcList={rdcList} 
            exclusionList={exclusionList}
            onUpdateExclusionList={handleExclusionImportClick} 
        />;
      case 'dashboard':
        return (
          <div class={sharedStyles.placeholderView}>
            <h2>{t('placeholders.dashboard.title')}</h2>
            <p>{t('placeholders.dashboard.description')}</p>
          </div>
        );
      case 'simulations':
        return <SimulationView 
          userSession={userSession}
          initialParams={simulationContext}
          onSimulationStart={() => setSimulationContext(null)}
          watchlist={watchlist}
          watchlistIndex={watchlistIndex}
          onNavigateWatchlist={handleNavigateWatchlist}
          onClearWatchlist={handleClearWatchlist}
        />;
      case 'settings':
        return (
            <SettingsView 
                linkedFiles={linkedFiles}
                onLinkFile={handleLinkFile}
                onReloadFile={handleReloadFile}
                onClearLink={handleClearLink}
                isLoading={isLoading}
                userSession={userSession}
                rdcList={rdcList}
                onAddRdc={handleAddRdc}
                onDeleteRdc={handleDeleteRdc}
                onExportConfig={handleExportConfig}
                onImportClick={handleImportClick}
                exclusionList={exclusionList}
                onImportExclusionListClick={handleExclusionImportClick}
                onClearExclusionList={handleClearExclusionList}
            />
        );
      default:
        return null;
    }
  };

  if (!userSession) {
    return <LoginModal onLogin={handleLogin} rdcList={rdcList} />;
  }

  const hasAnyData = counts.products > 0 || counts.goodsReceipts > 0 || counts.openOrders > 0 || counts.sales > 0;
  const canAnalyze = counts.products > 0 && counts.goodsReceipts > 0 && counts.sales > 0;

  return (
    <>
      <header class="top-header">
        <h1>{t('header.title')}</h1>
        <div class="header-controls">
          <div class="header-session-info">
            <span>{t('header.session.mode')}: <strong>{userSession.mode === 'hq' ? 'HQ' : `${userSession.rdc!.id} ${userSession.rdc!.name}`}</strong></span>
            <button class="button-logout" onClick={handleLogout}>{t('header.session.logout')}</button>
          </div>
          <LanguageSelector />
        </div>
      </header>
      <div class="app-layout">
        <nav class="sidebar">
          <ul>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('import')}} class={currentView === 'import' ? 'active' : ''}>{t('sidebar.import')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('data-preview')}} class={currentView === 'data-preview' ? 'active' : ''}>{t('sidebar.dataPreview')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('report')}} class={currentView === 'report' ? 'active' : ''}>{t('sidebar.threatReport')}</a></li>
            {userSession.mode === 'hq' && (
              <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('status-report')}} class={currentView === 'status-report' ? 'active' : ''}>{t('sidebar.statusReport')}</a></li>
            )}
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('dashboard')}} class={currentView === 'dashboard' ? 'active' : ''}>{t('sidebar.dashboard')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('simulations')}} class={currentView === 'simulations' ? 'active' : ''}>{t('sidebar.simulations')}</a></li>
            <li><a href="#" onClick={(e) => {e.preventDefault(); setCurrentView('settings')}} class={currentView === 'settings' ? 'active' : ''}>{t('sidebar.settings')}</a></li>
          </ul>
          <div class="sidebar-footer">
              <p>Proof of Concept Supply Chain UK</p>
              <p>OMS - Outdate Mitigation System</p>
              <p>&copy; 2025 | Version 0.1</p>
          </div>
        </nav>
        <main class="main-content">
          <input type="file" ref={importFileInputRef} style={{ display: 'none' }} onChange={handleImportConfig} accept=".json" />
          <input type="file" ref={exclusionFileInputRef} style={{ display: 'none' }} onChange={handleImportExclusionList} accept=".txt" />
          {statusMessage && (
              <div class={`${sharedStyles.statusContainer} ${sharedStyles[statusMessage.type]}`} role="status">
                <div class={sharedStyles.statusInfo}>
                   {isLoading && statusMessage.type === 'info' && <div class={sharedStyles.spinner}></div>}
                   <div class={sharedStyles.statusContent}>
                      <p class={sharedStyles.statusText}>{statusMessage.text}</p>
                      {isLoading && typeof statusMessage.progress === 'number' && (
                        <div class={sharedStyles.progressBarContainer}>
                           <div class={sharedStyles.progressBar} style={{ width: `${statusMessage.progress}%` }}></div>
                        </div>
                      )}
                   </div>
                </div>
                 <button 
                  class={sharedStyles.statusCloseButton}
                  onClick={() => setStatusMessage(null)}
                  aria-label={t('status.close')}
                 >&times;</button>
              </div>
          )}
          <div class="content-wrapper">
            {renderContent()}
          </div>
          {currentView === 'import' && (
            <div class={sharedStyles.actionsContainer}>
              <button 
                  class={sharedStyles.buttonPrimary} 
                  disabled={!canAnalyze || isLoading}
                  onClick={() => setCurrentView('simulations')}
              >
                {t('actions.runAnalysis')}
              </button>
              {hasAnyData && !isLoading && (
                <button onClick={handleClearAllData} class={sharedStyles.buttonSecondary}>{t('actions.clearAll')}</button>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

render(<LanguageProvider><App /></LanguageProvider>, document.getElementById("root")!);

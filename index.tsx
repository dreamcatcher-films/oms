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
  addShcData,
  addPlanogramData,
  addOrgStructureData,
  addCategoryRelationData,
  clearShcData,
  clearPlanogramData,
  clearOrgStructureData,
  clearCategoryRelationData,
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
  DBStatus,
} from "./db";
import { LanguageProvider, useTranslation } from './i18n';
import Papa from "papaparse";
import { productRowMapper, goodsReceiptRowMapper, openOrderRowMapper, saleRowMapper } from './utils/parsing';
import { Status, View, DataType, RDC, UserSession, ReportResultItem, ExclusionListData, ShcDataType, ShcParsingWorkerMessage } from './utils/types';

import { LanguageSelector } from './components/LanguageSelector';
import { LoginModal } from './components/LoginModal';
import { ImportView } from './views/ImportView';
import { DataPreview } from './views/DataPreview';
import SimulationView from './views/SimulationView';
import { SettingsView } from './views/SettingsView';
import { ThreatReportView } from './views/ThreatReportView';
import { StatusReportView } from './views/StatusReportView';
import { ShcReportView } from './views/ShcReportView';
import { AutoRefreshControl } from './components/AutoRefreshControl';
import { RefreshCountdownModal } from './components/RefreshCountdownModal';
import { IdleSplashScreen } from './components/IdleSplashScreen';

import './styles/global.css';
import sharedStyles from './styles/shared.module.css';

const BATCH_SIZE = 5000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const REFRESH_COUNTDOWN_SECONDS = 10;

const App = () => {
  const { t, language } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<Status | null>({ text: 'Inicjalizacja aplikacji...', type: 'info' });
  
  const [counts, setCounts] = useState({ products: 0, goodsReceipts: 0, openOrders: 0, sales: 0, shc: 0, planogram: 0, orgStructure: 0, categoryRelation: 0 });
  const [importMetadata, setImportMetadata] = useState<ImportMetadata>({ products: null, goodsReceipts: null, openOrders: null, sales: null, shc: null, planogram: null, orgStructure: null, categoryRelation: null });
  const [linkedFiles, setLinkedFiles] = useState<Map<DataType, FileSystemFileHandle>>(new Map());
  
  const [currentView, setCurrentView] = useState<View>('import');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [rdcList, setRdcList] = useState<RDC[]>([]);
  
  const [simulationContext, setSimulationContext] = useState<{ warehouseId: string; fullProductId: string; } | null>(null);
  const [watchlist, setWatchlist] = useState<ReportResultItem[]>([]);
  const [watchlistIndex, setWatchlistIndex] = useState<number | null>(null);
  const [exclusionList, setExclusionList] = useState<ExclusionListData>({ list: new Set(), lastUpdated: null });

  // New features state
  const [isIdle, setIsIdle] = useState(false);
  const [autoRefreshConfig, setAutoRefreshConfig] = useState({ isEnabled: false, interval: 30 });
  const [timeToNextRefresh, setTimeToNextRefresh] = useState(0);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_COUNTDOWN_SECONDS);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const exclusionFileInputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  // Refs to get latest state inside interval without resetting it
  const isLoadingRef = useRef(isLoading);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  const showCountdownModalRef = useRef(showCountdownModal);
  useEffect(() => { showCountdownModalRef.current = showCountdownModal; }, [showCountdownModal]);

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
            let refreshConfig = null;
            for (const [key, value] of settings.entries()) {
                if (key.startsWith('linkedFile:')) {
                    const dataType = key.split(':')[1] as DataType;
                    const permission = await (value as any).queryPermission({ mode: 'read' });
                    if (permission === 'granted') {
                      fileHandles.set(dataType, value as FileSystemFileHandle);
                    }
                } else if (key === 'autoRefreshConfig') {
                    refreshConfig = value;
                }
            }
            if (refreshConfig) {
                setAutoRefreshConfig(refreshConfig);
                setTimeToNextRefresh(refreshConfig.interval * 60);
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
      const [{ productsCount, goodsReceiptsCount, openOrdersCount, salesCount, shcCount, planogramCount, orgStructureCount, categoryRelationCount }, metadata] = await Promise.all([
          checkDBStatus(),
          getImportMetadata()
      ]);
      setCounts({ products: productsCount, goodsReceipts: goodsReceiptsCount, openOrders: openOrdersCount, sales: salesCount, shc: shcCount, planogram: planogramCount, orgStructure: orgStructureCount, categoryRelation: categoryRelationCount });
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

    const clearOutdatedShcData = useCallback(async () => {
        const metadata = await getImportMetadata();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let clearedCount = 0;

        const checkAndClear = async (type: ShcDataType, clearFn: () => Promise<void>) => {
            const meta = metadata[type];
            if (meta?.lastImported) {
                const importDate = new Date(meta.lastImported);
                importDate.setHours(0, 0, 0, 0);
                if (importDate.getTime() < today.getTime()) {
                    await clearFn();
                    clearedCount++;
                }
            }
        };

        await Promise.all([
            checkAndClear('shc', clearShcData),
            checkAndClear('planogram', clearPlanogramData),
            checkAndClear('orgStructure', clearOrgStructureData),
            checkAndClear('categoryRelation', clearCategoryRelationData)
        ]);
        
        if (clearedCount > 0) {
            setStatusMessage({ text: t('status.clear.outdatedShcCleared'), type: 'info' });
        }
    }, [t]);

  // --- Idle Timeout Logic ---
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
        setIsIdle(true);
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
    const eventHandler = () => resetIdleTimer();

    events.forEach(event => window.addEventListener(event, eventHandler));
    resetIdleTimer();

    return () => {
        events.forEach(event => window.removeEventListener(event, eventHandler));
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  const handleContinueFromIdle = () => {
    setIsIdle(false);
    resetIdleTimer();
  };

  const triggerAutoRefresh = useCallback(async () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    setShowCountdownModal(false);
    setStatusMessage({ text: t('status.autoRefresh.starting'), type: 'info' });
    let allRefreshed = true;
    for (const dataType of linkedFiles.keys()) {
        try {
            await handleReloadFile(dataType, true);
        } catch (e) {
            allRefreshed = false;
        }
    }
    if (allRefreshed) {
        setStatusMessage({ text: t('status.autoRefresh.complete'), type: 'success' });
    }
    setTimeToNextRefresh(autoRefreshConfig.interval * 60);
  }, [linkedFiles, autoRefreshConfig.interval, t]);

  useEffect(() => {
    const clearTimer = () => {
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
        }
    };

    if (autoRefreshConfig.isEnabled && linkedFiles.size > 0 && userSession) {
        refreshIntervalRef.current = window.setInterval(() => {
            setTimeToNextRefresh(prev => {
                if (isLoadingRef.current) {
                    return prev; // Pause timer while app is loading
                }
                const newTime = prev - 1;
                if (newTime <= REFRESH_COUNTDOWN_SECONDS && !showCountdownModalRef.current) {
                    setShowCountdownModal(true);
                }
                if (newTime <= 0) {
                    clearTimer();
                    triggerAutoRefresh();
                    return 0;
                }
                return newTime;
            });
        }, 1000);
    } else {
        clearTimer();
    }
    return clearTimer;
  }, [autoRefreshConfig.isEnabled, linkedFiles.size, userSession, triggerAutoRefresh]);

  useEffect(() => {
      if (showCountdownModal) {
          setCountdown(REFRESH_COUNTDOWN_SECONDS);
          countdownTimerRef.current = window.setInterval(() => {
              setCountdown(prev => {
                  if (prev <= 1) {
                      clearInterval(countdownTimerRef.current!);
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      }
      return () => { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current) };
  }, [showCountdownModal]);

  const handleCancelRefresh = () => {
      setShowCountdownModal(false);
      setTimeToNextRefresh(autoRefreshConfig.interval * 60);
      setStatusMessage({ text: t('status.autoRefresh.cancelled'), type: 'info' });
  };
  
  const handleAutoRefreshConfigChange = async (newConfig: { isEnabled: boolean, interval: number }) => {
      setAutoRefreshConfig(newConfig);
      setTimeToNextRefresh(newConfig.interval * 60);
      await saveSetting('autoRefreshConfig', newConfig);
  };


  useEffect(() => {
    const savedSession = localStorage.getItem('oms-session');
    if(savedSession) {
        setUserSession(JSON.parse(savedSession));
    }
    clearOutdatedShcData().then(performInitialCheck).then(loadSettings);
  }, [performInitialCheck, loadSettings, clearOutdatedShcData]);
  
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

  const handleReloadFile = async (dataType: DataType, isAuto: boolean = false) => {
      const handle = linkedFiles.get(dataType);
      if (!handle) return Promise.reject();
      
      if (!isAuto) setIsLoading(true);

      try {
          const permission = await (handle as any).queryPermission({ mode: 'read' });
          if (permission === 'denied') {
              setStatusMessage({ text: t('settings.dataSources.permissionDenied'), type: 'error' });
              if (!isAuto) setIsLoading(false);
              return Promise.reject();
          }
          if (permission === 'prompt') {
              if ((await (handle as any).requestPermission({ mode: 'read' })) !== 'granted') {
                  setStatusMessage({ text: t('settings.dataSources.permissionNeeded'), type: 'error' });
                  if (!isAuto) setIsLoading(false);
                  return Promise.reject();
              }
          }
          const file = await (handle as any).getFile();
          processFile(dataType, file);
          return Promise.resolve();
      } catch (e) {
          console.error(`Could not read file for ${dataType}`, e);
          setStatusMessage({ text: t('settings.dataSources.reloadError'), type: 'error' });
          if (!isAuto) setIsLoading(false);
          return Promise.reject();
      }
  };

  const handleClearFile = async (dataType: DataType) => {
      // It's good practice to add a confirmation step for destructive actions.
      // Assuming a simple confirm for now.
      if (!confirm(`Are you sure you want to clear all ${t(`dataType.${dataType}`)} data? This cannot be undone.`)) return;

      setIsLoading(true);
      setStatusMessage({ text: t('status.clear.clearing', { dataTypeName: t(`dataType.${dataType}`) }), type: 'info' });
      try {
          switch (dataType) {
              case 'products': await clearProducts(); break;
              case 'goodsReceipts': await clearGoodsReceipts(); break;
              case 'openOrders': await clearOpenOrders(); break;
              case 'sales': await clearSales(); break;
          }
          // After clearing, re-check the DB status to update counts
          await performInitialCheck();
          setStatusMessage({ text: t('status.clear.cleared', { dataTypeName: t(`dataType.${dataType}`) }), type: 'success' });
      } catch (error) {
          console.error(`Error clearing ${dataType}`, error);
          setStatusMessage({ text: t('status.clear.clearError', { dataTypeName: t(`dataType.${dataType}`) }), type: 'error' });
      } finally {
          setIsLoading(false);
      }
  };

  const handleClearLink = async (dataType: DataType) => {
    if (!confirm(t('settings.dataSources.clearLinkConfirm'))) return;
    try {
        await deleteSetting(`linkedFile:${dataType}`);
        setLinkedFiles(prev => {
            const newMap = new Map(prev);
            newMap.delete(dataType);
            return newMap;
        });
        setStatusMessage({ text: t('settings.dataSources.linkClearedSuccess'), type: 'success' });
    } catch (err) {
        console.error('Error clearing link:', err);
        setStatusMessage({ text: t('settings.dataSources.linkClearedError'), type: 'error' });
    }
  };
  
  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear ALL data? This will remove products, receipts, orders, and sales data permanently.")) return;
    setIsLoading(true);
    setStatusMessage({ text: t('status.clear.clearingAll'), type: 'info' });
    try {
      await clearAllData();
      await performInitialCheck();
      setLinkedFiles(new Map());
      setStatusMessage({ text: t('status.clear.clearedAll'), type: 'success' });
    } catch (error) {
      console.error("Error clearing all data", error);
      setStatusMessage({ text: t('status.clear.clearAllError'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const complexShcFileParse = (dataType: ShcDataType, file: File) => {
    setIsLoading(true);
    const dataTypeName = t(`dataType.${dataType}`);
    setStatusMessage({ text: t('status.import.preparing', { dataTypeName }), type: 'info', progress: 0 });

    const worker = new Worker(new URL('./shc-parsing.worker.ts', import.meta.url), { type: 'module' });
    
    let processedCount = 0;
    let totalRowsFromFile = 0;
    const initialCountForDisplay = counts[dataType] || 0;

    worker.onmessage = async (e: MessageEvent<ShcParsingWorkerMessage>) => {
      const { type, payload } = e.data;

      switch (type) {
        case 'progress':
          setStatusMessage(prev => ({ ...prev!, text: payload.message, type: 'info' }));
          break;
        
        case 'data':
          const batch = payload;
          const addDbFn = {
            'shc': addShcData,
            'planogram': addPlanogramData,
            'orgStructure': addOrgStructureData,
            'categoryRelation': addCategoryRelationData,
          }[dataType];

          await addDbFn(batch);
          processedCount += batch.length;
          
          const runningTotal = (dataType === 'shc' ? initialCountForDisplay : 0) + processedCount;
          
          setStatusMessage(prev => ({
            ...prev!,
            text: t('status.import.processing', { processedCount: runningTotal.toLocaleString(language) }),
            type: 'info',
            progress: totalRowsFromFile > 0 ? (processedCount / totalRowsFromFile) * 100 : (prev?.progress || 0),
          }));
          break;

        case 'complete':
          totalRowsFromFile = payload.totalRows;
          await updateImportMetadata(dataType);
          
          const finalDbStatus = await checkDBStatus();
          const finalMetadata = await getImportMetadata();
          const finalCounts = {
            products: finalDbStatus.productsCount,
            goodsReceipts: finalDbStatus.goodsReceiptsCount,
            openOrders: finalDbStatus.openOrdersCount,
            sales: finalDbStatus.salesCount,
            shc: finalDbStatus.shcCount,
            planogram: finalDbStatus.planogramCount,
            orgStructure: finalDbStatus.orgStructureCount,
            categoryRelation: finalDbStatus.categoryRelationCount
          };
          setCounts(finalCounts);
          setImportMetadata(finalMetadata);
          
          setStatusMessage({ 
              text: t('status.import.complete', { processedCount: finalCounts[dataType].toLocaleString(language), dataTypeName }), 
              type: 'success',
              progress: 100
          });
          setIsLoading(false);
          worker.terminate();
          break;

        case 'error':
          console.error(`Error from SHC parsing worker for ${dataTypeName}`, payload);
          setStatusMessage({ text: `${t('status.import.parseError', { dataTypeName })}: ${payload}`, type: 'error' });
          setIsLoading(false);
          worker.terminate();
          break;
      }
    };
    
    worker.onerror = (err) => {
        console.error(`Unhandled error in SHC parsing worker for ${dataTypeName}`, err);
        setStatusMessage({ text: t('status.import.parseError', { dataTypeName }), type: 'error' });
        setIsLoading(false);
        worker.terminate();
    };

    (async () => {
        try {
            if (dataType !== 'shc') {
                const clearDbFn = {
                    'planogram': clearPlanogramData,
                    'orgStructure': clearOrgStructureData,
                    'categoryRelation': clearCategoryRelationData,
                }[dataType];
                await clearDbFn();
                setCounts(prev => ({ ...prev, [dataType]: 0 }));
            }
            
            worker.postMessage({ dataType, file });

        } catch (err) {
            console.error(`Error preparing for SHC file import for ${dataTypeName}`, err);
            setStatusMessage({ text: t('status.import.clearError'), type: 'error' });
            setIsLoading(false);
            worker.terminate();
        }
    })();
  };
  
  const handleShcFileSelect = (dataType: ShcDataType, event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    complexShcFileParse(dataType, file);
    (event.target as HTMLInputElement).value = ''; 
  };

  const handleClearShcFile = async (dataType: ShcDataType) => {
      if (!confirm(`Are you sure you want to clear all ${t(`dataType.${dataType}`)} data? This cannot be undone.`)) return;

      setIsLoading(true);
      setStatusMessage({ text: t('status.clear.clearing', { dataTypeName: t(`dataType.${dataType}`) }), type: 'info' });
      try {
          switch (dataType) {
              case 'shc': await clearShcData(); break;
              case 'planogram': await clearPlanogramData(); break;
              case 'orgStructure': await clearOrgStructureData(); break;
              case 'categoryRelation': await clearCategoryRelationData(); break;
          }
          await performInitialCheck();
          setStatusMessage({ text: t('status.clear.cleared', { dataTypeName: t(`dataType.${dataType}`) }), type: 'success' });
      } catch (error) {
          console.error(`Error clearing ${dataType}`, error);
          setStatusMessage({ text: t('status.clear.clearError', { dataTypeName: t(`dataType.${dataType}`) }), type: 'error' });
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleLogin = (session: UserSession) => {
    localStorage.setItem('oms-session', JSON.stringify(session));
    setUserSession(session);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('oms-session');
    setUserSession(null);
    setCurrentView('import');
  };

  const handleNavigate = (view: View) => {
      setSimulationContext(null); // Clear context when navigating manually
      setCurrentView(view);
  };

  const handleNavigateToSimulation = (warehouseId: string, fullProductId: string) => {
      setSimulationContext({ warehouseId, fullProductId });
      setCurrentView('simulations');
  };
  
  const handleStartWatchlist = (items: ReportResultItem[]) => {
      setWatchlist(items);
      setWatchlistIndex(0);
      if (items.length > 0) {
          const firstItem = items[0];
          handleNavigateToSimulation(firstItem.warehouseId, firstItem.fullProductId);
      }
  };

  const handleNavigateWatchlist = (direction: 1 | -1) => {
      if (watchlistIndex === null) return;
      const newIndex = watchlistIndex + direction;
      if (newIndex >= 0 && newIndex < watchlist.length) {
          setWatchlistIndex(newIndex);
          const item = watchlist[newIndex];
          handleNavigateToSimulation(item.warehouseId, item.fullProductId);
      }
  };

  const handleClearWatchlist = () => {
      setWatchlist([]);
      setWatchlistIndex(null);
  };
  
  // Render logic
  const renderView = () => {
      switch (currentView) {
          case 'import':
              return <ImportView
                isLoading={isLoading}
                importMetadata={importMetadata}
                counts={counts}
                onFileSelect={handleFileSelect}
                onClear={handleClearFile}
                onClearShcFile={handleClearShcFile}
                onShcFileSelect={handleShcFileSelect}
                linkedFiles={linkedFiles}
                onReload={handleReloadFile}
                userSession={userSession}
                onLinkFile={handleLinkFile}
                onClearLink={handleClearLink}
                onClearAll={handleClearAll}
              />;
          case 'data-preview':
              return <DataPreview userSession={userSession} />;
          case 'threat-report':
              return userSession?.mode === 'hq' ? 
                <ThreatReportView 
                    userSession={userSession} 
                    onNavigateToSimulation={handleNavigateToSimulation}
                    onStartWatchlist={handleStartWatchlist}
                /> : 
                <div class={sharedStyles['placeholder-view']}><h2>{t('placeholders.report.title')}</h2><p>{t('placeholders.report.accessDenied')}</p></div>;
          case 'status-report':
                return <StatusReportView rdcList={rdcList} exclusionList={exclusionList} onUpdateExclusionList={() => {}} />;
          case 'shc-report':
                return <ShcReportView counts={counts} />;
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
              return <SettingsView 
                linkedFiles={linkedFiles} 
                onLinkFile={handleLinkFile}
                onReloadFile={handleReloadFile}
                onClearLink={handleClearLink}
                isLoading={isLoading}
                userSession={userSession}
                rdcList={rdcList}
                onAddRdc={() => {}}
                onDeleteRdc={() => {}}
                onExportConfig={() => {}}
                onImportClick={() => {}}
                exclusionList={exclusionList}
                onImportExclusionListClick={() => {}}
                onClearExclusionList={() => {}}
              />;
          default:
              return <div class={sharedStyles['placeholder-view']}><h2>{t('placeholders.dashboard.title')}</h2><p>{t('placeholders.dashboard.description')}</p></div>;
      }
  };

  return (
    <>
      {isIdle && <IdleSplashScreen onContinue={handleContinueFromIdle} />}
      {!userSession ? (
        <LoginModal onLogin={handleLogin} rdcList={rdcList} />
      ) : (
        <>
          {showCountdownModal && <RefreshCountdownModal countdown={countdown} onCancel={handleCancelRefresh} />}
          <div class={`app-container ${isLoading ? sharedStyles['app-loading-blur'] : ''}`}>
            <header class="top-header">
                <h1>{t('header.title')}</h1>
                <div class="header-controls">
                    <AutoRefreshControl 
                        config={autoRefreshConfig}
                        onConfigChange={handleAutoRefreshConfigChange}
                        timeToNextRefresh={timeToNextRefresh}
                    />
                    <div class="header-session-info">
                        <span>{t('header.session.mode')}: <strong>{userSession.mode.toUpperCase()} {userSession.rdc ? `(${userSession.rdc.name})` : ''}</strong></span>
                        <button class="button-logout" onClick={handleLogout}>{t('header.session.logout')}</button>
                    </div>
                    <LanguageSelector />
                </div>
            </header>
            <div class="app-layout">
                <nav class="sidebar">
                    <ul>
                        <li><a href="#" class={currentView === 'import' ? 'active' : ''} onClick={() => handleNavigate('import')}>{t('sidebar.import')}</a></li>
                        <li><a href="#" class={currentView === 'data-preview' ? 'active' : ''} onClick={() => handleNavigate('data-preview')}>{t('sidebar.dataPreview')}</a></li>
                        <li><a href="#" class={currentView === 'threat-report' ? 'active' : ''} onClick={() => handleNavigate('threat-report')}>{t('sidebar.threatReport')}</a></li>
                        <li><a href="#" class={currentView === 'status-report' ? 'active' : ''} onClick={() => handleNavigate('status-report')}>{t('sidebar.statusReport')}</a></li>
                        <li><a href="#" class={currentView === 'shc-report' ? 'active' : ''} onClick={() => handleNavigate('shc-report')}>{t('sidebar.shcReport')}</a></li>
                        <li><a href="#" class={currentView === 'simulations' ? 'active' : ''} onClick={() => handleNavigate('simulations')}>{t('sidebar.simulations')}</a></li>
                        <li><a href="#" class={currentView === 'settings' ? 'active' : ''} onClick={() => handleNavigate('settings')}>{t('sidebar.settings')}</a></li>
                    </ul>
                    <div class="sidebar-footer">
                        <p><strong>OMS</strong></p>
                        <p>{t('sidebar.footer.version', { version: '0.3.0' })}</p>
                    </div>
                </nav>
                <main class="main-content">
                  <div class="content-wrapper">
                    {statusMessage && (
                      <div class={`${sharedStyles['status-container']} ${sharedStyles[statusMessage.type]}`} role="alert">
                          <div class={sharedStyles['status-info']}>
                              <div class={sharedStyles['status-content']}>
                                  <p class={sharedStyles['status-text']}>{statusMessage.text}</p>
                                  {typeof statusMessage.progress === 'number' && (
                                      <div class={sharedStyles['progress-bar-container']}>
                                          <div class={sharedStyles['progress-bar']} style={{ width: `${statusMessage.progress}%` }}></div>
                                      </div>
                                  )}
                              </div>
                          </div>
                          <button class={sharedStyles['status-close-button']} onClick={() => setStatusMessage(null)} aria-label={t('status.close')}>&times;</button>
                      </div>
                    )}
                    {renderView()}
                  </div>
                </main>
            </div>
          </div>
        </>
      )}
    </>
  );
};

render(<LanguageProvider><App /></LanguageProvider>, document.getElementById("root") as HTMLElement);

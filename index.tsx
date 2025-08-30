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
  saveExclusionList,
  loadExclusionList,
  clearExclusionList,
  saveShcExclusionList,
  loadShcExclusionList as loadShcExclusionListDb,
  clearShcExclusionList as clearShcExclusionListDb,
  DBStatus,
  saveShcBaselineData,
  saveShcPreviousWeekData,
  Product,
  GoodsReceipt,
  OpenOrder,
  addWriteOffsWeekly,
  clearWriteOffsWeekly,
  addWriteOffsYTD,
  clearWriteOffsYTD,
  saveWriteOffsTargets,
  clearWriteOffsTargets,
  WriteOffsTarget,
  WriteOffsActual,
  saveDooList,
  clearDooList,
  DirectorOfOperations
} from "./db";
import { LanguageProvider, useTranslation } from './i18n';
import Papa from "papaparse";
import { productRowMapper, goodsReceiptRowMapper, openOrderRowMapper, saleRowMapper, writeOffsActualRowMapper } from './utils/parsing';
import { Status, View, DataType, RDC, UserSession, ReportResultItem, ExclusionListData, ShcDataType, ShcParsingWorkerMessage, ShcSnapshot } from './utils/types';

import { LanguageSelector } from './components/LanguageSelector';
import { LoginModal } from './components/LoginModal';
import { ImportView } from './views/ImportView';
import { DataPreview } from './views/DataPreview';
import SimulationView from './views/SimulationView';
import { SettingsView } from './views/SettingsView';
import { ThreatReportView } from './views/ThreatReportView';
import { StatusReportView } from './views/StatusReportView';
import { ShcReportView } from './views/ShcReportView';
import { WriteOffsReportView } from './views/WriteOffsReportView';
import { AutoRefreshControl } from './components/AutoRefreshControl';
import { RefreshCountdownModal } from './components/RefreshCountdownModal';
import { IdleSplashScreen } from './components/IdleSplashScreen';
import { Console, LogEntry } from './components/Console';


import './styles/global.css';
import sharedStyles from './styles/shared.module.css';

const BATCH_SIZE = 5000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const REFRESH_COUNTDOWN_SECONDS = 10;
const MAX_LOGS = 200;

const App = () => {
  const { t, language } = useTranslation();
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<Status | null>({ text: 'Inicjalizacja aplikacji...', type: 'info' });
  
  const [counts, setCounts] = useState({ products: 0, goodsReceipts: 0, openOrders: 0, sales: 0, shc: 0, planogram: 0, orgStructure: 0, categoryRelation: 0, writeOffsWeekly: 0, writeOffsYTD: 0, writeOffsTargets: 0 });
  const [importMetadata, setImportMetadata] = useState<ImportMetadata>({ products: null, goodsReceipts: null, openOrders: null, sales: null, shc: null, planogram: null, orgStructure: null, categoryRelation: null, writeOffsWeekly: null, writeOffsYTD: null });
  const [linkedFiles, setLinkedFiles] = useState<Map<DataType, FileSystemFileHandle>>(new Map());
  
  const [currentView, setCurrentView] = useState<View>('import');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [rdcList, setRdcList] = useState<RDC[]>([]);
  
  const [simulationContext, setSimulationContext] = useState<{ warehouseId: string; fullProductId: string; } | null>(null);
  const [watchlist, setWatchlist] = useState<ReportResultItem[]>([]);
  const [watchlistIndex, setWatchlistIndex] = useState<number | null>(null);
  const [exclusionList, setExclusionList] = useState<ExclusionListData>({ list: new Set(), lastUpdated: null });
  const [shcExclusionList, setShcExclusionList] = useState<Set<string>>(new Set());

  // New features state
  const [isIdle, setIsIdle] = useState(false);
  const [autoRefreshConfig, setAutoRefreshConfig] = useState({ isEnabled: false, interval: 30 });
  const [timeToNextRefresh, setTimeToNextRefresh] = useState(0);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_COUNTDOWN_SECONDS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const exclusionFileInputRef = useRef<HTMLInputElement>(null);
  const shcExclusionFileInputRef = useRef<HTMLInputElement>(null);
  const configImportInputRef = useRef<HTMLInputElement>(null);
  const shcBaselineInputRef = useRef<HTMLInputElement>(null);
  const shcPreviousWeekInputRef = useRef<HTMLInputElement>(null);
  const writeOffsTargetsInputRef = useRef<HTMLInputElement>(null);
  const dooFileInputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const shcParsingWorkerRef = useRef<Worker | null>(null);

  // Refs to get latest state inside interval without resetting it
  const isLoadingRef = useRef(isLoading);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  const showCountdownModalRef = useRef(showCountdownModal);
  useEffect(() => { showCountdownModalRef.current = showCountdownModal; }, [showCountdownModal]);
  
  useEffect(() => {
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
    };

    const createLogger = (level: LogEntry['level']) => (...args: any[]) => {
        originalConsole[level](...args);
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        setLogs(prevLogs => [...prevLogs, { timestamp, level, message: args }].slice(-MAX_LOGS));
    };

    console.log = createLogger('log');
    console.warn = createLogger('warn');
    console.error = createLogger('error');

    return () => {
        console.log = originalConsole.log;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
    };
  }, []);

  const initializeApp = useCallback(async () => {
    console.log('[App] Starting initialization...');
    
    try {
        console.log('[App] 1. Initializing SHC parsing worker...');
        shcParsingWorkerRef.current = new Worker(new URL('./shc-parsing.worker.ts', import.meta.url), { type: 'module' });
        console.log('[App]    Worker initialized.');

        console.log('[App] 2. Loading and validating session...');
        const savedSession = localStorage.getItem('oms-session');
        if (savedSession) {
            try {
                const parsed = JSON.parse(savedSession);
                if (parsed && parsed.mode === 'hq') {
                    setUserSession({ mode: 'hq' });
                    console.log('[App]    HQ session loaded successfully.');
                } else if (parsed && parsed.mode === 'rdc' && parsed.rdc && typeof parsed.rdc.id === 'string' && typeof parsed.rdc.name === 'string') {
                    setUserSession({ mode: 'rdc', rdc: { id: parsed.rdc.id, name: parsed.rdc.name } });
                    console.log(`[App]    RDC session for ${parsed.rdc.id} loaded successfully.`);
                } else {
                    console.warn("[App]    Invalid session data found. Clearing.");
                    localStorage.removeItem('oms-session');
                }
            } catch (e) {
                console.error("[App]    Failed to parse session, clearing.", e);
                localStorage.removeItem('oms-session');
            }
        } else {
            console.log('[App]    No session found.');
        }

        console.log('[App] 3. Loading all settings...');
        await loadSettings();
        console.log('[App]    Settings loaded.');

        console.log('[App] 4. Performing initial DB check...');
        await performInitialCheck();
        console.log('[App]    DB check complete.');
        
        console.log('[App] 5. Clearing outdated SHC data...');
        await clearOutdatedShcData();
        console.log('[App]    Outdated data check complete.');

    } catch(e) {
        console.error("[App] A critical error occurred during initialization:", e);
        setStatusMessage({ text: 'A critical error occurred. Please refresh the page.', type: 'error' });
    } finally {
        setIsInitializing(false);
        console.log('[App] Initialization complete.');
    }
  }, []);

  useEffect(() => {
    initializeApp();
    
    return () => {
        shcParsingWorkerRef.current?.terminate();
    };
  }, [initializeApp]);

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
                    if (value) {
                      const permission = await (value as any).queryPermission({ mode: 'read' });
                      if (permission === 'granted') {
                        fileHandles.set(dataType, value as FileSystemFileHandle);
                      }
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
    const [rdcs, shcExclusions, exclusionListData] = await Promise.all([loadRdcList(), loadShcExclusionListDb(), loadExclusionList()]);
    setRdcList(rdcs);
    setShcExclusionList(shcExclusions);
    setExclusionList(exclusionListData);
  }, []);
  
  const performInitialCheck = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage({ text: t('status.checkingDb'), type: 'info' });
    try {
      const [dbStatus, metadata] = await Promise.all([
          checkDBStatus(),
          getImportMetadata()
      ]);
      setCounts({
        products: dbStatus.productsCount,
        goodsReceipts: dbStatus.goodsReceiptsCount,
        openOrders: dbStatus.openOrdersCount,
        sales: dbStatus.salesCount,
        shc: dbStatus.shcCount,
        planogram: dbStatus.planogramCount,
        orgStructure: dbStatus.orgStructureCount,
        categoryRelation: dbStatus.categoryRelationCount,
        writeOffsWeekly: dbStatus.writeOffsWeeklyCount,
        writeOffsYTD: dbStatus.writeOffsYTDCount,
        writeOffsTargets: dbStatus.writeOffsTargetsCount,
      });
      setImportMetadata(metadata);

      if (dbStatus.productsCount > 0 || dbStatus.goodsReceiptsCount > 0 || dbStatus.openOrdersCount > 0 || dbStatus.salesCount > 0) {
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

  // --- File Processing Logic ---
  const processFile = useCallback(async <T extends Product | Sale | GoodsReceipt | OpenOrder | WriteOffsActual>(
    file: File,
    dataType: DataType,
    rowMapper: (row: any) => T | null,
    addFunction: (data: T[]) => Promise<void>,
    clearFunction: () => Promise<void>,
    options: { hasHeader: boolean; delimiter?: string }
  ) => {
    setIsLoading(true);
    const dataTypeName = t(`dataType.${dataType}`);
    console.log(`[App] Starting file processing for: ${dataTypeName}`);
    setStatusMessage({ text: t('status.import.preparing', { dataTypeName }), type: 'info' });

    try {
      console.log(`[App] Clearing old data for ${dataTypeName}...`);
      await clearFunction();
      console.log(`[App] Old data for ${dataTypeName} cleared.`);
    } catch (error) {
      console.error("Failed to clear old data", error);
      setStatusMessage({ text: t('status.clear.clearError', { dataTypeName }), type: 'error' });
      setIsLoading(false);
      return;
    }
    
    setStatusMessage({ text: t('status.import.starting', { dataTypeName }), type: 'info' });
    let processedCount = 0;

    const isDoubleHeader = dataType === 'products' || dataType === 'goodsReceipts' || dataType === 'openOrders';

    // Use a more robust, non-streaming approach for double-header files.
    if (isDoubleHeader) {
        console.log(`[App] Using double-header logic for ${dataTypeName}.`);
        return new Promise<void>((resolve, reject) => {
            Papa.parse<string[]>(file, {
                header: false,
                skipEmptyLines: true,
                complete: async (results: Papa.ParseResult<string[]>, _file: File) => {
                    try {
                        console.log(`[App] PapaParse complete for ${dataTypeName}. Received ${results.data.length} total rows.`);
                        if (results.errors.length > 0) {
                            console.error('[App] PapaParse encountered errors:', results.errors);
                        }
                        if (results.data.length > 3) {
                            console.log('[App] First 3 raw rows from parser:', JSON.stringify(results.data.slice(0, 3)));
                        }

                        if (results.data.length < 2) {
                            throw new Error("File format error: expected at least two header rows.");
                        }
                        
                        const headerRow1 = results.data[0];
                        const headerRow2 = results.data[1];
                        const headers = headerRow1.map((h1, i) => {
                            const h2 = headerRow2[i] || '';
                            return (h1.trim() + ' ' + h2.trim()).trim();
                        });
                        
                        console.log('[App] Combined headers:', headers);
                        
                        let dataRows = results.data.slice(2);
                        dataRows = dataRows.filter(row => row.some(cell => cell && cell.trim() !== ''));
                        
                        console.log(`[App] Found ${dataRows.length} data rows to process after filtering.`);

                        if (dataRows.length === 0) {
                            console.warn('[App] No data rows found after headers.');
                            await updateImportMetadata(dataType);
                            setStatusMessage({ text: t('status.import.complete', { processedCount: 0, dataTypeName }), type: 'success' });
                            await performInitialCheck();
                            resolve();
                            return;
                        }

                        const mappedData = dataRows
                            .map((rowArray, rowIndex) => {
                                const rowObject: { [key: string]: string } = {};
                                headers.forEach((header, i) => {
                                    if (header) { 
                                        rowObject[header] = rowArray[i];
                                    }
                                });
                                if (rowIndex === 0) {
                                    console.log('[App] First constructed row object:', rowObject);
                                }
                                return rowObject;
                            })
                            .map((rowObject, rowIndex) => {
                                const mappedRow = rowMapper(rowObject);
                                if (rowIndex === 0) {
                                    console.log('[App] First row object after mapping:', mappedRow);
                                }
                                return mappedRow;
                            })
                            .filter((item): item is T => item !== null);
                        
                        console.log(`[App] Total valid mapped rows for ${dataTypeName}: ${mappedData.length}`);
                        
                        for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
                            const batch = mappedData.slice(i, i + BATCH_SIZE);
                            await addFunction(batch);
                            processedCount += batch.length;
                            setStatusMessage({
                                text: t('status.import.processing', { processedCount: processedCount.toLocaleString(language) }),
                                type: 'info',
                            });
                        }

                        console.log(`[App] Finished adding data to DB for ${dataTypeName}.`);
                        await updateImportMetadata(dataType);
                        setStatusMessage({ text: t('status.import.complete', { processedCount: processedCount.toLocaleString(language), dataTypeName }), type: 'success' });
                        await performInitialCheck();
                        resolve();

                    } catch (e) {
                        console.error(`[App] Error processing double-header file for ${dataTypeName}:`, e);
                        setStatusMessage({ text: t('status.import.parseError', { dataTypeName }), type: 'error' });
                        setIsLoading(false);
                        reject(e);
                    }
                },
                error: (error: Error, _file: File) => {
                    console.error(`[App] PapaParse critical error for ${dataTypeName}:`, error);
                    setStatusMessage({ text: t('status.import.parseError', { dataTypeName }), type: 'error' });
                    setIsLoading(false);
                    reject(error);
                }
            });
        });
    }


    // Use efficient streaming with a worker for standard files.
    return new Promise<void>((resolve, reject) => {
        console.log(`[App] Using streaming logic for ${dataTypeName}.`);
        Papa.parse<any>(file, {
            worker: true,
            header: options.hasHeader,
            skipEmptyLines: true,
            delimiter: options.delimiter,
            chunk: async (results: Papa.ParseResult<any>) => {
                console.log(`[App] Received chunk for ${dataTypeName}. Rows: ${results.data.length}, Errors: ${results.errors.length}`);
                if (results.errors.length > 0) {
                    console.error('[App] PapaParse chunk errors:', results.errors.slice(0, 5));
                }

                const mappedBatch = results.data.map((row, rowIndex) => {
                    const mappedRow = rowMapper(row);
                    if (rowIndex === 0) {
                        console.log('[App] First row in chunk (raw):', row);
                        console.log('[App] First row in chunk (mapped):', mappedRow);
                    }
                    return mappedRow;
                }).filter((item): item is T => item !== null);

                console.log(`[App] Mapped chunk to ${mappedBatch.length} valid items.`);

                if (mappedBatch.length > 0) {
                  await addFunction(mappedBatch);
                  processedCount += mappedBatch.length;
                  setStatusMessage({ text: t('status.import.processing', { processedCount: processedCount.toLocaleString(language) }), type: 'info' });
                }
            },
            complete: async () => {
                console.log(`[App] Streaming complete for ${dataTypeName}. Total processed: ${processedCount}`);
                await updateImportMetadata(dataType);
                setStatusMessage({ text: t('status.import.complete', { processedCount: processedCount.toLocaleString(language), dataTypeName }), type: 'success' });
                await performInitialCheck();
                resolve();
            },
            error: (error: Error) => {
                console.error(`[App] PapaParse critical streaming error for ${dataTypeName}:`, error);
                setStatusMessage({ text: t('status.import.parseError', { dataTypeName }), type: 'error' });
                setIsLoading(false);
                reject(error);
            }
        });
    });
  }, [t, language, performInitialCheck]);

  const handleFileSelect = useCallback(async (dataType: DataType, event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        switch (dataType) {
            case 'products':
                await processFile(file, 'products', productRowMapper, addProducts, clearProducts, { hasHeader: true });
                break;
            case 'goodsReceipts':
                await processFile(file, 'goodsReceipts', goodsReceiptRowMapper, addGoodsReceipts, clearGoodsReceipts, { hasHeader: true });
                break;
            case 'openOrders':
                await processFile(file, 'openOrders', openOrderRowMapper, addOpenOrders, clearOpenOrders, { hasHeader: true });
                break;
            case 'sales':
                await processFile(file, 'sales', saleRowMapper, addSales, clearSales, { hasHeader: false });
                break;
            case 'writeOffsWeekly':
                await processFile(file, 'writeOffsWeekly', writeOffsActualRowMapper, addWriteOffsWeekly, clearWriteOffsWeekly, { hasHeader: false, delimiter: ';' });
                break;
            case 'writeOffsYTD':
                await processFile(file, 'writeOffsYTD', writeOffsActualRowMapper, addWriteOffsYTD, clearWriteOffsYTD, { hasHeader: false, delimiter: ';' });
                break;
        }
    } finally {
        if (importFileInputRef.current) {
            importFileInputRef.current.value = '';
        }
    }
  }, [processFile]);

  const handleShcFileSelect = useCallback(async (dataType: ShcDataType, event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !shcParsingWorkerRef.current) return;

    setIsLoading(true);
    const dataTypeName = t(`dataType.${dataType}`);
    setStatusMessage({ text: t('status.import.preparing', { dataTypeName }), type: 'info' });

    try {
        const clearFunction = {
            'shc': clearShcData, 'planogram': clearPlanogramData,
            'orgStructure': clearOrgStructureData, 'categoryRelation': clearCategoryRelationData,
        }[dataType];
        await clearFunction();
    } catch (error) {
        console.error("Failed to clear old data", error);
        setStatusMessage({ text: t('status.clear.clearError', { dataTypeName }), type: 'error' });
        setIsLoading(false);
        return;
    }
    
    let totalRows = 0;
    const worker = shcParsingWorkerRef.current;
    
    const onWorkerMessage = async (e: MessageEvent<ShcParsingWorkerMessage>) => {
      const { type, payload } = e.data;
      const addFunction = {
        'shc': addShcData, 'planogram': addPlanogramData,
        'orgStructure': addOrgStructureData, 'categoryRelation': addCategoryRelationData
      }[dataType];

      switch(type) {
        case 'progress':
          setStatusMessage({ text: t(payload.message, { dataTypeName }), type: 'info', progress: payload.percentage });
          break;
        case 'data':
          await addFunction(payload as any);
          break;
        case 'complete':
          totalRows = payload.totalRows;
          await updateImportMetadata(dataType);
          setStatusMessage({ text: t('status.import.complete', { processedCount: totalRows.toLocaleString(language), dataTypeName }), type: 'success' });
          await performInitialCheck();
          setIsLoading(false);
          worker.removeEventListener('message', onWorkerMessage);
          break;
        case 'error':
          setStatusMessage({ text: payload, type: 'error' });
          setIsLoading(false);
          worker.removeEventListener('message', onWorkerMessage);
          break;
      }
    };
    
    worker.addEventListener('message', onWorkerMessage);
    worker.postMessage({ dataType, file });
    
    const input = document.getElementById(`${dataType}-file-input`) as HTMLInputElement;
    if (input) input.value = '';
  }, [t, language, performInitialCheck]);

  const handleReloadFile = useCallback(async (dataType: DataType, isAutoRefresh = false) => {
    const handle = linkedFiles.get(dataType);
    if (!handle) {
        if (!isAutoRefresh) setStatusMessage({ text: t('settings.reloadError'), type: 'error' });
        throw new Error("File handle not found");
    }
    try {
        const file = await handle.getFile();
        switch (dataType) {
            case 'products':
                await processFile(file, 'products', productRowMapper, addProducts, clearProducts, { hasHeader: true });
                break;
            case 'goodsReceipts':
                await processFile(file, 'goodsReceipts', goodsReceiptRowMapper, addGoodsReceipts, clearGoodsReceipts, { hasHeader: true });
                break;
            case 'openOrders':
                await processFile(file, 'openOrders', openOrderRowMapper, addOpenOrders, clearOpenOrders, { hasHeader: true });
                break;
            case 'sales':
                await processFile(file, 'sales', saleRowMapper, addSales, clearSales, { hasHeader: false });
                break;
        }
    } catch (e) {
        if (e instanceof DOMException && e.name === 'NotAllowedError') {
            if (!isAutoRefresh) setStatusMessage({ text: t('settings.permissionDenied'), type: 'error' });
        } else {
            if (!isAutoRefresh) setStatusMessage({ text: t('settings.reloadError'), type: 'error' });
        }
        throw e;
    }
  }, [linkedFiles, t, processFile]);

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
  }, [linkedFiles, autoRefreshConfig.interval, t, handleReloadFile]);

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
  
  const handleClearData = useCallback(async (type: DataType) => {
    const clearFn = {
        'products': clearProducts,
        'goodsReceipts': clearGoodsReceipts,
        'openOrders': clearOpenOrders,
        'sales': clearSales,
        'writeOffsWeekly': clearWriteOffsWeekly,
        'writeOffsYTD': clearWriteOffsYTD,
    }[type];
    const dataTypeName = t(`dataType.${type}`);
    setStatusMessage({ text: t('status.clear.clearing', { dataTypeName }), type: 'info' });
    try {
        await clearFn();
        setStatusMessage({ text: t('status.clear.cleared', { dataTypeName }), type: 'success' });
        await performInitialCheck();
    } catch(e) {
        setStatusMessage({ text: t('status.clear.clearError', { dataTypeName }), type: 'error' });
    }
  }, [t, performInitialCheck]);
  
  const handleClearShcFile = useCallback(async (type: ShcDataType) => {
    const clearFn = {
        'shc': clearShcData,
        'planogram': clearPlanogramData,
        'orgStructure': clearOrgStructureData,
        'categoryRelation': clearCategoryRelationData
    }[type];
     const dataTypeName = t(`dataType.${type}`);
     setStatusMessage({ text: t('status.clear.clearing', { dataTypeName }), type: 'info' });
     try {
        await clearFn();
        setStatusMessage({ text: t('status.clear.cleared', { dataTypeName }), type: 'success' });
        await performInitialCheck();
    } catch(e) {
        setStatusMessage({ text: t('status.clear.clearError', { dataTypeName }), type: 'error' });
    }
  }, [t, performInitialCheck]);

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to delete all data? This cannot be undone.")) {
      setIsLoading(true);
      setStatusMessage({ text: t('status.clear.clearingAll'), type: 'info' });
      try {
        await clearAllData();
        setLinkedFiles(new Map());
        setStatusMessage({ text: t('status.clear.clearedAll'), type: 'success' });
        await performInitialCheck();
      } catch (e) {
        setStatusMessage({ text: t('status.clear.clearAllError'), type: 'error' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    localStorage.setItem('oms-session', JSON.stringify(session));
  };
  
  const handleLogout = () => {
    setUserSession(null);
    setCurrentView('import');
    localStorage.removeItem('oms-session');
  };

  const handleNavigateToSimulation = (warehouseId: string, fullProductId: string) => {
    setSimulationContext({ warehouseId, fullProductId });
    setCurrentView('simulations');
  };
  
  const handleStartWatchlist = (items: ReportResultItem[]) => {
      setWatchlist(items);
      setWatchlistIndex(0);
      const firstItem = items[0];
      handleNavigateToSimulation(firstItem.warehouseId, firstItem.fullProductId);
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

  // --- Settings Handlers ---

  const handleLinkFile = async (dataType: DataType) => {
      try {
          const [handle] = await window.showOpenFilePicker({
              types: [{ description: 'Data Files', accept: { 'text/csv': ['.csv', '.txt'] } }],
              multiple: false,
          });
          await saveSetting(`linkedFile:${dataType}`, handle);
          const newLinkedFiles = new Map(linkedFiles).set(dataType, handle);
          setLinkedFiles(newLinkedFiles);
          setStatusMessage({ text: t('settings.linkSuccess'), type: 'success' });
          
          // Use the new handle directly instead of relying on state which might not be updated yet
          const file = await handle.getFile();
          if(dataType === 'products') await processFile(file, 'products', productRowMapper, addProducts, clearProducts, { hasHeader: true });
          if(dataType === 'goodsReceipts') await processFile(file, 'goodsReceipts', goodsReceiptRowMapper, addGoodsReceipts, clearGoodsReceipts, { hasHeader: true });
          if(dataType === 'openOrders') await processFile(file, 'openOrders', openOrderRowMapper, addOpenOrders, clearOpenOrders, { hasHeader: true });
          if(dataType === 'sales') await processFile(file, 'sales', saleRowMapper, addSales, clearSales, { hasHeader: false });

      } catch(e) {
          if ((e as DOMException).name !== 'AbortError') {
              console.error("Error linking file:", e);
              setStatusMessage({ text: t('settings.linkError'), type: 'error' });
          }
      }
  };
  
  const handleClearLink = async (dataType: DataType) => {
      if (confirm(t('settings.dataSources.clearLinkConfirm'))) {
          try {
              await deleteSetting(`linkedFile:${dataType}`);
              setLinkedFiles(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(dataType);
                  return newMap;
              });
              setStatusMessage({ text: t('settings.linkClearedSuccess'), type: 'success' });
          } catch (e) {
              console.error("Error clearing link:", e);
              setStatusMessage({ text: t('settings.linkClearedError'), type: 'error' });
          }
      }
  };

  const handleAddRdc = async (rdc: RDC) => {
      const newList = [...rdcList, rdc].sort((a,b) => a.id.localeCompare(b.id));
      await saveRdcList(newList);
      setRdcList(newList);
      setStatusMessage({ text: t('settings.rdcManagement.addSuccess'), type: 'success' });
  };
  
  const handleDeleteRdc = async (rdcId: string) => {
      const newList = rdcList.filter(r => r.id !== rdcId);
      await saveRdcList(newList);
      setRdcList(newList);
      setStatusMessage({ text: t('settings.rdcManagement.deleteSuccess'), type: 'success' });
  };
  
  const handleExportConfig = async () => {
    const config = { rdcList };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oms_config_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({ text: t('settings.configManagement.exportSuccess'), type: 'success' });
  };

  const handleImportConfig = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
        const text = await file.text();
        try {
            const config = JSON.parse(text);
            if (config.rdcList) {
                await saveRdcList(config.rdcList);
                setRdcList(config.rdcList);
                setStatusMessage({ text: t('settings.configManagement.importSuccess'), type: 'success' });
            }
        } catch(e) {
            console.error("Error importing config", e);
            setStatusMessage({ text: t('settings.configManagement.importError'), type: 'error' });
        }
    }
  };
  
  const handleImportExclusionList = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if(file) {
        const text = await file.text();
        const items = text.split(/[\s,;\t\n]+/).map(s => s.trim()).filter(Boolean);
        await saveExclusionList(items);
        const newList = await loadExclusionList();
        setExclusionList(newList);
        setStatusMessage({ text: t('settings.exclusionList.importSuccess', {count: items.length}), type: 'success' });
      }
  };
  
  const handleClearExclusionList = async () => {
      if(confirm(t('settings.exclusionList.clearConfirm'))) {
          await clearExclusionList();
          setExclusionList({ list: new Set(), lastUpdated: null });
          setStatusMessage({ text: t('settings.exclusionList.clearSuccess'), type: 'success' });
      }
  };
  
  const handleImportShcExclusionList = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
          const text = await file.text();
          const items = text.split(/[\s,;\t\n]+/).map(s => s.trim()).filter(Boolean);
          await saveShcExclusionList(items);
          const newList = await loadShcExclusionListDb();
          setShcExclusionList(newList);
          setStatusMessage({ text: t('settings.shcExclusionList.importSuccess', { count: items.length }), type: 'success' });
      }
  };
  
  const handleExportShcExclusionList = () => {
      const list = Array.from(shcExclusionList).join('\n');
      const blob = new Blob([list], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shc_exclusion_list.txt';
      a.click();
      URL.revokeObjectURL(url);
  };
  
  const handleClearShcExclusionList = async () => {
      if (confirm(t('settings.shcExclusionList.clearConfirm'))) {
          await clearShcExclusionListDb();
          setShcExclusionList(new Set());
          setStatusMessage({ text: t('settings.shcExclusionList.clearSuccess'), type: 'success' });
      }
  };

  const handleImportShcSnapshot = async (event: Event, type: 'baseline' | 'previousWeek') => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
          try {
              const text = await file.text();
              const data: ShcSnapshot = JSON.parse(text);
              if (data.weekNumber && data.year && data.scores) {
                  const saveFn = type === 'baseline' ? saveShcBaselineData : saveShcPreviousWeekData;
                  await saveFn(data);
                  setStatusMessage({ text: t('settings.shcCompliance.importSuccess', { type }), type: 'success' });
              } else {
                  throw new Error("Invalid format");
              }
          } catch (e) {
              console.error(`Error importing ${type} data`, e);
              setStatusMessage({ text: t('settings.shcCompliance.importError'), type: 'error' });
          }
      }
  };
  
  const handleImportWriteOffsTargets = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage({ text: t('status.import.preparing', { dataTypeName: t('dataType.writeOffsTargets') }), type: 'info' });

    try {
      await clearWriteOffsTargets();
      const text = await file.text();
      const data: Omit<WriteOffsTarget, 'id'>[] = JSON.parse(text);
      const dataWithIds = data.map(item => ({
          ...item,
          id: `${item.storeNumber}-${item.itemGroupNumber}`
      }));
      await saveWriteOffsTargets(dataWithIds);
      setStatusMessage({ text: t('status.import.complete', { processedCount: data.length, dataTypeName: t('dataType.writeOffsTargets') }), type: 'success' });
      await performInitialCheck();
    } catch (e) {
      console.error("Error importing Write-Offs Targets", e);
      setStatusMessage({ text: t('status.import.parseError', { dataTypeName: t('dataType.writeOffsTargets') }), type: 'error' });
    } finally {
      setIsLoading(false);
      if (writeOffsTargetsInputRef.current) writeOffsTargetsInputRef.current.value = '';
    }
  };

  const handleClearWriteOffsTargets = async () => {
    const dataTypeName = t('dataType.writeOffsTargets');
    setStatusMessage({ text: t('status.clear.clearing', { dataTypeName }), type: 'info' });
    try {
      await clearWriteOffsTargets();
      setStatusMessage({ text: t('status.clear.cleared', { dataTypeName }), type: 'success' });
      await performInitialCheck();
    } catch (e) {
      setStatusMessage({ text: t('status.clear.clearError', { dataTypeName }), type: 'error' });
    }
  };
  
  const handleImportDoo = async (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
          try {
              const text = await file.text();
              const data: DirectorOfOperations[] = JSON.parse(text);
              await saveDooList(data);
              setStatusMessage({ text: t('settings.dooManagement.importSuccess', { count: data.length }), type: 'success' });
          } catch (e) {
              console.error("Error importing DoO list", e);
              setStatusMessage({ text: t('settings.dooManagement.importError'), type: 'error' });
          } finally {
              if (dooFileInputRef.current) dooFileInputRef.current.value = '';
          }
      }
  };

  const handleClearDoo = async () => {
      if (confirm(t('settings.dooManagement.clearConfirm'))) {
          await clearDooList();
          setStatusMessage({ text: t('settings.dooManagement.clearSuccess'), type: 'success' });
      }
  };

  const renderView = () => {
    switch (currentView) {
        case 'import':
            return <ImportView isLoading={isLoading} importMetadata={importMetadata} counts={counts} onFileSelect={handleFileSelect} onClear={handleClearData} onClearShcFile={handleClearShcFile} onShcFileSelect={handleShcFileSelect} linkedFiles={linkedFiles} onReload={handleReloadFile} userSession={userSession} onLinkFile={handleLinkFile} onClearLink={handleClearLink} onClearAll={handleClearAll} onImportWriteOffsTargetsClick={() => writeOffsTargetsInputRef.current?.click()} onClearWriteOffsTargets={handleClearWriteOffsTargets} />;
        case 'data-preview':
            return <DataPreview userSession={userSession} />;
        case 'threat-report':
             if (userSession?.mode !== 'hq') return <div class={sharedStyles['placeholder-view']}><h3>{t('placeholders.report.title')}</h3><p>{t('placeholders.report.accessDenied')}</p></div>;
            return <ThreatReportView userSession={userSession} onNavigateToSimulation={handleNavigateToSimulation} onStartWatchlist={handleStartWatchlist} />;
        case 'status-report':
             return <StatusReportView rdcList={rdcList} exclusionList={exclusionList} onUpdateExclusionList={() => { if(exclusionFileInputRef.current) exclusionFileInputRef.current.click() }}/>;
        case 'shc-report':
            return <ShcReportView counts={counts} rdcList={rdcList} exclusionList={shcExclusionList} onUpdateExclusionList={(newList) => { saveShcExclusionList(Array.from(newList)); setShcExclusionList(newList); }} />;
        case 'write-offs-report':
            if (userSession?.mode !== 'hq') return <div class={sharedStyles['placeholder-view']}><h3>{t('placeholders.report.title')}</h3><p>{t('placeholders.report.accessDenied')}</p></div>;
            return <WriteOffsReportView />;
        case 'simulations':
            return <SimulationView userSession={userSession} initialParams={simulationContext} onSimulationStart={() => setSimulationContext(null)} watchlist={watchlist} watchlistIndex={watchlistIndex} onNavigateWatchlist={handleNavigateWatchlist} onClearWatchlist={() => { setWatchlist([]); setWatchlistIndex(null); }} />;
        case 'settings':
            return <SettingsView linkedFiles={linkedFiles} onLinkFile={handleLinkFile} onReloadFile={handleReloadFile} onClearLink={handleClearLink} isLoading={isLoading} userSession={userSession} rdcList={rdcList} onAddRdc={handleAddRdc} onDeleteRdc={handleDeleteRdc} onExportConfig={handleExportConfig} onImportClick={() => configImportInputRef.current?.click()} exclusionList={exclusionList} onImportExclusionListClick={() => exclusionFileInputRef.current?.click()} onClearExclusionList={handleClearExclusionList} shcExclusionList={shcExclusionList} onImportShcExclusionList={() => shcExclusionFileInputRef.current?.click()} onExportShcExclusionList={handleExportShcExclusionList} onClearShcExclusionList={handleClearShcExclusionList} onImportShcBaselineData={() => shcBaselineInputRef.current?.click()} onImportShcPreviousWeekData={() => shcPreviousWeekInputRef.current?.click()} onImportDooClick={() => dooFileInputRef.current?.click()} onClearDoo={handleClearDoo} />;
        case 'dashboard':
        default:
            return <div class={sharedStyles['placeholder-view']}><h3>{t('placeholders.dashboard.title')}</h3><p>{t('placeholders.dashboard.description')}</p></div>;
    }
  };

  const navItems: { view: View; labelKey: string; hqOnly?: boolean; }[] = [
    { view: 'import', labelKey: 'sidebar.import' },
    { view: 'data-preview', labelKey: 'sidebar.dataPreview' },
    { view: 'simulations', labelKey: 'sidebar.simulations' },
    { view: 'threat-report', labelKey: 'sidebar.threatReport', hqOnly: true },
    { view: 'status-report', labelKey: 'sidebar.statusReport' },
    { view: 'shc-report', labelKey: 'sidebar.shcReport', hqOnly: true },
    { view: 'write-offs-report', labelKey: 'sidebar.writeOffsReport', hqOnly: true },
    { view: 'settings', labelKey: 'sidebar.settings' },
  ];

  if (isInitializing) {
    return null;
  }
  
  try {
    return (
      <>
          <div style={{display: 'none'}}>
              <input type="file" ref={exclusionFileInputRef} onChange={handleImportExclusionList} accept=".txt" />
              <input type="file" ref={shcExclusionFileInputRef} onChange={handleImportShcExclusionList} accept=".txt" />
              <input type="file" ref={configImportInputRef} onChange={handleImportConfig} accept=".json" />
              <input type="file" ref={shcBaselineInputRef} onChange={(e) => handleImportShcSnapshot(e, 'baseline')} accept=".json" />
              <input type="file" ref={shcPreviousWeekInputRef} onChange={(e) => handleImportShcSnapshot(e, 'previousWeek')} accept=".json" />
              <input type="file" ref={writeOffsTargetsInputRef} onChange={handleImportWriteOffsTargets} accept=".json" />
              <input type="file" ref={dooFileInputRef} onChange={handleImportDoo} accept=".json" />
          </div>
          {!userSession && <LoginModal onLogin={handleLogin} rdcList={rdcList} />}
          {isIdle && <IdleSplashScreen onContinue={handleContinueFromIdle} />}
          {showCountdownModal && <RefreshCountdownModal countdown={countdown} onCancel={handleCancelRefresh} />}
          
          {userSession && (
              <div class={sharedStyles['app-container']}>
                  <header class={sharedStyles.header}>
                      <div class={sharedStyles['header-left']}>
                          <h1>{t('header.title')}</h1>
                          {userSession && (
                              <div class={sharedStyles['session-info']}>
                                  <span>{t('header.session.mode')}: <strong>{userSession.mode.toUpperCase()}</strong></span>
                                  {userSession.rdc && <span>RDC: <strong>{userSession.rdc.id}</strong></span>}
                              </div>
                          )}
                      </div>
                      <div class={sharedStyles['header-right']}>
                          <AutoRefreshControl config={autoRefreshConfig} onConfigChange={handleAutoRefreshConfigChange} timeToNextRefresh={timeToNextRefresh} />
                          <LanguageSelector />
                          <button class={sharedStyles['console-toggle']} onClick={() => setIsConsoleVisible(v => !v)} title="Toggle Console">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                          </button>
                          <button class={sharedStyles['button-secondary']} onClick={handleLogout}>{t('header.session.logout')}</button>
                      </div>
                  </header>
                  <aside class={sharedStyles.sidebar}>
                      <nav>
                          <ul>
                              {navItems.map(item => {
                                  if (item.hqOnly && userSession.mode !== 'hq') return null;
                                  return (
                                      <li key={item.view}>
                                          <button 
                                              class={`${sharedStyles['nav-button']} ${currentView === item.view ? sharedStyles.active : ''}`}
                                              onClick={() => setCurrentView(item.view)}
                                          >
                                              {t(item.labelKey)}
                                          </button>
                                      </li>
                                  );
                              })}
                          </ul>
                      </nav>
                      <footer class={sharedStyles['sidebar-footer']}>
                          {t('sidebar.footer.version', { version: '1.0.0' })}
                      </footer>
                  </aside>
                  <main class={sharedStyles['main-content']}>
                      {statusMessage && (
                          <div class={`${sharedStyles['status-container']} ${sharedStyles[statusMessage.type]}`} role="alert">
                              <p class={sharedStyles['status-text']}>{statusMessage.text}</p>
                              {statusMessage.progress !== undefined && (
                                  <div class={sharedStyles['progress-bar-container']}><div class={sharedStyles['progress-bar']} style={{width: `${statusMessage.progress}%`}}></div></div>
                              )}
                              <button class={sharedStyles['close-button']} onClick={() => setStatusMessage(null)}>&times;</button>
                          </div>
                      )}
                      {renderView()}
                  </main>
                  <Console 
                    logs={logs} 
                    isVisible={isConsoleVisible} 
                    onClear={() => setLogs([])}
                    onClose={() => setIsConsoleVisible(false)}
                  />
              </div>
          )}
      </>
    );
  } catch (error) {
    console.error("A critical rendering error occurred in App component:", error);
    return (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fbe9e7', border: '1px solid #ffab91', borderRadius: '8px', margin: '2rem' }}>
        <h2 style={{color: '#d9534f'}}>Application Error</h2>
        <p style={{color: '#333'}}>A critical error occurred while rendering the application.</p>
        <p style={{color: '#666', marginTop: '1rem'}}>Please check the console for details and try refreshing the page.</p>
      </div>
    );
  }
};


render(
  <LanguageProvider>
    <App />
  </LanguageProvider>,
  document.getElementById("root")!
);

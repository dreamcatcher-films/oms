import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { useTranslation } from '../i18n';
import type { ShcDataType, ShcAnalysisResult, ShcMismatchItem, ShcSectionConfig, ShcWorkerMessage, ShcResultItem, ShcSectionConfigItem } from '../utils/types';
import { loadSetting, saveSetting, getUniqueShcSections } from '../db';
import styles from './ShcReportView.module.css';
import sharedStyles from '../styles/shared.module.css';

type Props = {
    counts: { [key in ShcDataType]: number };
};

const SHC_CONFIG_KEY = 'shcSectionConfig';

export const ShcReportView = ({ counts }: Props) => {
    const { t } = useTranslation();
    const workerRef = useRef<Worker | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ message: string; percentage: number } | null>(null);
    const [results, setResults] = useState<ShcAnalysisResult | null>(null);
    const [mismatches, setMismatches] = useState<ShcMismatchItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const [config, setConfig] = useState<ShcSectionConfig | null>(null);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [isConfigDirty, setIsConfigDirty] = useState(false);
    const [newSections, setNewSections] = useState<string[]>([]);
    const [staleSections, setStaleSections] = useState<string[]>([]);

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const canRunAnalysis = counts.shc > 0 && counts.planogram > 0 && counts.orgStructure > 0 && counts.categoryRelation > 0 && config !== null;

    useEffect(() => {
        workerRef.current = new Worker(new URL('../shc.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e: MessageEvent<ShcWorkerMessage>) => {
            const { type, payload } = e.data;
            switch (type) {
                case 'progress':
                    setProgress(payload);
                    break;
                case 'complete':
                    setResults(payload.results);
                    setMismatches(payload.mismatches);
                    setIsLoading(false);
                    setProgress(null);
                    break;
                case 'error':
                    setError(payload);
                    setIsLoading(false);
                    setProgress(null);
                    break;
            }
        };

        return () => workerRef.current?.terminate();
    }, []);

    const loadAndReconcileConfig = useCallback(async () => {
        setIsLoadingConfig(true);
        try {
            const [savedConfig, dbSections] = await Promise.all([
                loadSetting<ShcSectionConfig>(SHC_CONFIG_KEY),
                getUniqueShcSections()
            ]);
            
            const dbSectionsSet = new Set(dbSections);
            let currentConfig: ShcSectionConfig = savedConfig || dbSections.map(id => ({ id, enabled: true }));
            
            const configSectionsSet = new Set(currentConfig.map(s => s.id));
            const foundNew = dbSections.filter(s => !configSectionsSet.has(s));
            const foundStale = currentConfig.filter(s => !dbSectionsSet.has(s.id)).map(s => s.id);

            setNewSections(foundNew);
            setStaleSections(foundStale);
            setConfig(currentConfig);

        } catch (e) {
            console.error("Failed to load or reconcile SHC config", e);
        } finally {
            setIsLoadingConfig(false);
        }
    }, []);

    useEffect(() => {
        loadAndReconcileConfig();
    }, [loadAndReconcileConfig]);

    const handleRunAnalysis = async () => {
        if (!canRunAnalysis || !workerRef.current || !config) return;
        
        setIsLoading(true);
        setError(null);
        setResults(null);
        setMismatches([]);
        setExpandedRows(new Set());
        setProgress({ message: t('shcReport.status.readingFiles'), percentage: 0 });

        workerRef.current.postMessage({ sectionConfig: config });
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        await saveSetting(SHC_CONFIG_KEY, config);
        setIsConfigDirty(false);
        // You might want to show a success message here
    };

    const handleConfigChange = (newConfig: ShcSectionConfig) => {
        setConfig(newConfig);
        setIsConfigDirty(true);
    };

    const handleDragStart = (e: DragEvent, position: number) => {
        dragItem.current = position;
    };
    
    const handleDragEnter = (e: DragEvent, position: number) => {
        dragOverItem.current = position;
    };

    const handleDrop = (e: DragEvent) => {
        if (config === null || dragItem.current === null || dragOverItem.current === null) return;
        const newConfig = [...config];
        const dragItemContent = newConfig.splice(dragItem.current, 1)[0];
        newConfig.splice(dragOverItem.current, 0, dragItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        handleConfigChange(newConfig);
    };

    const toggleRow = (key: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    const renderHierarchicalTable = () => {
        if (!results) return null;

        return (
            <div class={sharedStyles['table-container']}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>{t('shcReport.table.warehouse')} / {t('shcReport.table.hos')} / {t('shcReport.table.am')} / {t('shcReport.table.store')}</th>
                            <th style={{ width: '20%' }}>{t('shcReport.table.discrepancies')}</th>
                            <th style={{ width: '40%' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(warehouse => (
                            <ResultRow level={0} item={warehouse} itemType="warehouse" expandedRows={expandedRows} onToggle={toggleRow} />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
    
    return (
        <div class={styles['shc-report-view']}>
             <div class={styles['shc-report-controls']}>
                <h3>{t('sidebar.shcReport')}</h3>
                <p>{t('shcReport.description')}</p>
                 <div class={sharedStyles['filter-actions']}>
                    <button 
                        class={sharedStyles['button-primary']} 
                        onClick={handleRunAnalysis}
                        disabled={isLoading || !canRunAnalysis}
                    >
                        {t('actions.runAnalysis')}
                    </button>
                    {!canRunAnalysis && <span class={styles['file-warning']}>{t('shcReport.errors.allFilesRequired')}</span>}
                </div>
            </div>
            
            <div class={styles['config-panel']}>
                <div class={styles['config-header']}>
                    <h3>{t('shcReport.config.title')}</h3>
                    <div class={styles['config-actions']}>
                        {newSections.length > 0 && <button class={sharedStyles['button-secondary']} onClick={() => {
                            const newItems: ShcSectionConfigItem[] = newSections.map(s => ({ id: s, enabled: true }));
                            handleConfigChange([...(config || []), ...newItems]);
                            setNewSections([]);
                        }}>{t('shcReport.config.addNew')}</button>}
                        {staleSections.length > 0 && <button class={sharedStyles['button-secondary']} onClick={() => {
                            const staleSet = new Set(staleSections);
                            handleConfigChange((config || []).filter(s => !staleSet.has(s.id)));
                            setStaleSections([]);
                        }}>{t('shcReport.config.removeStale')}</button>}
                        <button class={sharedStyles['button-primary']} onClick={handleSaveConfig} disabled={!isConfigDirty}>{t('shcReport.config.save')}</button>
                    </div>
                </div>
                <p>{t('shcReport.config.description')}</p>
                {isLoadingConfig ? <div class={sharedStyles.spinner} /> : (
                    <ul class={styles['section-list']} onDragEnd={handleDrop}>
                        {config?.map((section, index) => (
                            <li 
                                key={section.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragOver={(e) => e.preventDefault()}
                                class={styles['section-item']}
                            >
                                <span class={styles['drag-handle']}>☰</span>
                                <input 
                                    type="checkbox"
                                    checked={section.enabled}
                                    onChange={(e) => {
                                        const newConfig = [...config];
                                        newConfig[index].enabled = (e.target as HTMLInputElement).checked;
                                        handleConfigChange(newConfig);
                                    }}
                                />
                                <span class={styles['section-name']}>{section.id}</span>
                                {newSections.includes(section.id) && <span class={`${styles.tag} ${styles.new}`}>{t('shcReport.config.new')}</span>}
                                {staleSections.includes(section.id) && <span class={`${styles.tag} ${styles.stale}`}>{t('shcReport.config.stale')}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {isLoading && (
                 <div class={styles['report-progress-section']}>
                    <h4>{t('statusReport.runningTitle')}</h4>
                    {progress && (
                        <>
                            <p>{progress.message}</p>
                            <div class={sharedStyles['progress-bar-container']}>
                                <div class={sharedStyles['progress-bar']} style={{ width: `${progress.percentage}%` }}></div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {error && (
                <div class={`${sharedStyles['status-container']} ${sharedStyles.error}`}>{error}</div>
            )}

            {!isLoading && (results || mismatches.length > 0) && (
                <div class={styles['results-container']}>
                    {results && results.length > 0 && (
                        <div class={styles['results-section']}>
                            <h3>{t('shcReport.results.title')}</h3>
                            {renderHierarchicalTable()}
                        </div>
                    )}
                     {mismatches.length > 0 && (
                        <div class={styles['results-section']}>
                            <h3>{t('shcReport.results.mismatchesTitle')} ({mismatches.length})</h3>
                            <div class={sharedStyles['table-container']}>
                                <table>
                                    <thead><tr><th>Type</th><th>Store</th><th>Article</th><th>Details</th></tr></thead>
                                    <tbody>
                                        {mismatches.slice(0, 100).map(m => (
                                            <tr><td>{m.type}</td><td>{m.storeNumber}</td><td>{m.articleNumber}</td><td>{m.details}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {!isLoading && !results && !error && mismatches.length === 0 && (
                 <div class={sharedStyles['placeholder-view']}>
                    <p>{t('shcReport.results.placeholder')}</p>
                 </div>
            )}
        </div>
    );
};

// Recursive component to render table rows
const ResultRow = ({ level, item, itemType, expandedRows, onToggle }: any) => {
    const { t } = useTranslation();
    const key = `${itemType}-${item.warehouseName || item.hosName || item.managerName || item.storeNumber}`;
    const isExpanded = expandedRows.has(key);
    
    let children: any[] = [];
    let childType = '';
    let name = '';
    
    switch(itemType) {
        case 'warehouse':
            children = item.hos;
            childType = 'hos';
            name = item.warehouseName;
            break;
        case 'hos':
            children = item.managers;
            childType = 'am';
            name = item.hosName;
            break;
        case 'am':
            children = item.stores;
            childType = 'store';
            name = item.managerName;
            break;
        case 'store':
            children = item.items;
            childType = 'item';
            name = item.storeNumber;
            break;
    }
    
    const hasChildren = children && children.length > 0;

    return (
        <>
            <tr class={`${styles.rowLevel} ${styles[`level-${level}`]}`} onClick={() => hasChildren && onToggle(key)}>
                <td>
                    <span style={{ paddingLeft: `${level * 20}px` }}>
                        {hasChildren && <span class={`${styles.toggle} ${isExpanded ? styles.expanded : ''}`}>▼</span>}
                        {name}
                    </span>
                </td>
                <td>{item.discrepancyCount}</td>
                <td></td>
            </tr>
            {isExpanded && hasChildren && itemType !== 'store' && children.map((child: any) => (
                <ResultRow level={level + 1} item={child} itemType={childType} expandedRows={expandedRows} onToggle={onToggle} />
            ))}
            {isExpanded && itemType === 'store' && (
                <>
                    <tr class={`${styles.rowLevel} ${styles[`level-${level+1}`]} ${styles.detailHeader}`}>
                        <td style={{ paddingLeft: `${(level + 1) * 20}px` }}>{t('shcReport.table.itemNumber')} / {t('shcReport.table.itemName')}</td>
                        <td>{t('shcReport.table.planShc')} / {t('shcReport.table.storeShc')} / {t('shcReport.table.diff')}</td>
                        <td>{t('shcReport.table.section')}</td>
                    </tr>
                    {children.map((detail: ShcResultItem, index: number) => (
                         <tr key={index} class={`${styles.rowLevel} ${styles[`level-${level+1}`]} ${styles.detailRow}`}>
                            <td style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                                <div>{detail.articleNumber}</div>
                                <div class={styles.subtext}>{detail.articleName}</div>
                            </td>
                            <td>
                                <div>{detail.planShc} / {detail.storeShc}</div>
                                <div class={styles.diff}>{detail.diff}</div>
                            </td>
                            <td>
                                <div>{detail.settingSpecificallyFor}</div>
                                <div class={styles.subtext}>{detail.settingWidth}</div>
                            </td>
                        </tr>
                    ))}
                </>
            )}
        </>
    );
};

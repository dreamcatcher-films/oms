import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { VNode } from 'preact';
import { useTranslation } from '../i18n';
import type { ShcDataType, ShcAnalysisResult, ShcMismatchItem, ShcWorkerMessage, ShcResultItem, ShcSectionConfigItem, ShcSectionGroup, RDC, ShcStoreResult } from '../utils/types';
import { loadSetting, saveSetting, getUniqueShcSectionsGrouped, validateStoresExistInShc, getStoreCountsForShcReport } from '../db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './ShcReportView.module.css';
import sharedStyles from '../styles/shared.module.css';

type Props = {
    counts: { [key in ShcDataType | 'orgStructure']: number };
    rdcList: RDC[];
    exclusionList: Set<string>;
    onUpdateExclusionList: (newList: Set<string>) => void;
};

const SHC_CONFIG_KEY = 'shcSectionConfig';

const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

export const ShcReportView = ({ counts, rdcList, exclusionList, onUpdateExclusionList }: Props) => {
    const { t } = useTranslation();
    const workerRef = useRef<Worker | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ message: string; percentage: number } | null>(null);
    const [results, setResults] = useState<ShcAnalysisResult | null>(null);
    const [mismatches, setMismatches] = useState<ShcMismatchItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    const [config, setConfig] = useState<ShcSectionConfigItem[] | null>(null);
    const [sectionGroups, setSectionGroups] = useState<ShcSectionGroup[]>([]);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [isConfigDirty, setIsConfigDirty] = useState(false);
    const [newSections, setNewSections] = useState<string[]>([]);
    const [staleSections, setStaleSections] = useState<string[]>([]);

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [expandedMismatches, setExpandedMismatches] = useState<Set<string>>(new Set());
    
    const [isValidationModalVisible, setIsValidationModalVisible] = useState(false);
    const [missingStores, setMissingStores] = useState<string[]>([]);
    const [storeCounts, setStoreCounts] = useState<{ shcStoreCount: number, orgStoreCount: number } | null>(null);

    const [selectedRdc, setSelectedRdc] = useState<string>('');

    const canRunAnalysis = counts.shc > 0 && counts.planogram > 0 && counts.orgStructure > 0 && counts.categoryRelation > 0 && config !== null && selectedRdc !== '';

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
            const [savedConfig, dbGroups] = await Promise.all([
                loadSetting<ShcSectionConfigItem[]>(SHC_CONFIG_KEY),
                getUniqueShcSectionsGrouped()
            ]);
            
            const dbSections = dbGroups.flatMap(g => g.sections);
            const dbSectionsSet = new Set(dbSections);
            
            let currentConfig: ShcSectionConfigItem[] = savedConfig || dbSections.map(id => ({ id, enabled: true }));
            
            const configSectionsSet = new Set(currentConfig.map(s => s.id));
            const foundNew = dbSections.filter(s => !configSectionsSet.has(s));
            const foundStale = currentConfig.filter(s => !dbSectionsSet.has(s.id)).map(s => s.id);

            let reconciledConfig = [...currentConfig];
            if (foundNew.length > 0) {
                reconciledConfig.push(...foundNew.map(id => ({ id, enabled: true })));
            }

            setNewSections(foundNew);
            setStaleSections(foundStale);
            setConfig(reconciledConfig);
            setSectionGroups(dbGroups);

        } catch (e) {
            console.error("Failed to load or reconcile SHC config", e);
        } finally {
            setIsLoadingConfig(false);
        }
    }, []);

    useEffect(() => {
        loadAndReconcileConfig();
    }, [loadAndReconcileConfig, counts.categoryRelation]);

    const proceedWithAnalysis = async () => {
        setIsValidationModalVisible(false);
        if (!canRunAnalysis || !workerRef.current || !config) return;
        
        setIsLoading(true);
        setError(null);
        setResults(null);
        setMismatches([]);
        setExpandedRows(new Set());
        setProgress({ message: t('shcReport.status.readingFiles'), percentage: 0 });

        const counts = await getStoreCountsForShcReport(selectedRdc);
        setStoreCounts(counts);

        workerRef.current.postMessage({ sectionConfig: config, rdcId: selectedRdc });
    };

    const handleRunAnalysis = async () => {
        if (!canRunAnalysis || isLoading) return;
        const missing = await validateStoresExistInShc(selectedRdc);
        if (missing.length > 0) {
            setMissingStores(missing);
            setIsValidationModalVisible(true);
        } else {
            proceedWithAnalysis();
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        await saveSetting(SHC_CONFIG_KEY, config);
        setIsConfigDirty(false);
    };

    const handleExportConfig = () => {
        if (!config) return;
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shc_section_config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const text = await file.text();
                    const importedConfig = JSON.parse(text);
                    if (Array.isArray(importedConfig) && importedConfig.every(item => 'id' in item && 'enabled' in item)) {
                        setConfig(importedConfig);
                        setIsConfigDirty(true);
                        // Trigger reconciliation after import
                        await loadAndReconcileConfig();
                         alert(t('shcReport.config.importSuccess'));
                    } else {
                         alert(t('shcReport.config.importError'));
                    }
                } catch (err) {
                    console.error("Error importing config:", err);
                    alert(t('shcReport.config.importError'));
                }
            }
        };
        input.click();
    };


    const handleConfigChange = (newConfig: ShcSectionConfigItem[]) => {
        setConfig(newConfig);
        setIsConfigDirty(true);
    };

    const handleSelectAll = (groupName?: string) => {
        if (!config) return;
        const sectionsToToggle = groupName ? sectionGroups.find(g => g.groupName === groupName)?.sections : config.map(c => c.id);
        if (!sectionsToToggle) return;
        const sectionsSet = new Set(sectionsToToggle);
        
        const newConfig = config.map(section => sectionsSet.has(section.id) ? { ...section, enabled: true } : section);
        handleConfigChange(newConfig);
    };

    const handleDeselectAll = (groupName?: string) => {
        if (!config) return;
        const sectionsToToggle = groupName ? sectionGroups.find(g => g.groupName === groupName)?.sections : config.map(c => c.id);
        if (!sectionsToToggle) return;
        const sectionsSet = new Set(sectionsToToggle);
        
        const newConfig = config.map(section => sectionsSet.has(section.id) ? { ...section, enabled: false } : section);
        handleConfigChange(newConfig);
    };

    const handleDragStart = (e: DragEvent, position: number) => { dragItem.current = position; };
    const handleDragEnter = (e: DragEvent, position: number) => { dragOverItem.current = position; };

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
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    };
    
    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupName)) newSet.delete(groupName);
            else newSet.add(groupName);
            return newSet;
        });
    };
    
    const toggleMismatchGroup = (key: string) => {
        setExpandedMismatches(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const handleToggleExclusion = (storeNumber: string) => {
        const newList = new Set(exclusionList);
        if (newList.has(storeNumber)) {
            newList.delete(storeNumber);
        } else {
            newList.add(storeNumber);
        }
        onUpdateExclusionList(newList);
    };
    
    const processedResults = useMemo(() => {
        if (!results) return null;
        return results.map(warehouse => {
            let warehouseDiscrepancyCount = 0;
            let warehouseActiveStoreCount = 0;
            
            const newHosList = warehouse.hos.map(hos => {
                let hosDiscrepancyCount = 0;
                let hosActiveStoreCount = 0;

                const newManagersList = hos.managers.map(manager => {
                    let managerDiscrepancyCount = 0;
                    let managerActiveStoreCount = 0;
                    
                    const newStoresList = manager.stores.map(store => {
                        const isExcluded = exclusionList.has(store.storeNumber);
                        if (!isExcluded) {
                            managerDiscrepancyCount += store.discrepancyCount;
                            managerActiveStoreCount++;
                        }
                        return { ...store, isExcluded };
                    });

                    hosDiscrepancyCount += managerDiscrepancyCount;
                    hosActiveStoreCount += managerActiveStoreCount;
                    return { ...manager, stores: newStoresList, discrepancyCount: managerDiscrepancyCount, activeStoreCount: managerActiveStoreCount };
                });
                
                warehouseDiscrepancyCount += hosDiscrepancyCount;
                warehouseActiveStoreCount += hosActiveStoreCount;
                return { ...hos, managers: newManagersList, discrepancyCount: hosDiscrepancyCount, activeStoreCount: hosActiveStoreCount };
            });

            return { ...warehouse, hos: newHosList, discrepancyCount: warehouseDiscrepancyCount, activeStoreCount: warehouseActiveStoreCount };
        });
    }, [results, exclusionList]);

    const handleExportStorePdf = (store: ShcStoreResult) => {
        const doc = new jsPDF();
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const week = getWeekNumber(now);
        const filename = `SHC_${selectedRdc}_${store.storeNumber}_SHC_vs_Planogram_Report_${year}&W${week}.pdf`;
        
        doc.setFontSize(16);
        doc.text(`SHC vs Planogram Report - Store ${store.storeNumber}`, 14, 22);
        doc.setFontSize(10);
        doc.text(`RDC: ${selectedRdc}`, 14, 32);
        doc.text(`Generated on: ${now.toLocaleString()}`, 14, 42);

        const tableHead = [[
            t('shcReport.table.itemNumber'),
            t('shcReport.table.itemName'),
            t('shcReport.table.section'),
            t('shcReport.table.planShc'),
            t('shcReport.table.storeShc'),
            t('shcReport.table.diff')
        ]];

        const tableBody = store.items.map(item => [
            item.articleNumber,
            item.articleName,
            item.settingSpecificallyFor,
            item.planShc,
            item.storeShc,
            item.diff
        ]);

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 20 },
            styles: { fontSize: 8 },
        });

        doc.save(filename);
    };

    const groupedMismatches = useMemo(() => {
        if (!mismatches || mismatches.length === 0) return null;
        const groups: Record<string, Record<string, ShcMismatchItem[]>> = {};
        for (const mismatch of mismatches) {
            const { type, storeNumber } = mismatch;
            if (!groups[type]) {
                groups[type] = {};
            }
            if (!groups[type][storeNumber]) {
                groups[type][storeNumber] = [];
            }
            groups[type][storeNumber].push(mismatch);
        }
        return groups;
    }, [mismatches]);

    const renderHierarchicalTable = () => {
        if (!processedResults) return null;
        return (
            <div class={sharedStyles['table-container']}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '50%' }}>{t('shcReport.table.warehouse')} / {t('shcReport.table.hos')} / {t('shcReport.table.am')} / {t('shcReport.table.store')}</th>
                            <th style={{ width: '25%' }}>{t('shcReport.table.discrepancies')}</th>
                            <th style={{ width: '25%' }}>{t('shcReport.table.avgPerStore')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedResults.map(warehouse => (
                            <ResultRow 
                                key={warehouse.warehouseName} 
                                level={0} 
                                item={warehouse} 
                                itemType="warehouse" 
                                expandedRows={expandedRows} 
                                onToggle={toggleRow} 
                                onToggleExclusion={handleToggleExclusion}
                                onExportPdf={handleExportStorePdf}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
    
    return (
        <div class={styles['shc-report-view']}>
             {isValidationModalVisible && (
                <div class={styles['modal-overlay']}>
                    <div class={styles['modal-content']}>
                        <h3>{t('shcReport.validation.title')}</h3>
                        <p>{t('shcReport.validation.message', { count: missingStores.length })}</p>
                        <p><strong>{t('shcReport.validation.listHeader')}</strong></p>
                        <div class={styles['missing-stores-list']}>
                            {missingStores.join(', ')}
                        </div>
                        <div class={styles['modal-actions']}>
                            <button class={sharedStyles['button-secondary']} onClick={() => setIsValidationModalVisible(false)}>{t('shcReport.validation.cancel')}</button>
                            <button class={sharedStyles['button-primary']} onClick={proceedWithAnalysis}>{t('shcReport.validation.continue')}</button>
                        </div>
                    </div>
                </div>
            )}
             <div class={styles['shc-report-controls']}>
                <h3>{t('sidebar.shcReport')}</h3>
                <p>{t('shcReport.description')}</p>
                 <div class={sharedStyles['filter-actions']}>
                    <div class={styles['rdc-selector-group']}>
                         <label for="rdc-select">{t('shcReport.rdcSelector.label')}</label>
                         <select id="rdc-select" value={selectedRdc} onChange={(e) => setSelectedRdc((e.target as HTMLSelectElement).value)}>
                            <option value="">{t('shcReport.rdcSelector.placeholder')}</option>
                            {rdcList.map(rdc => <option key={rdc.id} value={rdc.id}>{rdc.id} - {rdc.name}</option>)}
                         </select>
                    </div>
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
                        <button class={sharedStyles['button-secondary']} onClick={handleImportConfig}>{t('shcReport.config.import')}</button>
                        <button class={sharedStyles['button-secondary']} onClick={handleExportConfig} disabled={!config}>{t('shcReport.config.export')}</button>
                        <button class={sharedStyles['button-primary']} onClick={handleSaveConfig} disabled={!isConfigDirty}>{t('shcReport.config.save')}</button>
                    </div>
                </div>
                <p>{t('shcReport.config.description')}</p>
                 <div class={styles['section-actions']}>
                    <button class={styles['action-button']} onClick={() => handleSelectAll()}>{t('shcReport.config.selectAll')}</button>
                    <button class={styles['action-button']} onClick={() => handleDeselectAll()}>{t('shcReport.config.deselectAll')}</button>
                </div>
                {isLoadingConfig ? <div class={sharedStyles.spinner} /> : (
                    <div onDragEnd={handleDrop}>
                        {sectionGroups.map(group => {
                            const sectionsInGroup = config?.filter(c => group.sections.includes(c.id)) || [];
                            if (sectionsInGroup.length === 0) return null;
                            const activeCount = sectionsInGroup.filter(s => s.enabled).length;
                            const isGroupExpanded = expandedGroups.has(group.groupName);

                            return (
                                <div class={styles['section-group']} key={group.groupName}>
                                    <div class={styles['section-group-header']} onClick={() => toggleGroup(group.groupName)}>
                                        <span class={styles['section-group-title']}>{group.groupName}</span>
                                        <div class={styles['section-group-summary']}>
                                            <span class={styles['section-group-counts']}>{t('shcReport.config.activeSectionsSummary', { active: activeCount, total: sectionsInGroup.length })}</span>
                                            <span class={`${styles['section-group-toggle']} ${isGroupExpanded ? styles.expanded : ''}`}>▶</span>
                                        </div>
                                    </div>
                                    <div class={`${styles['section-group-content']} ${isGroupExpanded ? styles.expanded : ''}`}>
                                        <ul class={styles['section-list']}>
                                            {config?.map((section, index) => {
                                                if (!group.sections.includes(section.id)) return null;
                                                return (
                                                    <li key={section.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragOver={(e) => e.preventDefault()} class={styles['section-item']}>
                                                        <span class={styles['drag-handle']}>☰</span>
                                                        <input type="checkbox" checked={section.enabled} onChange={(e) => {
                                                            const newConfig = [...config];
                                                            newConfig[index].enabled = (e.target as HTMLInputElement).checked;
                                                            handleConfigChange(newConfig);
                                                        }} />
                                                        <span class={styles['section-name']}>{section.id}</span>
                                                        {newSections.includes(section.id) && <span class={`${styles.tag} ${styles.new}`}>{t('shcReport.config.new')}</span>}
                                                        {staleSections.includes(section.id) && <span class={`${styles.tag} ${styles.stale}`}>{t('shcReport.config.stale')}</span>}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                    {processedResults && processedResults.length > 0 && (
                        <div class={styles['results-section']}>
                            <div class={styles['results-header']}>
                                <h3>{t('shcReport.results.title')}</h3>
                                {storeCounts && <span class={styles['store-count-summary']}>{t('shcReport.results.storeCountSummary', storeCounts)}</span>}
                            </div>
                            {renderHierarchicalTable()}
                        </div>
                    )}
                     {mismatches.length > 0 && groupedMismatches && (
                        <div class={styles['results-section']}>
                            <h3>{t('shcReport.results.mismatchesTitle')} ({mismatches.length})</h3>
                            <div class={styles.mismatchContainer}>
                                <div class={`${styles.mismatchRow} ${styles.mismatchHeader}`}>
                                    <span>Type</span>
                                    <span>Store</span>
                                    <span>Article</span>
                                    <span>Details</span>
                                </div>
                                {Object.entries(groupedMismatches).map(([type, stores]) => {
                                    const typeKey = `type-${type}`;
                                    const isTypeExpanded = expandedMismatches.has(typeKey);
                                    const typeCount = Object.values(stores).reduce((sum, items) => sum + items.length, 0);

                                    return (
                                        <div key={typeKey}>
                                            <div class={`${styles.mismatchRow} ${styles.mismatchTypeHeader}`} onClick={() => toggleMismatchGroup(typeKey)}>
                                                <span class={styles.mismatchTypeTitle}>
                                                    <span class={`${styles.mismatchToggle} ${isTypeExpanded ? styles.expanded : ''}`}>▼</span>
                                                    {type}
                                                    <span class={styles.mismatchCount}>({typeCount})</span>
                                                </span>
                                            </div>
                                            {isTypeExpanded && Object.entries(stores).map(([storeNumber, items]) => {
                                                const storeKey = `store-${type}-${storeNumber}`;
                                                const isStoreExpanded = expandedMismatches.has(storeKey);
                                                const storeCount = items.length;

                                                return (
                                                    <div key={storeKey}>
                                                        <div class={`${styles.mismatchRow} ${styles.mismatchStoreHeader}`} onClick={() => toggleMismatchGroup(storeKey)}>
                                                            <span></span>
                                                            <span class={styles.mismatchStoreTitle}>
                                                                <span class={`${styles.mismatchToggle} ${isStoreExpanded ? styles.expanded : ''}`}>▼</span>
                                                                {storeNumber}
                                                                <span class={styles.mismatchCount}>({storeCount})</span>
                                                            </span>
                                                        </div>
                                                        {isStoreExpanded && items.map((item, index) => (
                                                            <div class={`${styles.mismatchRow} ${styles.mismatchItemRow}`} key={`${storeKey}-${item.articleNumber}-${index}`}>
                                                                <span></span>
                                                                <span></span>
                                                                <span>{item.articleNumber}</span>
                                                                <span>{item.details}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
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
const ResultRow = ({ level, item, itemType, expandedRows, onToggle, onToggleExclusion, onExportPdf }: any) => {
    const { t } = useTranslation();
    const key = `${itemType}-${item.warehouseName || item.hosName || item.managerName || item.storeNumber}`;
    const isExpanded = expandedRows.has(key);
    
    let children: any[] = [];
    let childType = '';
    let name = '';
    let isExcluded = item.isExcluded || false;
    
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
    const activeStoreCount = item.activeStoreCount ?? item.storeCount;
    const avgPerStore = activeStoreCount > 0 ? (item.discrepancyCount / activeStoreCount).toFixed(1) : '0.0';

    const renderStoreDetails = () => {
        let lastSection = '';
        return children.reduce((acc: VNode[], detail: ShcResultItem, index: number) => {
            const currentSection = detail.settingSpecificallyFor;
            if (currentSection !== lastSection) {
                acc.push(
                    <tr key={`divider-${index}`} class={`${styles.rowLevel} ${styles[`level-${level+1}`]} ${styles.dividerRow}`}>
                        <td colSpan={3} style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                            <div class={styles.dividerContent}>
                                <span>{t('shcReport.table.section')}: {currentSection}</span>
                                <span>{t('shcReport.table.sectionWidth')}: {detail.settingWidth}</span>
                            </div>
                        </td>
                    </tr>
                );
                lastSection = currentSection;
            }
            
            acc.push(
                <tr key={index} class={`${styles.rowLevel} ${styles[`level-${level+1}`]} ${styles.detailRow}`}>
                    <td style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                        <div>{detail.articleNumber}</div>
                        <div class={styles.subtext}>{detail.articleName}</div>
                    </td>
                     <td>
                        <div title={detail.settingSpecificallyFor}>{detail.settingSpecificallyFor}</div>
                         <div class={styles['item-details-extra']}>
                            <span class={styles.subtext}>{detail.settingWidth}</span>
                            <span class={styles.subtext}>{detail.itemGroup}</span>
                        </div>
                    </td>
                    <td>
                        <div>{detail.planShc} / {detail.storeShc}</div>
                        <div class={styles.diff}>{detail.diff}</div>
                    </td>
                </tr>
            );
            return acc;
        }, []);
    };

    return (
        <>
            <tr class={`${styles.rowLevel} ${styles[`level-${level}`]} ${isExcluded ? styles.excludedStore : ''}`} onClick={() => hasChildren && onToggle(key)}>
                <td class={styles.nameCell}>
                    <span style={{ paddingLeft: `${level * 20}px` }}>
                        {hasChildren && <span class={`${styles.toggle} ${isExpanded ? styles.expanded : ''}`}>▼</span>}
                        {name}
                        {isExcluded && <span class={styles.excludedLabel}>{t('shcReport.table.excluded')}</span>}
                    </span>
                     {itemType === 'store' && (
                        <div class={styles.rowActions}>
                            <button title={t('shcReport.table.tooltip.toggleExclusion')} onClick={(e) => { e.stopPropagation(); onToggleExclusion(item.storeNumber); }} class={styles.actionButton}>👁️</button>
                            <button title={t('shcReport.table.tooltip.exportPdf')} onClick={(e) => { e.stopPropagation(); onExportPdf(item); }} class={styles.actionButton}>📄</button>
                        </div>
                    )}
                </td>
                <td>{item.discrepancyCount}</td>
                <td class={styles['avg-per-store-cell']}>{itemType !== 'store' ? avgPerStore : ''}</td>
            </tr>
            {isExpanded && hasChildren && itemType !== 'store' && children.map((child: any) => (
                <ResultRow 
                    key={child.hosName || child.managerName || child.storeNumber} 
                    level={level + 1} item={child} 
                    itemType={childType} 
                    expandedRows={expandedRows} 
                    onToggle={onToggle} 
                    onToggleExclusion={onToggleExclusion}
                    onExportPdf={onExportPdf}
                />
            ))}
            {isExpanded && itemType === 'store' && (
                <>
                    <tr class={`${styles.rowLevel} ${styles[`level-${level+1}`]} ${styles.detailHeader}`}>
                        <td style={{ paddingLeft: `${(level + 1) * 20}px` }}>{t('shcReport.table.itemNumber')} / {t('shcReport.table.itemName')}</td>
                        <td>{t('shcReport.table.section')} / {t('shcReport.table.itemGroup')}</td>
                        <td>{t('shcReport.table.planShc')} / {t('shcReport.table.storeShc')} / {t('shcReport.table.diff')}</td>
                    </tr>
                    {renderStoreDetails()}
                </>
            )}
        </>
    );
};

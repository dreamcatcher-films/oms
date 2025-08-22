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

// Replaces the FileReader-based function with a classic, reliable binary-to-base64 conversion.
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};


export const ShcReportView = ({ counts, rdcList, exclusionList, onUpdateExclusionList }: Props) => {
    const { t } = useTranslation();
    const workerRef = useRef<Worker | null>(null);

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

    const loadAndReconcileConfig = useCallback(async (baseConfig?: ShcSectionConfigItem[]) => {
        setIsLoadingConfig(true);
        try {
            const [configToProcess, dbGroups] = await Promise.all([
                baseConfig ? Promise.resolve(baseConfig) : loadSetting<ShcSectionConfigItem[]>(SHC_CONFIG_KEY),
                getUniqueShcSectionsGrouped()
            ]);
            
            const dbSections = dbGroups.flatMap(g => g.sections);
            const dbSectionsSet = new Set(dbSections);
            
            let currentConfig: ShcSectionConfigItem[] = configToProcess || dbSections.map((id, index) => ({ id, enabled: true, order: index + 1 }));
            
            const configSectionsSet = new Set(currentConfig.map(s => s.id));
            const foundNew = dbSections.filter(s => !configSectionsSet.has(s));
            const foundStale = currentConfig.filter(s => !dbSectionsSet.has(s.id)).map(s => s.id);

            let reconciledConfig = currentConfig.map((item, index) => ({
                ...item,
                order: item.order ?? index + 1
            }));

            if (foundNew.length > 0) {
                 const maxOrder = Math.max(0, ...reconciledConfig.map(c => c.order));
                reconciledConfig.push(...foundNew.map((id, index) => ({ id, enabled: true, order: maxOrder + index + 1 })));
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
                        await loadAndReconcileConfig(importedConfig);
                        setIsConfigDirty(true);
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
    
    const handleOrderChange = (sectionId: string, newOrder: number) => {
        if (!config) return;
        const newConfig = config.map(item =>
            item.id === sectionId ? { ...item, order: newOrder } : item
        );
        handleConfigChange(newConfig);
    };
    
    const handleRefreshOrder = (groupName: string) => {
        if (!config) return;
        const group = sectionGroups.find(g => g.groupName === groupName);
        if (!group) return;

        const sectionsInGroup = new Set(group.sections);
        const groupItems = config.filter(c => sectionsInGroup.has(c.id));
        const otherItems = config.filter(c => !sectionsInGroup.has(c.id));

        groupItems.sort((a, b) => a.order - b.order);

        handleConfigChange([...otherItems, ...groupItems]);
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

    const handleExportStorePdf = async (store: ShcStoreResult) => {
        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    
        try {
            const fetchFontAsBase64 = async (url: string) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch font: ${url}`);
                const buffer = await response.arrayBuffer();
                return arrayBufferToBase64(buffer);
            };
    
            const [
                alumniSansBase64,
                zillaSlabBase64,
                sourceCodeProBase64,
                oswaldBase64,
            ] = await Promise.all([
                fetchFontAsBase64('/fonts/AlumniSansSC-SemiBold.ttf'),
                fetchFontAsBase64('/fonts/ZillaSlabHighlight-Bold.ttf'),
                fetchFontAsBase64('/fonts/SourceCodePro-Light.ttf'),
                fetchFontAsBase64('/fonts/Oswald-Bold.ttf'),
            ]);
    
            doc.addFileToVFS('AlumniSansSC-SemiBold.ttf', alumniSansBase64);
            doc.addFileToVFS('ZillaSlabHighlight-Bold.ttf', zillaSlabBase64);
            doc.addFileToVFS('SourceCodePro-Light.ttf', sourceCodeProBase64);
            doc.addFileToVFS('Oswald-Bold.ttf', oswaldBase64);
    
            doc.addFont('AlumniSansSC-SemiBold.ttf', 'AlumniSansSC-SemiBold', 'normal');
            doc.addFont('ZillaSlabHighlight-Bold.ttf', 'ZillaSlabHighlight-Bold', 'normal');
            doc.addFont('SourceCodePro-Light.ttf', 'SourceCodePro-Light', 'normal');
            doc.addFont('Oswald-Bold.ttf', 'Oswald-Bold', 'normal');
    
        } catch (error) {
            console.error("Font loading failed, falling back to standard fonts.", error);
        }

        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const week = getWeekNumber(now);
        const filename = `SHC_${selectedRdc}_${store.storeNumber}_SHC_vs_Planogram_Report_${year}W${week}.pdf`;
    
        const rdc = rdcList.find(r => r.id === selectedRdc);
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;
    
        const addPageHeaderAndFooter = (docInstance: jsPDF, pageNumber: number, totalPages: number) => {
            if (pageNumber === 1) {
                docInstance.setFont('AlumniSansSC-SemiBold', 'normal');
                docInstance.setFontSize(20);
                docInstance.text('Store SHC vs Planogram Report / FLOP - Only Unders', pageWidth / 2, 40, { align: 'center' });
        
                docInstance.setFont('SourceCodePro-Light', 'normal');
                docInstance.setFontSize(6);
                docInstance.text('Use Retail Viewer Feedback Form for sumbitting any feedback on the SHC Report.', pageWidth / 2, 60, { align: 'center' });
        
                docInstance.setFontSize(8);
                docInstance.text(`Target score: > 100`, pageWidth - margin, 80, { align: 'right' });

                docInstance.setFont('ZillaSlabHighlight-Bold', 'normal');
                docInstance.text(`Current_score:_${store.discrepancyCount}`, pageWidth - margin, 95, { align: 'right' });
            }

            docInstance.setFont('SourceCodePro-Light', 'normal');
            docInstance.setFontSize(8);
            docInstance.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
            docInstance.text(`RDC: ${rdc?.id || ''} ${rdc?.name || ''}   Store: ${store.storeNumber}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
        };
    
        const mainTableBody = store.items.reduce((acc, item, index) => {
            const prevItem = index > 0 ? store.items[index - 1] : null;
            const settingChanged = !prevItem || prevItem.settingSpecificallyFor !== item.settingSpecificallyFor || prevItem.settingWidth !== item.settingWidth;

            if (settingChanged) {
                acc.push([
                    { 
                        content: `${item.generalStoreArea} - ${item.settingSpecificallyFor} - ${item.settingWidth}`.toUpperCase(),
                        colSpan: 7, 
                        styles: { 
                            font: 'Oswald-Bold',
                            fontStyle: 'normal',
                            textColor: [255, 255, 255], 
                            fillColor: [0, 0, 0],
                            halign: 'left', 
                            fontSize: 7, 
                            cellPadding: 2 
                        } 
                    },
                ]);
            }
            
            acc.push([
                item.articleNumber,
                item.articleName,
                item.planShc,
                item.storeShc,
                { content: item.diff.toString(), styles: { fontStyle: 'bold' } },
                '',
                ''
            ]);

            return acc;
        }, [] as any[][]);
    
        autoTable(doc, {
            head: [['Item Number', 'Item Name', 'Plan SHC', 'Store SHC', 'Diff', 'V', 'Comments']],
            body: mainTableBody,
            theme: 'grid',
            startY: 110,
            styles: { font: 'SourceCodePro-Light', fontSize: 8, cellPadding: 3, lineWidth: 0.5, lineColor: '#333' },
            headStyles: { font: 'SourceCodePro-Light', fontStyle: 'bold', fillColor: '#e0e0e0', textColor: '#333', minCellHeight: 20, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 40, halign: 'center' },
                4: { cellWidth: 40, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 100 },
            },
            didDrawPage: (data) => {
                addPageHeaderAndFooter(doc, data.pageNumber, (doc as any).internal.getNumberOfPages());
            }
        });
        
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addPageHeaderAndFooter(doc, i, totalPages);
        }
    
        doc.save(filename);
    };

    const groupedMismatches = useMemo(() => {
        const groups: Record<string, Record<string, ShcMismatchItem[]>> = {};
        mismatches.forEach(m => {
            if (!groups[m.type]) groups[m.type] = {};
            if (!groups[m.type][m.storeNumber]) groups[m.type][m.storeNumber] = [];
            groups[m.type][m.storeNumber].push(m);
        });
        return groups;
    }, [mismatches]);

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
                <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                    <div class={styles['rdc-selector-group']}>
                        <label for="rdc-select">{t('shcReport.rdcSelector.label')}</label>
                        <select id="rdc-select" value={selectedRdc} onChange={e => setSelectedRdc((e.target as HTMLSelectElement).value)}>
                            <option value="">{t('shcReport.rdcSelector.placeholder')}</option>
                            {rdcList.map(rdc => <option value={rdc.id}>{rdc.id} - {rdc.name}</option>)}
                        </select>
                    </div>
                    <button class={sharedStyles['button-primary']} onClick={handleRunAnalysis} disabled={!canRunAnalysis || isLoading}>
                        {t('actions.runAnalysis')}
                    </button>
                    {!canRunAnalysis && <span class={styles['file-warning']}>{t('shcReport.errors.allFilesRequired')}</span>}
                </div>
            </div>

            {isLoading && (
                <div class={styles['report-progress-section']}>
                    <h4>{progress?.message || '...'}</h4>
                    <div class={sharedStyles['progress-bar-container']}>
                        <div class={sharedStyles['progress-bar']} style={{ width: `${progress?.percentage || 0}%` }}></div>
                    </div>
                </div>
            )}

            {error && (
                <div class={`${sharedStyles['status-container']} ${sharedStyles.error}`}>
                    <p class={sharedStyles['status-text']}>{error}</p>
                </div>
            )}

            <div class={styles['config-panel']}>
                <div class={styles['config-header']}>
                    <h3>{t('shcReport.config.title')}</h3>
                    <div class={styles['config-actions']}>
                        <button class={sharedStyles['button-secondary']} onClick={handleImportConfig} style={{backgroundColor: 'var(--info-color)'}}>{t('shcReport.config.import')}</button>
                        <button class={sharedStyles['button-secondary']} onClick={handleExportConfig} style={{backgroundColor: 'var(--success-color)'}}>{t('shcReport.config.export')}</button>
                        <button class={sharedStyles['button-primary']} onClick={handleSaveConfig} disabled={!isConfigDirty}>{t('shcReport.config.save')}</button>
                    </div>
                </div>
                <p>{t('shcReport.config.description')}</p>
                
                 {isLoadingConfig ? <div class={sharedStyles.spinner}></div> : (
                    <>
                    <div class={styles['section-actions']}>
                       <button onClick={() => handleSelectAll()} class={styles['action-button']}>{t('shcReport.config.selectAll')}</button>
                       <button onClick={() => handleDeselectAll()} class={styles['action-button']}>{t('shcReport.config.deselectAll')}</button>
                    </div>
                     <div class={styles['section-list-container']}>
                        {sectionGroups.map(group => {
                            const groupSections = config?.filter(c => group.sections.includes(c.id)) || [];
                            const activeCount = groupSections.filter(s => s.enabled).length;
                            const isExpanded = expandedGroups.has(group.groupName);
                            return (
                                <div class={styles['section-group']} key={group.groupName}>
                                    <div class={styles['section-group-header']} onClick={() => toggleGroup(group.groupName)}>
                                        <span class={styles['section-group-title']}>{group.groupName}</span>
                                        <div class={styles['section-group-summary']}>
                                            <span class={styles['section-group-counts']}>{t('shcReport.config.activeSectionsSummary', { active: activeCount, total: groupSections.length })}</span>
                                            <button class={styles['refresh-order-button']} onClick={(e) => { e.stopPropagation(); handleRefreshOrder(group.groupName); }}>{t('shcReport.config.refreshOrder')}</button>
                                            <span class={`${styles['section-group-toggle']} ${isExpanded ? styles.expanded : ''}`}>▶</span>
                                        </div>
                                    </div>
                                    <div class={`${styles['section-group-content']} ${isExpanded ? styles.expanded : ''}`}>
                                        <ul class={styles['section-list']}>
                                            {groupSections.map(section => (
                                                <li class={styles['section-item']} key={section.id}>
                                                    <input
                                                        type="checkbox"
                                                        checked={section.enabled}
                                                        onChange={(e) => {
                                                            const newConfig = config!.map(s => s.id === section.id ? { ...s, enabled: (e.target as HTMLInputElement).checked } : s);
                                                            handleConfigChange(newConfig);
                                                        }}
                                                    />
                                                     <input
                                                        type="number"
                                                        value={section.order}
                                                        onInput={(e) => handleOrderChange(section.id, parseInt((e.target as HTMLInputElement).value, 10) || 0)}
                                                        class={styles['section-order-input']}
                                                    />
                                                    <span class={styles['section-name']}>{section.id}</span>
                                                    {newSections.includes(section.id) && <span class={`${styles.tag} ${styles.new}`}>{t('shcReport.config.new')}</span>}
                                                    {staleSections.includes(section.id) && <span class={`${styles.tag} ${styles.stale}`}>{t('shcReport.config.stale')}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                    </>
                 )}
            </div>

            {processedResults && (
                <div class={styles['results-section']}>
                    <div class={styles['results-header']}>
                        <h3>{t('shcReport.results.title')}</h3>
                        {storeCounts && <span class={styles['store-count-summary']}>{t('shcReport.results.storeCountSummary', storeCounts)}</span>}
                    </div>
                    <div class={sharedStyles['table-container']}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '50%' }}>{t('shcReport.table.warehouse')} / {t('shcReport.table.hos')} / {t('shcReport.table.am')} / {t('shcReport.table.store')}</th>
                                    <th>{t('shcReport.table.discrepancies')}</th>
                                    <th>{t('shcReport.table.avgPerStore')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedResults.map(warehouse => (<>
                                    <tr key={warehouse.warehouseName} onClick={() => toggleRow(`wh-${warehouse.warehouseName}`)} class={`${styles['row-level']} ${styles['level-0']}`}>
                                        <td><span class={`${styles.toggle} ${expandedRows.has(`wh-${warehouse.warehouseName}`) ? styles.expanded : ''}`}>▶</span> {warehouse.warehouseName}</td>
                                        <td>{warehouse.discrepancyCount}</td>
                                        <td class={styles['avg-per-store-cell']}>{(warehouse.discrepancyCount / (warehouse.activeStoreCount || 1)).toFixed(2)}</td>
                                    </tr>
                                    {expandedRows.has(`wh-${warehouse.warehouseName}`) && warehouse.hos.map(hos => (<>
                                        <tr key={hos.hosName} onClick={() => toggleRow(`hos-${hos.hosName}`)} class={`${styles['row-level']} ${styles['level-1']}`}>
                                            <td style={{ paddingLeft: '2rem' }}><span class={`${styles.toggle} ${expandedRows.has(`hos-${hos.hosName}`) ? styles.expanded : ''}`}>▶</span> {hos.hosName}</td>
                                            <td>{hos.discrepancyCount}</td>
                                            <td class={styles['avg-per-store-cell']}>{(hos.discrepancyCount / (hos.activeStoreCount || 1)).toFixed(2)}</td>
                                        </tr>
                                        {expandedRows.has(`hos-${hos.hosName}`) && hos.managers.map(manager => (<>
                                            <tr key={manager.managerName} onClick={() => toggleRow(`am-${manager.managerName}`)} class={`${styles['row-level']} ${styles['level-2']}`}>
                                                <td style={{ paddingLeft: '4rem' }}><span class={`${styles.toggle} ${expandedRows.has(`am-${manager.managerName}`) ? styles.expanded : ''}`}>▶</span> {manager.managerName}</td>
                                                <td>{manager.discrepancyCount}</td>
                                                <td class={styles['avg-per-store-cell']}>{(manager.discrepancyCount / (manager.activeStoreCount || 1)).toFixed(2)}</td>
                                            </tr>
                                            {expandedRows.has(`am-${manager.managerName}`) && manager.stores.map(store => {
                                                const isExpanded = expandedRows.has(`st-${store.storeNumber}`);
                                                return (<>
                                                    <tr key={store.storeNumber} class={`${styles['row-level']} ${styles['level-3']} ${store.isExcluded ? styles['excluded-store'] : ''}`}>
                                                        <td style={{ paddingLeft: '6rem' }} onClick={() => toggleRow(`st-${store.storeNumber}`)}>
                                                           <div class={styles['name-cell']}>
                                                                <span><span class={`${styles.toggle} ${isExpanded ? styles.expanded : ''}`}>▶</span> {store.storeNumber} {store.isExcluded && <span class={styles['excluded-label']}>{t('shcReport.table.excluded')}</span>}</span>
                                                                <div class={styles['row-actions']}>
                                                                    <button class={styles['action-button']} title={t('shcReport.table.tooltip.toggleExclusion')} onClick={(e) => { e.stopPropagation(); handleToggleExclusion(store.storeNumber); }}>
                                                                        {store.isExcluded ? '👁️‍🗨️' : '👁️'}
                                                                    </button>
                                                                     <button class={styles['action-button']} title={t('shcReport.table.tooltip.exportPdf')} onClick={(e) => { e.stopPropagation(); handleExportStorePdf(store); }}>
                                                                        📄
                                                                    </button>
                                                                </div>
                                                           </div>
                                                        </td>
                                                        <td onClick={() => toggleRow(`st-${store.storeNumber}`)}>{store.discrepancyCount}</td>
                                                        <td onClick={() => toggleRow(`st-${store.storeNumber}`)}></td>
                                                    </tr>
                                                    {isExpanded && store.items.length > 0 && (<>
                                                        <tr class={styles['detail-header']}>
                                                            <td style={{ paddingLeft: '8rem' }}>{t('shcReport.table.itemNumber')} / {t('shcReport.table.itemName')}</td>
                                                            <td>{t('shcReport.table.section')} / {t('shcReport.table.itemGroup')}</td>
                                                            <td>{t('shcReport.table.planShc')} / {t('shcReport.table.storeShc')} / {t('shcReport.table.diff')}</td>
                                                        </tr>
                                                        {store.items.reduce((acc, item, index) => {
                                                            const prevItem = index > 0 ? store.items[index - 1] : null;
                                                            if (!prevItem || prevItem.settingSpecificallyFor !== item.settingSpecificallyFor) {
                                                                acc.push(
                                                                    <tr key={`div-${item.locator}-${item.articleNumber}`} class={styles['divider-row']}>
                                                                        <td colSpan={3}>
                                                                            <div class={styles['divider-content']}>
                                                                                <span>{item.settingSpecificallyFor}</span>
                                                                                <span>{t('shcReport.table.sectionWidth')}: {item.settingWidth}</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            acc.push(
                                                                <tr key={`${item.locator}-${item.articleNumber}`} class={styles['detail-row']}>
                                                                    <td style={{ paddingLeft: '8rem' }}>
                                                                        <div>{item.articleNumber}</div>
                                                                        <div class={styles.subtext}>{item.articleName}</div>
                                                                    </td>
                                                                    <td>
                                                                        <div>{item.settingSpecificallyFor}</div>
                                                                        <div class={`${styles.subtext} ${styles['item-details-extra']}`}>
                                                                            <span>{item.settingWidth}</span>
                                                                            <span>{item.itemGroup}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div>{item.planShc} / {item.storeShc}</div>
                                                                        <div class={`${styles.subtext} ${styles.diff}`}>{item.diff}</div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                            return acc;
                                                        }, [] as VNode[])}
                                                    </>)}
                                                </>);
                                            })}
                                        </>))}
                                    </>))}
                                </>))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {mismatches.length > 0 && (
                <div class={styles['results-section']}>
                    <h3>{t('shcReport.results.mismatchesTitle')} ({mismatches.length})</h3>
                    <div class={styles['mismatch-container']}>
                        <div class={`${styles['mismatch-row']} ${styles['mismatch-header']}`}>
                           <span>Type</span><span>Store</span><span>Article</span><span>Details</span>
                        </div>
                        {Object.entries(groupedMismatches).map(([type, stores]) => {
                           const typeKey = `mismatch-type-${type}`;
                           const isTypeExpanded = expandedMismatches.has(typeKey);
                           const typeCount = Object.values(stores).reduce((sum, items) => sum + items.length, 0);
                           return (<>
                                <div class={`${styles['mismatch-row']} ${styles['mismatch-type-header']}`} onClick={() => toggleMismatchGroup(typeKey)}>
                                    <div class={styles['mismatch-type-title']}>
                                        <span class={`${styles['mismatch-toggle']} ${isTypeExpanded ? styles.expanded : ''}`}>▶</span>
                                        {type}
                                        <span class={styles['mismatch-count']}>({typeCount})</span>
                                    </div>
                                </div>
                                {isTypeExpanded && Object.entries(stores).map(([storeNumber, items]) => {
                                    const storeKey = `${typeKey}-${storeNumber}`;
                                    const isStoreExpanded = expandedMismatches.has(storeKey);
                                    return (<>
                                        <div class={`${styles['mismatch-row']} ${styles['mismatch-store-header']}`} onClick={() => toggleMismatchGroup(storeKey)}>
                                            <div class={styles['mismatch-store-title']} style={{ paddingLeft: '2rem' }}>
                                                <span class={`${styles['mismatch-toggle']} ${isStoreExpanded ? styles.expanded : ''}`}>▶</span>
                                                Store {storeNumber}
                                                <span class={styles['mismatch-count']}>({items.length})</span>
                                            </div>
                                        </div>
                                        {isStoreExpanded && items.map(item => (
                                            <div class={`${styles['mismatch-row']} ${styles['mismatch-item-row']}`} style={{ paddingLeft: '4rem' }}>
                                                <span></span>
                                                <span></span>
                                                <span>{item.articleNumber}</span>
                                                <span>{item.details}</span>
                                            </div>
                                        ))}
                                    </>);
                                })}
                           </>);
                        })}
                    </div>
                </div>
            )}

            {!isLoading && !results && !error && (
                <div class={sharedStyles['placeholder-view']}>
                    <p>{t('shcReport.results.placeholder')}</p>
                </div>
            )}
        </div>
    );
};

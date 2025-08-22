import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { VNode } from 'preact';
import { useTranslation } from '../i18n';
import type { ShcDataType, ShcAnalysisResult, ShcMismatchItem, ShcWorkerMessage, ShcResultItem, ShcSectionConfigItem, ShcSectionGroup, RDC, ShcStoreResult, ShcComplianceReportData, ShcComplianceStoreData, ShcSnapshot, ShcComplianceManagerData } from '../utils/types';
import { loadSetting, saveSetting, getUniqueShcSectionsGrouped, validateStoresExistInShc, getStoreCountsForShcReport, loadShcBaselineData, loadShcPreviousWeekData } from '../db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
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

const generatePdfForStore = (
    doc: jsPDF,
    store: ShcStoreResult,
    selectedRdc: string,
    rdcList: RDC[],
    logoData: string | null
): jsPDF => {
    const rdc = rdcList.find(r => r.id === selectedRdc);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    const addPageHeaderAndFooter = (docInstance: jsPDF, pageNumber: number, totalPages: number) => {
        if (pageNumber === 1) {
            if (logoData) {
                docInstance.addImage(logoData, 'PNG', margin, 30, 50, 50, undefined, 'FAST');
            } else {
                docInstance.setFillColor(211, 211, 211); // Light gray placeholder
                docInstance.rect(margin, 30, 50, 50, 'F');
            }

            docInstance.setFont('helvetica', 'bold');
            docInstance.setFontSize(14);
            docInstance.text('Store SHC vs Planogram Report / FLOP - Only Unders', pageWidth / 2, 40, { align: 'center' });
    
            docInstance.setFont('helvetica', 'normal');
            docInstance.setFontSize(6);
            docInstance.text('Use Retail Viewer Feedback Form for sumbitting any feedback on the SHC Report.', pageWidth / 2, 60, { align: 'center' });
    
            docInstance.setFontSize(10);
            const rdcStoreText = `RDC: ${rdc?.name || ''}   STORE: ${store.storeNumber}`;
            docInstance.text(rdcStoreText, pageWidth / 2, 88, { align: 'center' });
            docInstance.text(`Target score: > 100`, pageWidth - margin, 80, { align: 'right' });

            docInstance.setFont('helvetica', 'bold');
            docInstance.setFontSize(9);
            const scoreText = `Current score: ${store.discrepancyCount}`;
            docInstance.setTextColor(0, 0, 0);
            docInstance.text(scoreText, pageWidth - margin, 95, { align: 'right' });
        }

        docInstance.setFont('helvetica', 'normal');
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
                        font: 'helvetica',
                        fontStyle: 'bold',
                        textColor: [255, 255, 255], 
                        fillColor: [0, 0, 0], // Black background
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
        head: [['Item Number', 'Item Name', 'Plan SHC', 'Store SHC', 'Diff', ' V', 'Comments']],
        body: mainTableBody,
        theme: 'grid',
        startY: 120,
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, lineWidth: 0.5, lineColor: '#333' },
        headStyles: { font: 'helvetica', fontStyle: 'bold', fillColor: '#e0e0e0', textColor: '#333', minCellHeight: 20, valign: 'middle' },
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
    
    return doc;
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
    
    // State for Compliance Report
    const [complianceReportData, setComplianceReportData] = useState<ShcComplianceReportData | null>(null);
    const [isComplianceDataReady, setIsComplianceDataReady] = useState(true);


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
                    setComplianceReportData(null); // Clear old compliance report on new analysis
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

    const excludedStoresCount = useMemo(() => {
        if (!processedResults) return 0;
        let count = 0;
        processedResults.forEach(warehouse => {
            warehouse.hos.forEach(hos => {
                hos.managers.forEach(manager => {
                    manager.stores.forEach(store => {
                        if (store.isExcluded) {
                            count++;
                        }
                    });
                });
            });
        });
        return count;
    }, [processedResults]);

    const handleExportStorePdf = async (store: ShcStoreResult) => {
        let logoData: string | null = null;
        try {
            const response = await fetch('/logo/logo.png');
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                logoData = `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
            }
        } catch (e) { console.error("Could not load logo.", e); }

        const doc = generatePdfForStore(new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' }), store, selectedRdc, rdcList, logoData);

        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const week = getWeekNumber(now);
        const filename = `SHC_${selectedRdc}_${store.storeNumber}_SHC_vs_Planogram_Report_${year}W${week}.pdf`;
        
        doc.save(filename);
    };
    
    const handleDownloadAllPdfsAsZip = async () => {
        if (!processedResults || isLoading) return;

        setIsLoading(true);
        setProgress({ message: 'Preparing to generate PDFs...', percentage: 0 });

        const allStores = processedResults.flatMap(warehouse =>
            warehouse.hos.flatMap(hos =>
                hos.managers.flatMap(manager => manager.stores)
            )
        );

        if (allStores.length === 0) {
            alert("No available stores to export.");
            setIsLoading(false);
            setProgress(null);
            return;
        }
        
        const zip = new JSZip();
        
        let logoData: string | null = null;
        try {
            const response = await fetch('/logo/logo.png');
            if (response.ok) {
                const buffer = await response.arrayBuffer();
                logoData = `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
            }
        } catch (e) {
            console.error("Could not load logo for zipping.", e);
        }

        for (let i = 0; i < allStores.length; i++) {
            const store = allStores[i];
            const progressPercentage = (i / allStores.length) * 100;
            setProgress({ message: `Generating PDF for store ${store.storeNumber} (${i + 1}/${allStores.length})`, percentage: progressPercentage });

            await new Promise(resolve => setTimeout(resolve, 0)); 
            
            const doc = generatePdfForStore(new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' }), store, selectedRdc, rdcList, logoData);
            
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const week = getWeekNumber(now);
            const filename = `SHC_${selectedRdc}_${store.storeNumber}_SHC_vs_Planogram_Report_${year}W${week}.pdf`;
            
            const pdfData = doc.output('arraybuffer');
            zip.file(filename, pdfData);
        }
        
        setProgress({ message: 'Creating ZIP file...', percentage: 99 });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const week = getWeekNumber(now);
        const zipFilename = `SHC_Reports_${selectedRdc}_${year}W${week}.zip`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        setIsLoading(false);
        setProgress(null);
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
    
    // --- COMPLIANCE REPORT LOGIC ---

    const handleGenerateComplianceReport = async () => {
        if (!processedResults) return;
        setIsLoading(true);
        setIsComplianceDataReady(false);

        const [baselineData, previousWeekData] = await Promise.all([
            loadShcBaselineData(),
            loadShcPreviousWeekData()
        ]);

        if (!baselineData || !previousWeekData) {
            setIsComplianceDataReady(false);
            setIsLoading(false);
            return;
        }

        const report: ShcComplianceReportData = {
            rdcId: selectedRdc,
            rdcName: rdcList.find(r => r.id === selectedRdc)?.name || '',
            hosData: [],
            snapshotInfo: {
                baseline: baselineData,
                previousWeek: previousWeekData
            }
        };

        const allStoresCurrentData = new Map<string, { store: ShcStoreResult, hos: string, am: string }>();
        processedResults.forEach(warehouse => {
            warehouse.hos.forEach(hos => {
                hos.managers.forEach(manager => {
                    manager.stores.forEach(store => {
                        allStoresCurrentData.set(store.storeNumber, { store, hos: hos.hosName, am: manager.managerName });
                    });
                });
            });
        });
        
        const processedHos = new Map<string, { name: string, managers: Map<string, { name: string, stores: ShcComplianceStoreData[] }> }>();

        allStoresCurrentData.forEach(({ store, hos, am }) => {
            const storeNumber = store.storeNumber;
            const current = store.discrepancyCount;
            const previous = previousWeekData.scores[storeNumber] ?? null;
            const start = baselineData.scores[storeNumber] ?? null;
            
            let change: number | null = null;
            if (current !== null && start !== null && start > 0) {
                change = ((current - start) / start);
            }

            const storeData: ShcComplianceStoreData = {
                storeNumber,
                storeName: store.storeNumber, // Placeholder, assuming store name isn't in this structure
                am,
                hos,
                current,
                previous,
                start,
                change
            };
            
            if (!processedHos.has(hos)) {
                processedHos.set(hos, { name: hos, managers: new Map() });
            }
            const hosData = processedHos.get(hos)!;

            if (!hosData.managers.has(am)) {
                hosData.managers.set(am, { name: am, stores: [] });
            }
            const amData = hosData.managers.get(am)!;
            amData.stores.push(storeData);
        });
        
        report.hosData = Array.from(processedHos.values()).map(hosEntry => {
            const managers = Array.from(hosEntry.managers.values()).map(amEntry => {
                 const amCurrent = amEntry.stores.reduce((sum, s) => sum + (s.current ?? 0), 0);
                 const amPrevious = amEntry.stores.reduce((sum, s) => sum + (s.previous ?? 0), 0);
                 const amStart = amEntry.stores.reduce((sum, s) => sum + (s.start ?? 0), 0);
                 const amChange = amStart > 0 ? ((amCurrent - amStart) / amStart) : null;

                return { ...amEntry, current: amCurrent, previous: amPrevious, start: amStart, change: amChange };
            });
            const hosCurrent = managers.reduce((sum, m) => sum + m.current, 0);
            const hosPrevious = managers.reduce((sum, m) => sum + m.previous, 0);
            const hosStart = managers.reduce((sum, m) => sum + m.start, 0);
            const hosChange = hosStart > 0 ? ((hosCurrent - hosStart) / hosStart) : null;
            
            return { name: hosEntry.name, managers, current: hosCurrent, previous: hosPrevious, start: hosStart, change: hosChange };
        });

        setComplianceReportData(report);
        setIsComplianceDataReady(true);
        setIsLoading(false);
    };
    
    const handleExportSnapshot = () => {
        if (!processedResults) return;

        const scores: Record<string, number> = {};
        processedResults.forEach(warehouse => {
            warehouse.hos.forEach(hos => {
                hos.managers.forEach(manager => {
                    manager.stores.forEach(store => {
                        scores[store.storeNumber] = store.discrepancyCount;
                    });
                });
            });
        });

        const now = new Date();
        const snapshot: ShcSnapshot = {
            weekNumber: getWeekNumber(now),
            year: now.getFullYear(),
            generatedDate: now.toISOString(),
            scores
        };

        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shc_weekly_snapshot_W${snapshot.weekNumber}_${snapshot.year}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportCompliancePdf = () => {
        if (!complianceReportData) return;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text("SHC Compliance Report", 40, 40);

        doc.setFontSize(10);
        doc.text(`RDC: ${complianceReportData.rdcId} - ${complianceReportData.rdcName}`, 40, 55);

        const body: any[] = [];
        complianceReportData.hosData.forEach(hos => {
            body.push([{ content: hos.name, colSpan: 6, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }]);
            hos.managers.forEach(am => {
                body.push([{ content: am.name, colSpan: 6, styles: { fontStyle: 'bold', fillColor: '#f8f9fa', textColor: '#333' } }]);
                am.stores.forEach(store => {
                    body.push([
                        `${store.storeNumber} - ${store.storeName}`,
                        store.current ?? '-',
                        store.previous ?? '-',
                        store.start ?? '-',
                        store.change !== null ? `${(store.change * 100).toFixed(0)}%` : '-',
                        '' // Placeholder for data bar
                    ]);
                });
            });
        });

        autoTable(doc, {
            head: [['Store / AM / HoS', 'Currently', 'Week -1', 'Start', 'Change', '']],
            body: body,
            startY: 70,
            theme: 'grid',
            headStyles: { fillColor: '#343a40', textColor: '#fff' },
            didDrawCell: (data) => {
                // We are providing the `body` so `raw` will be an array, not an HTML element.
                const rawRow = data.row.raw as any[];
                if (!Array.isArray(rawRow)) return;

                // Data bars for store value cells ('Currently', 'Week -1', 'Start')
                if (data.section === 'body' && data.column.index >= 1 && data.column.index <= 3) {
                    // Data bars only apply to store rows, which have a string in the first cell.
                    if (typeof rawRow[0] === 'string') {
                        const value = data.cell.raw;
                        if (typeof value === 'number' && value > 0) {
                            const storeIdentifier = rawRow[0] as string;
                            const storeNumber = storeIdentifier.split(' - ')[0];

                            let amForStore: ShcComplianceManagerData | undefined;
                            // Find the manager this store belongs to in our report data structure
                            for (const hos of complianceReportData.hosData) {
                                const foundAm = hos.managers.find(am => am.stores.some(s => s.storeNumber === storeNumber));
                                if (foundAm) {
                                    amForStore = foundAm;
                                    break;
                                }
                            }

                            if (amForStore) {
                                // Get all scores for this manager's stores to determine the maximum value for scaling
                                const allScoresForAm = amForStore.stores.flatMap(s => [s.current, s.previous, s.start]);
                                const maxVal = Math.max(...allScoresForAm.filter((v): v is number => v !== null), 1);
                                
                                if (maxVal > 0) {
                                    const width = (value / maxVal) * (data.cell.width - data.cell.padding('horizontal'));
                                    doc.setFillColor(255, 193, 7); // Amber color
                                    doc.rect(data.cell.x + data.cell.padding('left'), data.cell.y + 4, width, data.cell.height - 8, 'F');
                                }
                            }
                        }
                    }
                }
            
                // Color formatting for the 'Change' column
                if (data.section === 'body' && data.column.index === 4) {
                    // Also only for store rows
                    if (typeof rawRow[0] === 'string') {
                        const value = data.cell.raw as string;
                        if (value && value.includes('%')) {
                            const numericVal = parseFloat(value.replace('%', ''));
                            if (!isNaN(numericVal)) {
                                if (numericVal < 0) doc.setFillColor(76, 175, 80); // Green for improvement
                                else if (numericVal <= 20) doc.setFillColor(255, 152, 0); // Orange for slight worsening
                                else doc.setFillColor(244, 67, 54); // Red for significant worsening
                                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                            }
                        }
                    }
                }
            }
        });

        doc.save(`shc_compliance_report_${selectedRdc}.pdf`);
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
                        <h3>
                            {t('shcReport.results.title')}
                            {excludedStoresCount > 0 && (
                                <span class={styles['excluded-count']}>
                                    {t('shcReport.results.excludedCount', { count: excludedStoresCount })}
                                </span>
                            )}
                        </h3>
                        <div class={styles['results-header-actions']}>
                            {storeCounts && <span class={styles['store-count-summary']}>{t('shcReport.results.storeCountSummary', storeCounts)}</span>}
                            <button class={sharedStyles['button-primary']} onClick={handleDownloadAllPdfsAsZip} disabled={isLoading}>
                                {t('shcReport.results.downloadAllPdf')}
                            </button>
                            <button class={sharedStyles['button-primary']} onClick={handleGenerateComplianceReport} disabled={isLoading} style={{backgroundColor: 'var(--success-color)'}}>
                                {t('shcReport.results.generateComplianceReport')}
                            </button>
                        </div>
                    </div>
                     <div class={sharedStyles['table-container']}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>{t('shcReport.table.warehouse')} / {t('shcReport.table.hos')} / {t('shcReport.table.am')} / {t('shcReport.table.store')}</th>
                                    <th>{t('shcReport.table.discrepancies')}</th>
                                    <th>{t('shcReport.table.avgPerStore')}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedResults.map(warehouse => (
                                    <>
                                        <tr class={`${styles['row-level']} ${styles['level-0']}`} onClick={() => toggleRow(`wh-${warehouse.warehouseName}`)}>
                                            <td><span class={`${styles.toggle} ${expandedRows.has(`wh-${warehouse.warehouseName}`) ? styles.expanded : ''}`}>▶</span> {warehouse.warehouseName}</td>
                                            <td>{warehouse.discrepancyCount}</td>
                                            <td class={styles['avg-per-store-cell']}>{warehouse.activeStoreCount > 0 ? (warehouse.discrepancyCount / warehouse.activeStoreCount).toFixed(2) : '-'}</td>
                                            <td></td>
                                        </tr>
                                        {expandedRows.has(`wh-${warehouse.warehouseName}`) && warehouse.hos.map(hos => (
                                            <>
                                                <tr class={`${styles['row-level']} ${styles['level-1']}`} onClick={() => toggleRow(`hos-${hos.hosName}`)}>
                                                    <td style={{ paddingLeft: '2rem' }}><span class={`${styles.toggle} ${expandedRows.has(`hos-${hos.hosName}`) ? styles.expanded : ''}`}>▶</span> {hos.hosName}</td>
                                                    <td>{hos.discrepancyCount}</td>
                                                    <td class={styles['avg-per-store-cell']}>{hos.activeStoreCount > 0 ? (hos.discrepancyCount / hos.activeStoreCount).toFixed(2) : '-'}</td>
                                                    <td></td>
                                                </tr>
                                                {expandedRows.has(`hos-${hos.hosName}`) && hos.managers.map(manager => (
                                                    <>
                                                        <tr class={`${styles['row-level']} ${styles['level-2']}`} onClick={() => toggleRow(`am-${manager.managerName}`)}>
                                                            <td style={{ paddingLeft: '4rem' }}><span class={`${styles.toggle} ${expandedRows.has(`am-${manager.managerName}`) ? styles.expanded : ''}`}>▶</span> {manager.managerName}</td>
                                                            <td>{manager.discrepancyCount}</td>
                                                            <td class={styles['avg-per-store-cell']}>{manager.activeStoreCount > 0 ? (manager.discrepancyCount / manager.activeStoreCount).toFixed(2) : '-'}</td>
                                                            <td></td>
                                                        </tr>
                                                        {expandedRows.has(`am-${manager.managerName}`) && manager.stores.map(store => (
                                                            <>
                                                                <tr class={`${styles['row-level']} ${styles['level-3']} ${store.isExcluded ? styles['excluded-store'] : ''}`} onClick={() => toggleRow(`st-${store.storeNumber}`)}>
                                                                    <td style={{ paddingLeft: '6rem' }}>
                                                                        <div class={styles['name-cell']}>
                                                                            <span>
                                                                                <span class={`${styles.toggle} ${expandedRows.has(`st-${store.storeNumber}`) ? styles.expanded : ''}`}>▶</span> {store.storeNumber}
                                                                                {store.isExcluded && <span class={styles['excluded-label']}>{t('shcReport.table.excluded')}</span>}
                                                                            </span>
                                                                            <div class={styles['row-actions']}>
                                                                                <button title={t('shcReport.table.tooltip.toggleExclusion')} class={styles['action-button']} onClick={(e) => { e.stopPropagation(); handleToggleExclusion(store.storeNumber); }}>🚫</button>
                                                                                <button title={t('shcReport.table.tooltip.exportPdf')} class={styles['action-button']} onClick={(e) => { e.stopPropagation(); handleExportStorePdf(store); }}>📄</button>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td>{store.discrepancyCount}</td>
                                                                    <td>-</td>
                                                                    <td></td>
                                                                </tr>
                                                                {expandedRows.has(`st-${store.storeNumber}`) && (
                                                                    <>
                                                                        <tr class={`${styles['divider-row']} ${store.isExcluded ? styles['excluded-store'] : ''}`}>
                                                                            <td colSpan={4}>
                                                                                <div class={styles['divider-content']}>
                                                                                    <span>{store.items.length} discrepancies found</span>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                        <tr class={`${styles['detail-header']} ${store.isExcluded ? styles['excluded-store'] : ''}`}>
                                                                            <td style={{ paddingLeft: '8rem' }}>{t('shcReport.table.itemNumber')}</td>
                                                                            <td>{t('shcReport.table.planShc')}</td>
                                                                            <td>{t('shcReport.table.storeShc')}</td>
                                                                            <td>{t('shcReport.table.diff')}</td>
                                                                        </tr>
                                                                        {store.items.map((item, index) => (
                                                                            <tr key={index} class={`${styles['detail-row']} ${store.isExcluded ? styles['excluded-store'] : ''}`}>
                                                                                <td style={{ paddingLeft: '8rem' }}>
                                                                                    <div>{item.articleNumber} - {item.articleName}</div>
                                                                                    <div class={`${styles.subtext} ${styles['item-details-extra']}`}>
                                                                                        <span>{t('shcReport.table.section')}: {item.settingSpecificallyFor}</span>
                                                                                        <span>{t('shcReport.table.itemGroup')}: {item.itemGroup}</span>
                                                                                        <span>{t('shcReport.table.sectionWidth')}: {item.settingWidth}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td>{item.planShc}</td>
                                                                                <td>{item.storeShc}</td>
                                                                                <td class={styles.diff}>{item.diff}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </>
                                                        ))}
                                                    </>
                                                ))}
                                            </>
                                        ))}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {complianceReportData && isComplianceDataReady && (
                <div class={styles['results-section']}>
                    <div class={styles['results-header']}>
                        <h3>{t('shcReport.complianceReport.title')}</h3>
                         <div class={styles['results-header-actions']}>
                            <button class={sharedStyles['button-secondary']} onClick={handleExportSnapshot} style={{backgroundColor: 'var(--info-color)'}}>
                                {t('shcReport.complianceReport.exportSnapshot')}
                            </button>
                            <button class={sharedStyles['button-primary']} onClick={handleExportCompliancePdf} style={{backgroundColor: 'var(--success-color)'}}>
                                {t('shcReport.complianceReport.exportPdf')}
                            </button>
                        </div>
                    </div>
                    <div class={sharedStyles['table-container']}>
                        <table class={styles['compliance-table']}>
                           <thead>
                                <tr>
                                    <th>{t('shcReport.complianceReport.storeName')}</th>
                                    <th>{t('shcReport.complianceReport.currently')}</th>
                                    <th>{t('shcReport.complianceReport.weekMinus1')}</th>
                                    <th>{t('shcReport.complianceReport.start')}</th>
                                    <th>{t('shcReport.complianceReport.change')}</th>
                                </tr>
                            </thead>
                            <tbody>
                               {complianceReportData.hosData.map(hos => (<>
                                   <tr class={styles['level-0']}>
                                       <td>{hos.name}</td>
                                       <td>{hos.current}</td>
                                       <td>{hos.previous}</td>
                                       <td>{hos.start}</td>
                                       <td>{hos.change !== null ? `${(hos.change * 100).toFixed(0)}%` : '-'}</td>
                                   </tr>
                                   {hos.managers.map(am => (<>
                                       <tr class={styles['level-1']}>
                                           <td style={{paddingLeft: '2rem'}}>{am.name}</td>
                                           <td>{am.current}</td>
                                           <td>{am.previous}</td>
                                           <td>{am.start}</td>
                                           <td>{am.change !== null ? `${(am.change * 100).toFixed(0)}%` : '-'}</td>
                                       </tr>
                                       {am.stores.map(store => {
                                            const change = store.change;
                                            let changeClass = '';
                                            if (change !== null) {
                                                if (change < 0) changeClass = styles['change-positive'];
                                                else if (change <= 0.2) changeClass = styles['change-neutral'];
                                                else changeClass = styles['change-negative'];
                                            }
                                           return (
                                               <tr class={styles['level-2']}>
                                                   <td style={{paddingLeft: '4rem'}}>{store.storeNumber} - {store.storeName}</td>
                                                   <td><div class={styles['data-bar']} style={{'--value': `${(store.current ?? 0) / Math.max(am.current, 1) * 100}%`}}></div>{store.current ?? '-'}</td>
                                                   <td><div class={styles['data-bar']} style={{'--value': `${(store.previous ?? 0) / Math.max(am.current, 1) * 100}%`}}></div>{store.previous ?? '-'}</td>
                                                   <td><div class={styles['data-bar']} style={{'--value': `${(store.start ?? 0) / Math.max(am.current, 1) * 100}%`}}></div>{store.start ?? '-'}</td>
                                                   <td class={changeClass}>{change !== null ? `${(change * 100).toFixed(0)}%` : '-'}</td>
                                               </tr>
                                           )
                                       })}
                                   </>))}
                               </>))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {!isComplianceDataReady && (
                 <div class={`${sharedStyles['status-container']} ${sharedStyles.error}`}>
                    <p class={sharedStyles['status-text']}>{t('shcReport.complianceReport.noData')}</p>
                </div>
            )}
            
            {mismatches.length > 0 && (
                <div class={styles['results-section']}>
                    <h3>{t('shcReport.results.mismatchesTitle')} ({mismatches.length})</h3>
                    <div class={styles['mismatch-container']}>
                        <div class={`${styles['mismatch-row']} ${styles['mismatch-header']}`}>
                            <span>Mismatch Type</span>
                            <span>Store Number</span>
                            <span>Article Number</span>
                            <span>Details</span>
                        </div>
                        {Object.entries(groupedMismatches).map(([type, stores]) => {
                            const typeKey = `mismatch-type-${type}`;
                            const isTypeExpanded = expandedMismatches.has(typeKey);
                            const totalMismatchesForType = Object.values(stores).reduce((sum, items) => sum + items.length, 0);
                            return (
                                <div key={typeKey}>
                                    <div class={`${styles['mismatch-row']} ${styles['mismatch-type-header']}`} onClick={() => toggleMismatchGroup(typeKey)}>
                                        <div class={styles['mismatch-type-title']}>
                                            <span class={`${styles['mismatch-toggle']} ${isTypeExpanded ? styles.expanded : ''}`}>▶</span>
                                            {type}
                                            <span class={styles['mismatch-count']}>({totalMismatchesForType})</span>
                                        </div>
                                    </div>
                                    {isTypeExpanded && Object.entries(stores).map(([storeNumber, items]) => {
                                        const storeKey = `mismatch-store-${type}-${storeNumber}`;
                                        const isStoreExpanded = expandedMismatches.has(storeKey);
                                        return (
                                            <div key={storeKey}>
                                                <div class={`${styles['mismatch-row']} ${styles['mismatch-store-header']}`} onClick={() => toggleMismatchGroup(storeKey)}>
                                                    <div class={styles['mismatch-store-title']} style={{ paddingLeft: '2rem' }}>
                                                        <span class={`${styles['mismatch-toggle']} ${isStoreExpanded ? styles.expanded : ''}`}>▶</span>
                                                        Store: {storeNumber}
                                                        <span class={styles['mismatch-count']}>({items.length})</span>
                                                    </div>
                                                </div>
                                                {isStoreExpanded && items.map((item, index) => (
                                                    <div class={`${styles['mismatch-row']} ${styles['mismatch-item-row']}`} key={index} style={{ paddingLeft: '4rem' }}>
                                                        <span></span> {/* Empty cell for alignment */}
                                                        <span>{item.storeNumber}</span>
                                                        <span>{item.articleNumber}</span>
                                                        <span>{item.details}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
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

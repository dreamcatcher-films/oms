import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import type { VNode } from 'preact';
import { useTranslation } from '../i18n';
import type { StatusReportResultItem, StatusReportWorkerMessage, StatusReportWorkerRequest, RDC, ExclusionListData } from '../utils/types';
import { itemGroupMap } from '../utils/itemGroups';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './StatusReportView.module.css';
import sharedStyles from '../styles/shared.module.css';


const PAGE_SIZE = 20;
const SUSPICIOUS_STATUSES = ['5', '6', '7', '9', '10', '11', '12'];
const EXCLUDABLE_STATUSES = ['5', '6', '7', '8', '9', '10', '11', '12','-'];
const STATUTORY_EXCLUDED_ITEM_GROUPS = new Set(['10', '11', '12', '13', '73', '90', '91', '92']);
const SESSION_STORAGE_KEY = 'statusReportFilters';

export const StatusReportView = (props: { rdcList: RDC[], exclusionList: ExclusionListData, onUpdateExclusionList: () => void }) => {
    const { t, language } = useTranslation();
    const { rdcList, exclusionList, onUpdateExclusionList } = props;
    const workerRef = useRef<Worker | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
    const [reportResults, setReportResults] = useState<StatusReportResultItem[] | null>(null);
    
    const [filters, setFilters] = useState({
        productIdFilter: '',
        pastedProductIds: [] as string[],
        dominantStatusFilter: '',
        dispoGroupFilter: '',
        itemGroupFilter: '',
        excludeNoStock: true,
        showOnlyUndetermined: false,
        excludedDominantStatuses: EXCLUDABLE_STATUSES.filter(s => s !== '8'),
        includeConsistent: false,
    });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [sortByWarehouse, setSortByWarehouse] = useState<string | null>(null);

    const [productNameWidth, setProductNameWidth] = useState<number | null>(200);
    const resizerRef = useRef<HTMLDivElement>(null);
    const thRef = useRef<HTMLTableCellElement>(null);
    const isResizingRef = useRef(false);
    
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

    const [tooltip, setTooltip] = useState<{ visible: boolean; content: VNode | null; x: number; y: number; }>({
        visible: false, content: null, x: 0, y: 0,
    });
    
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [selectedExportWarehouse, setSelectedExportWarehouse] = useState('all');
    const [exportFormat, setExportFormat] = useState<'summary' | 'comparative'>('summary');
    const [selectedExportStatus, setSelectedExportStatus] = useState('all');

    const rdcNameMap = useMemo(() => new Map(rdcList.map(r => [r.id, r.name])), [rdcList]);

    useEffect(() => {
        workerRef.current = new Worker(new URL('../statusReport.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e: MessageEvent<StatusReportWorkerMessage>) => {
            const { type, payload } = e.data;
            if (type === 'progress') {
                setProgress(payload);
            } else if (type === 'complete') {
                setReportResults(payload);
                setIsLoading(false);
                setProgress(null);
            }
        };

        return () => workerRef.current?.terminate();
    }, []);

    // Load filters from session storage on mount
    useEffect(() => {
        try {
            const savedFiltersJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (savedFiltersJSON) {
                const savedFilters = JSON.parse(savedFiltersJSON);
                setFilters(prev => ({ ...prev, ...savedFilters }));
            }
        } catch (e) {
            console.error("Failed to load status report filters", e);
        }
    }, []);

    // Save filters to session storage on change
    useEffect(() => {
        try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(filters));
        } catch (e) {
            console.error("Failed to save status report filters", e);
        }
    }, [filters]);


    const handleRunReport = () => {
        if (!workerRef.current) return;
        setIsLoading(true);
        setReportResults(null);
        setProgress({ processed: 0, total: 0 });
        const request: StatusReportWorkerRequest = {
            allWarehouseIds: rdcList.map(r => r.id),
        };
        workerRef.current.postMessage(request);
    };
    
    const availableDominantStatuses = useMemo(() => {
        if (!reportResults) return [];
        const statuses = new Set(reportResults.map(r => r.dominantStatusInfo.status).filter(s => s !== '-'));
        return Array.from(statuses).sort();
    }, [reportResults]);

    const availableDispoGroups = useMemo(() => {
        if (!reportResults) return [];
        const groups = new Set(reportResults.map(r => r.dispoGroup).filter(Boolean));
        return Array.from(groups).sort();
    }, [reportResults]);

    const availableItemGroups = useMemo(() => {
        if (!reportResults) return [];
        const groups = new Set(reportResults.map(r => r.itemGroup).filter(Boolean));
        return Array.from(groups).sort();
    }, [reportResults]);

    const filteredResults = useMemo(() => {
        if (!reportResults) return [];
        
        let results = reportResults;

        if (!filters.includeConsistent) {
            results = results.filter(item => item.isInconsistent);
        }
        
        return results.filter(item => {
            if (filters.pastedProductIds.length > 0) {
                if (!filters.pastedProductIds.includes(item.productId)) {
                    return false;
                }
            } else if (filters.productIdFilter && !item.productId.toLowerCase().includes(filters.productIdFilter.toLowerCase())) {
                return false;
            }
            if (filters.dominantStatusFilter && item.dominantStatusInfo.status !== filters.dominantStatusFilter) {
                return false;
            }
            if (filters.dispoGroupFilter && item.dispoGroup !== filters.dispoGroupFilter) {
                return false;
            }
            if (filters.itemGroupFilter && item.itemGroup !== filters.itemGroupFilter) {
                return false;
            }
            if (filters.excludeNoStock) {
                const totalStock = Object.values(item.stockByWarehouse).reduce((sum, stock) => sum + stock, 0);
                if (totalStock <= 0) return false;
            }
            if (filters.showOnlyUndetermined && item.dominantStatusInfo.type !== 'none') {
                return false;
            }
            if (filters.excludedDominantStatuses.length > 0 && filters.excludedDominantStatuses.includes(item.dominantStatusInfo.status)) {
                return false;
            }
            return true;
        });
    }, [reportResults, filters]);
    
    const combinedSummaryData = useMemo(() => {
        if (!reportResults) return null;

        const summary: {
            [whId: string]: {
                totalItemsInReport: number;
                filteredItemsChecked: number;
                filteredStatus8Items: number;
                filteredSuspiciousCounts: { [status: string]: number };
                filteredExcludedSuspiciousCount: number;
            }
        } = {};

        rdcList.forEach(rdc => {
            summary[rdc.id] = {
                totalItemsInReport: 0,
                filteredItemsChecked: 0,
                filteredStatus8Items: 0,
                filteredSuspiciousCounts: {},
                filteredExcludedSuspiciousCount: 0,
            };
        });
        
        for (const item of reportResults) {
            for (const rdc of rdcList) {
                const whId = rdc.id;
                if (item.statusesByWarehouse[whId] !== undefined) {
                    summary[whId].totalItemsInReport++;
                }
            }
        }

        for (const item of filteredResults) {
             for (const rdc of rdcList) {
                const whId = rdc.id;
                 if (item.statusesByWarehouse[whId] !== undefined) {
                    summary[whId].filteredItemsChecked++;
                    const status = item.statusesByWarehouse[whId];
                    if (status === '8') {
                        summary[whId].filteredStatus8Items++;
                    }
                    
                    const isPotentiallySuspicious = item.isInconsistent && status !== item.dominantStatusInfo.status && SUSPICIOUS_STATUSES.includes(status);

                    if (isPotentiallySuspicious) {
                        if (exclusionList.list.has(item.productId)) {
                            summary[whId].filteredExcludedSuspiciousCount++;
                        } else {
                            const isStatutoryExcluded = STATUTORY_EXCLUDED_ITEM_GROUPS.has(item.itemGroup);
                            const isWh290SpecialExclusion = whId === '290' && (item.itemGroup === '20' || item.itemGroup === '74');

                            if (!isStatutoryExcluded && !isWh290SpecialExclusion) {
                                summary[whId].filteredSuspiciousCounts[status] = (summary[whId].filteredSuspiciousCounts[status] || 0) + 1;
                            }
                        }
                    }
                }
            }
        }
        
        return summary;
    }, [filteredResults, reportResults, rdcList, exclusionList]);
    
    const foundSuspiciousStatuses = useMemo(() => {
        if (!combinedSummaryData) return [];
        const statuses = new Set<string>();
        Object.values(combinedSummaryData).forEach(whData => {
            Object.keys(whData.filteredSuspiciousCounts).forEach(status => statuses.add(status));
        });
        return Array.from(statuses).sort((a,b) => parseInt(a, 10) - parseInt(b, 10));
    }, [combinedSummaryData]);

    const highlightedValues = useMemo(() => {
        if (!combinedSummaryData) return new Map<string, Set<number>>();
        const topValuesMap = new Map<string, Set<number>>();

        for (const status of foundSuspiciousStatuses) {
            const values = Object.values(combinedSummaryData)
                .map(whData => whData.filteredSuspiciousCounts[status] || 0)
                .filter(count => count > 0)
                .sort((a, b) => b - a);
            
            const top3Values = new Set(values.slice(0, 3));
            topValuesMap.set(status, top3Values);
        }
        return topValuesMap;
    }, [combinedSummaryData, foundSuspiciousStatuses]);

    const sortedAndFilteredResults = useMemo(() => {
        if (!filteredResults) return [];
        if (!sortByWarehouse) return filteredResults;
        
        return [...filteredResults].sort((a, b) => {
            const aHasInconsistency = a.statusesByWarehouse[sortByWarehouse] && a.statusesByWarehouse[sortByWarehouse] !== a.dominantStatusInfo.status;
            const bHasInconsistency = b.statusesByWarehouse[sortByWarehouse] && b.statusesByWarehouse[sortByWarehouse] !== b.dominantStatusInfo.status;

            if (aHasInconsistency && !bHasInconsistency) return -1;
            if (!aHasInconsistency && bHasInconsistency) return 1;
            
            return a.productId.localeCompare(b.productId);
        });
    }, [filteredResults, sortByWarehouse]);


    useEffect(() => {
        setCurrentPage(1);
    }, [filteredResults, sortByWarehouse]);

    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return sortedAndFilteredResults.slice(startIndex, startIndex + PAGE_SIZE);
    }, [sortedAndFilteredResults, currentPage]);
    
    const totalPages = Math.ceil(sortedAndFilteredResults.length / PAGE_SIZE);

    const warehouseColumns = useMemo(() => {
        if (!reportResults) return [];
        const allWarehouses = new Set<string>();
        reportResults.forEach(item => {
            Object.keys(item.statusesByWarehouse).forEach(wh => allWarehouses.add(wh));
        });
        return Array.from(allWarehouses).filter(wh => rdcNameMap.has(wh)).sort();
    }, [reportResults, rdcNameMap]);

    const handleFilterChange = (key: keyof typeof filters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            productIdFilter: '',
            pastedProductIds: [],
            dominantStatusFilter: '',
            dispoGroupFilter: '',
            itemGroupFilter: '',
            excludeNoStock: true,
            showOnlyUndetermined: false,
            excludedDominantStatuses: EXCLUDABLE_STATUSES.filter(s => s !== '8'),
            includeConsistent: false,
        });
    };

    const handleExcludeStatusChange = (status: string, isChecked: boolean) => {
        setFilters(prev => {
            const currentExcluded = prev.excludedDominantStatuses;
            if (isChecked) {
                return { ...prev, excludedDominantStatuses: [...currentExcluded, status] };
            } else {
                return { ...prev, excludedDominantStatuses: currentExcluded.filter(s => s !== status) };
            }
        });
    };

    const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const pastedText = e.clipboardData?.getData('text');
        if (pastedText) {
            const ids = pastedText
                .split(/[\s,;\t\n]+/)
                .map(s => {
                    const trimmed = s.trim();
                    if (/^\d+$/.test(trimmed)) {
                        return String(parseInt(trimmed, 10));
                    }
                    return trimmed;
                })
                .filter(Boolean);
            if (ids.length > 0) {
                setFilters(prev => ({ ...prev, pastedProductIds: ids, productIdFilter: '' }));
            }
        }
    };
    
    const handleCellMouseEnter = useCallback((
        e: MouseEvent,
        item: StatusReportResultItem,
        warehouseId: string,
        isWh290SpecialExclusion: boolean
    ) => {
        const isExcluded = exclusionList.list.has(item.productId);
        const isStatutoryExcluded = STATUTORY_EXCLUDED_ITEM_GROUPS.has(item.itemGroup);

        let content: VNode | null = null;
        if (isWh290SpecialExclusion || isExcluded || isStatutoryExcluded) {
            content = <div><strong>{t('statusReport.tooltips.excluded')}</strong></div>;
        } else {
            const stock = item.stockByWarehouse[warehouseId];
            const orderInfo = item.openOrdersByWarehouse[warehouseId];
            content = (
                <div>
                    <p><strong>{t('columns.product.stockOnHand')}:</strong> {stock !== undefined ? stock.toLocaleString(language) : 'N/A'}</p>
                    <p><strong>{t('dataType.openOrders')}:</strong> {orderInfo?.hasFutureOrders ? t('common.yesShort') : t('common.noShort')}</p>
                    {orderInfo?.hasFutureOrders && orderInfo.nextOrderDate && (
                        <p><strong>{t('columns.openOrder.deliveryDate')}:</strong> {orderInfo.nextOrderDate}</p>
                    )}
                </div>
            );
        }
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltip({
            visible: true,
            content,
            x: rect.left,
            y: rect.top
        });
    }, [exclusionList, language, t]);

    const handleCellMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    const getActiveFiltersSummary = () => {
        const activeFilters = [];
        if (filters.pastedProductIds.length > 0) activeFilters.push(`${t('columns.product.productId')}: ${t('statusReport.filters.pastedInfo', { count: filters.pastedProductIds.length })}`);
        else if (filters.productIdFilter) activeFilters.push(`${t('columns.product.productId')}: ${filters.productIdFilter}`);
        if (filters.dominantStatusFilter) activeFilters.push(`${t('statusReport.filters.dominantStatus')}: ${filters.dominantStatusFilter}`);
        if (filters.dispoGroupFilter) activeFilters.push(`${t('columns.product.dispoGroup')}: ${filters.dispoGroupFilter}`);
        if (filters.itemGroupFilter) activeFilters.push(`${t('columns.product.itemGroup')}: ${filters.itemGroupFilter}`);
        if (filters.excludeNoStock) activeFilters.push(t('statusReport.filters.excludeNoStock'));
        if (filters.showOnlyUndetermined) activeFilters.push(t('statusReport.filters.showOnlyUndetermined'));
        if (filters.includeConsistent) activeFilters.push(t('statusReport.filters.includeConsistent'));
        if (filters.excludedDominantStatuses.length > 0 && filters.excludedDominantStatuses.length < EXCLUDABLE_STATUSES.length) {
            activeFilters.push(`${t('statusReport.filters.excludeWhenDominantIs')} ${EXCLUDABLE_STATUSES.filter(s => !filters.excludedDominantStatuses.includes(s)).join(', ')}`);
        }
        return activeFilters.length > 0 ? activeFilters.join('; ') : 'None';
    };
    
    const generatePdf = () => {
        if (!sortedAndFilteredResults) return;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const now = new Date();
        const dateStr = now.toLocaleDateString(language);
        const timeStr = now.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });

        const addHeader = (docInstance: any) => {
            docInstance.setFontSize(14);
            docInstance.text(t('statusReport.title'), 40, 40);
            docInstance.setFontSize(8);
            docInstance.text(`${t('statusReport.pdf.generatedOn')}: ${dateStr} ${timeStr}`, 40, 55);
            docInstance.text(`${t('statusReport.pdf.activeFilters')}: ${getActiveFiltersSummary()}`, 40, 65);
        };
        
        addHeader(doc);

        if (exportFormat === 'comparative') {
            doc.setFontSize(18);
            doc.text(t('statusReport.results.title'), 40, 90);
            
            const tableHead = [
                t('columns.product.productId'),
                t('columns.product.name'),
                t('columns.product.caseSize'),
                t('statusReport.results.dominantStatus'),
                ...warehouseColumns
            ];

            const tableBody = sortedAndFilteredResults.map(item => [
                item.productId,
                item.productName,
                item.caseSize,
                `${item.dominantStatusInfo.status} (${t(`statusReport.statusTypes.${item.dominantStatusInfo.type}`)})`,
                ...warehouseColumns.map(wh => item.statusesByWarehouse[wh] ?? '-')
            ]);

            autoTable(doc, {
                head: [tableHead],
                body: tableBody,
                startY: 100,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 2, overflow: 'ellipsize' },
                headStyles: { fillColor: [248, 249, 250], textColor: [51, 51, 51], fontStyle: 'bold' },
                didParseCell: (data: any) => {
                    if (data.section !== 'body') {
                        // Prevent conditional coloring on header cells
                        data.cell.styles.fillColor = [248, 249, 250]; 
                        return;
                    }

                    const item = sortedAndFilteredResults[data.row.index];
                    if (!item) return;

                    const isExcludedByList = exclusionList.list.has(item.productId);
                    const isStatutoryExcluded = STATUTORY_EXCLUDED_ITEM_GROUPS.has(item.itemGroup);
                    if (isExcludedByList || isStatutoryExcluded) {
                        data.cell.styles.fillColor = '#d4edda';
                        return;
                    }

                    if (data.column.index >= 4) {
                        const wh = warehouseColumns[data.column.index - 4];
                        
                        const isWh290SpecialExclusion = wh === '290' && (item.itemGroup === '20' || item.itemGroup === '74');
                        if (isWh290SpecialExclusion) {
                            data.cell.styles.fillColor = '#d4edda';
                            return;
                        }
                        
                        const cellStatus = item.statusesByWarehouse[wh];
                        if (cellStatus && cellStatus !== item.dominantStatusInfo.status) {
                            data.cell.styles.fillColor = '#f8d7da';
                            data.cell.styles.textColor = '#721c24';
                        }
                    }
                },
            });

        } else { // Summary format
            const warehousesToExport = selectedExportWarehouse === 'all'
                ? rdcList.filter(rdc => warehouseColumns.includes(rdc.id))
                : rdcList.filter(rdc => rdc.id === selectedExportWarehouse);

            let isFirstSection = true;

            for (const warehouse of warehousesToExport) {
                if (!isFirstSection) {
                    doc.addPage();
                    addHeader(doc);
                }
                
                doc.setFontSize(16);
                doc.text(`${t('statusReport.pdf.reportForWarehouse')}: ${warehouse.id} - ${warehouse.name}`, 40, 90);

                const itemsForWarehouse = sortedAndFilteredResults.filter(item => {
                    const whId = warehouse.id;
                    const status = item.statusesByWarehouse[whId];
                
                    if (!status || !item.isInconsistent || status === item.dominantStatusInfo.status || !SUSPICIOUS_STATUSES.includes(status)) {
                        return false;
                    }
                    if (selectedExportStatus !== 'all' && status !== selectedExportStatus) {
                        return false;
                    }
                    if (exclusionList.list.has(item.productId)) return false;
                    if (STATUTORY_EXCLUDED_ITEM_GROUPS.has(item.itemGroup)) return false;
                    if (whId === '290' && (item.itemGroup === '20' || item.itemGroup === '74')) return false;
                
                    return true;
                });

                if (itemsForWarehouse.length === 0) {
                    doc.setFontSize(10);
                    doc.text(t('statusReport.pdf.noInconsistencies'), 40, 110);
                    isFirstSection = false;
                    continue;
                }

                const suspiciousStatusCounts = itemsForWarehouse.reduce((acc, item) => {
                    const status = item.statusesByWarehouse[warehouse.id];
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const sortedSuspiciousStatuses = Object.keys(suspiciousStatusCounts).sort((a, b) =>
                    suspiciousStatusCounts[b] - suspiciousStatusCounts[a]
                );
                
                let startY = 110;

                for (const status of sortedSuspiciousStatuses) {
                    const itemsForStatus = itemsForWarehouse.filter(item => item.statusesByWarehouse[warehouse.id] === status);
                    
                    if (startY > doc.internal.pageSize.height - 100) {
                        doc.addPage();
                        addHeader(doc);
                        startY = 90;
                    }
                    
                    doc.setFontSize(12);
                    doc.text(t('statusReport.pdf.groupedByStatus', { status }), 40, startY);
                    
                    const tableHead = [
                        t('columns.product.productId'),
                        t('columns.product.name'),
                        t('columns.product.dispoGroup'),
                        t('columns.product.itemGroup'),
                        t('columns.product.caseSize'),
                        t('statusReport.results.dominantStatus'),
                        `${t('statusReport.pdf.statusIn')} ${warehouse.id}`,
                    ];

                    const tableBody = itemsForStatus.map(item => [
                        item.productId,
                        item.productName,
                        item.dispoGroup,
                        `${item.itemGroup} - ${itemGroupMap[item.itemGroup] || ''}`,
                        item.caseSize,
                        `${item.dominantStatusInfo.status} (${t(`statusReport.statusTypes.${item.dominantStatusInfo.type}`)})`,
                        item.statusesByWarehouse[warehouse.id]
                    ]);

                    autoTable(doc, {
                        head: [tableHead],
                        body: tableBody,
                        startY: startY + 10,
                        theme: 'grid',
                        styles: { fontSize: 8, cellPadding: 2, overflow: 'ellipsize' },
                        headStyles: { fillColor: [248, 249, 250], textColor: [51, 51, 51], fontStyle: 'bold' },
                        didParseCell: (data: any) => {
                           if (data.section === 'body' && data.column.index === 6) {
                               data.cell.styles.fillColor = '#f8d7da';
                               data.cell.styles.textColor = '#721c24';
                           } else if (data.section !== 'body') {
                               data.cell.styles.fillColor = [248, 249, 250];
                           }
                        },
                    });
                    startY = (doc as any).lastAutoTable.finalY + 20;
                }
                isFirstSection = false;
            }
        }
        
        doc.save(`oms_status_report_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportModalVisible(false);
    };

    const handleMouseDown = useCallback((e: MouseEvent) => {
        isResizingRef.current = true;
        resizerRef.current?.classList.add(styles.resizing);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizingRef.current || !thRef.current) return;
        const newWidth = e.clientX - thRef.current.getBoundingClientRect().left;
        if (newWidth > 100) {
            setProductNameWidth(newWidth);
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isResizingRef.current = false;
        resizerRef.current?.classList.remove(styles.resizing);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    return (
        <div class={styles['status-report-view']}>
            {isExportModalVisible && (
                <div class={sharedStyles['login-modal-overlay']}>
                    <div class={sharedStyles['login-modal']} style={{textAlign: 'left'}}>
                        <h3>{t('statusReport.pdf.exportOptionsTitle')}</h3>
                        <div class={sharedStyles['login-form']}>
                            <div class={sharedStyles['filter-group']}>
                                <label for="export-format-select">{t('statusReport.pdf.format')}</label>
                                <select
                                    id="export-format-select"
                                    value={exportFormat}
                                    onChange={(e) => setExportFormat((e.target as HTMLSelectElement).value as 'summary' | 'comparative')}
                                >
                                    <option value="summary">{t('statusReport.pdf.summaryFormat')}</option>
                                    <option value="comparative">{t('statusReport.pdf.comparativeFormat')}</option>
                                </select>
                            </div>

                            <div class={sharedStyles['filter-group']}>
                                <label for="export-warehouse-select">{t('statusReport.pdf.selectWarehouse')}</label>
                                <select
                                    id="export-warehouse-select"
                                    value={selectedExportWarehouse}
                                    onChange={(e) => setSelectedExportWarehouse((e.target as HTMLSelectElement).value)}
                                    disabled={exportFormat === 'comparative'}
                                >
                                    <option value="all">{t('statusReport.pdf.allWarehouses')}</option>
                                    {rdcList.map(rdc => <option key={rdc.id} value={rdc.id}>{rdc.id} - {rdc.name}</option>)}
                                </select>
                            </div>
                            
                             <div class={sharedStyles['filter-group']}>
                                <label for="export-status-select">{t('statusReport.pdf.filterByStatus')}</label>
                                <select
                                    id="export-status-select"
                                    value={selectedExportStatus}
                                    onChange={(e) => setSelectedExportStatus((e.target as HTMLSelectElement).value)}
                                    disabled={exportFormat === 'comparative'}
                                >
                                    <option value="all">{t('statusReport.pdf.allStatuses')}</option>
                                    {foundSuspiciousStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                                </select>
                            </div>

                            <div class={sharedStyles['filter-actions']} style={{justifyContent: 'center', marginTop: '1rem'}}>
                                <button class={sharedStyles['button-primary']} onClick={generatePdf}>{t('statusReport.pdf.exportButton')}</button>
                                <button class={sharedStyles['button-secondary']} onClick={() => setIsExportModalVisible(false)}>{t('statusReport.pdf.cancelButton')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {tooltip.visible && (
                <div 
                    class={styles['status-report-tooltip']}
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
            <div class={styles['status-report-controls']}>
                <h3>{t('statusReport.title')}</h3>
                <p>{t('statusReport.description')}</p>
                 {exclusionList.lastUpdated && (
                    <div class={styles['exclusion-list-info-bar']}>
                        <span class={styles['info-text']}>
                            {t('statusReport.exclusionInfo.info', { 
                                date: exclusionList.lastUpdated.toLocaleDateString(language), 
                                time: exclusionList.lastUpdated.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' }),
                                count: exclusionList.list.size 
                            })}
                        </span>
                        <button class={sharedStyles['button-secondary']} onClick={onUpdateExclusionList}>
                            {t('statusReport.exclusionInfo.updateButton')}
                        </button>
                    </div>
                )}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem'}}>
                    <button class={sharedStyles['button-primary']} onClick={handleRunReport} disabled={isLoading}>
                        {reportResults ? t('simulations.buttons.rerun') : t('statusReport.runReport')}
                    </button>
                    {reportResults && (
                         <button class={sharedStyles['button-secondary']} onClick={() => setIsExportModalVisible(true)} disabled={sortedAndFilteredResults.length === 0}>
                            {t('statusReport.results.exportPdf')}
                        </button>
                    )}
                </div>
                 {reportResults && (
                    <div class={styles['status-report-filters']}>
                        <div class={sharedStyles['filter-group']}>
                            <label htmlFor="sr-productId">{t('columns.product.productId')}</label>
                            <input
                                id="sr-productId"
                                type="text"
                                value={filters.pastedProductIds.length > 0 ? t('statusReport.filters.pastedInfo', { count: filters.pastedProductIds.length }) : filters.productIdFilter}
                                onInput={(e) => {
                                    if (filters.pastedProductIds.length > 0) handleFilterChange('pastedProductIds', []);
                                    handleFilterChange('productIdFilter', (e.target as HTMLInputElement).value);
                                }}
                                onPaste={handlePaste}
                                placeholder={t('dataPreview.filters.productIdPlaceholder')}
                            />
                        </div>
                        <div class={sharedStyles['filter-group']}>
                            <label htmlFor="sr-dispoGroup">{t('columns.product.dispoGroup')}</label>
                            <select id="sr-dispoGroup" value={filters.dispoGroupFilter} onChange={(e) => handleFilterChange('dispoGroupFilter', (e.target as HTMLSelectElement).value)}>
                                <option value="">{t('dataPreview.filters.all')}</option>
                                {availableDispoGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div class={sharedStyles['filter-group']}>
                            <label htmlFor="sr-itemGroup">{t('columns.product.itemGroup')}</label>
                            <select id="sr-itemGroup" value={filters.itemGroupFilter} onChange={(e) => handleFilterChange('itemGroupFilter', (e.target as HTMLSelectElement).value)}>
                                <option value="">{t('dataPreview.filters.all')}</option>
                                {availableItemGroups.map(g => <option key={g} value={g}>{g} - {itemGroupMap[g] || ''}</option>)}
                            </select>
                        </div>
                         <div class={sharedStyles['filter-group']}>
                            <label htmlFor="sr-dominantStatus">{t('statusReport.filters.dominantStatus')}</label>
                            <select id="sr-dominantStatus" value={filters.dominantStatusFilter} onChange={(e) => handleFilterChange('dominantStatusFilter', (e.target as HTMLSelectElement).value)}>
                                <option value="">{t('dataPreview.filters.all')}</option>
                                {availableDominantStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div class={styles['status-report-checkbox-filters']}>
                             <label>
                                <input type="checkbox" checked={filters.excludeNoStock} onChange={(e) => handleFilterChange('excludeNoStock', (e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.excludeNoStock')}
                            </label>
                            <label>
                                <input type="checkbox" checked={filters.showOnlyUndetermined} onChange={(e) => handleFilterChange('showOnlyUndetermined', (e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.showOnlyUndetermined')}
                            </label>
                            <label>
                                <input type="checkbox" checked={filters.includeConsistent} onChange={(e) => handleFilterChange('includeConsistent', (e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.includeConsistent')}
                            </label>
                        </div>
                        <div class={sharedStyles['filter-actions']}>
                            <button class={sharedStyles['button-secondary']} onClick={handleClearFilters}>{t('dataPreview.filters.clear')}</button>
                        </div>
                        <div class={styles['dominant-status-exclude-filter']}>
                            <label class={styles['filter-group-label']}>{t('statusReport.filters.excludeWhenDominantIs')}</label>
                            <div class={styles['checkbox-group']}>
                                {EXCLUDABLE_STATUSES.map(status => (
                                    <label key={status}>
                                        <input
                                            type="checkbox"
                                            checked={filters.excludedDominantStatuses.includes(status)}
                                            onChange={(e) => handleExcludeStatusChange(status, (e.target as HTMLInputElement).checked)}
                                        />
                                        {status}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                 )}
            </div>
            
            {isLoading && (
                <div class={styles['report-progress-section']}>
                    <h4>{t('statusReport.runningTitle')}</h4>
                    {progress && progress.total > 0 ? (
                        <>
                            <p>{t('statusReport.runningDescription', { processed: progress.processed, total: progress.total })}</p>
                            <div class={sharedStyles['progress-bar-container']}>
                                <div class={sharedStyles['progress-bar']} style={{ width: `${(progress.processed / progress.total) * 100}%` }}></div>
                            </div>
                        </>
                    ) : (
                        <div class={sharedStyles.spinner}></div>
                    )}
                </div>
            )}

            {reportResults && !isLoading && combinedSummaryData && (
                 <div class={styles['status-report-summary']}>
                     <div class={`${styles['summary-header']} ${!isSummaryExpanded ? styles.collapsed : ''}`} onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                        <h3>{t('statusReport.summary.title')}</h3>
                        <span class={styles.arrow}>▼</span>
                    </div>
                    {isSummaryExpanded && (
                        <div class={styles['summary-table-container']}>
                            <table class={styles['summary-table']}>
                                <thead>
                                    <tr>
                                        <th rowSpan={2}>{t('statusReport.summary.warehouse')}</th>
                                        <th rowSpan={2}>{t('statusReport.summary.itemsChecked')}</th>
                                        <th class={styles['group-header']} colSpan={foundSuspiciousStatuses.length || 1}>{t('statusReport.summary.suspiciousStatuses')}</th>
                                        <th rowSpan={2}>{t('statusReport.summary.excluded')}</th>
                                        <th rowSpan={2}>{t('statusReport.summary.status8Items')}</th>
                                    </tr>
                                    <tr>
                                        {foundSuspiciousStatuses.map(status => <th key={status}>{status}</th>)}
                                        {foundSuspiciousStatuses.length === 0 && <th>-</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(combinedSummaryData)
                                        .filter(([whId, data]) => rdcNameMap.has(whId) && data.totalItemsInReport > 0)
                                        .map(([whId, data]) => (
                                        <tr key={whId}>
                                            <td><strong>{whId}</strong> - {rdcNameMap.get(whId) || ''}</td>
                                            <td>{data.filteredItemsChecked.toLocaleString()}</td>
                                            {foundSuspiciousStatuses.map(status => {
                                                const count = data.filteredSuspiciousCounts[status] || 0;
                                                const total = data.totalItemsInReport;
                                                const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
                                                const isHighlighted = highlightedValues.get(status)?.has(count) && count > 0;
                                                return (
                                                    <td key={status} class={isHighlighted ? styles['highlighted-suspicious-cell'] : ''}>
                                                        <div class={styles['suspicious-status-cell-content']}>
                                                            {count.toLocaleString()}
                                                             <span class={styles['suspicious-status-percent']}>({percentage}%)</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            {foundSuspiciousStatuses.length === 0 && <td>0</td>}
                                            <td>{data.filteredExcludedSuspiciousCount.toLocaleString()}</td>
                                            <td>{data.filteredStatus8Items.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {reportResults && !isLoading && (
                <div class={styles['status-report-results']}>
                    <h3>
                        {filters.includeConsistent
                            ? t('statusReport.results.titleWithConsistent', { count: sortedAndFilteredResults.length.toLocaleString(language) })
                            : `${t('statusReport.results.title')} (${sortedAndFilteredResults.length.toLocaleString(language)})`
                        }
                    </h3>
                    {sortedAndFilteredResults.length > 0 ? (
                        <>
                        <div class={sharedStyles['table-container']}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('columns.product.productId')}</th>
                                        <th ref={thRef} class={styles.resizable} style={{ width: productNameWidth ? `${productNameWidth}px` : 'auto', minWidth: '150px' }}>
                                            {t('columns.product.name')}
                                            <div ref={resizerRef} class={styles.resizer} onMouseDown={handleMouseDown} />
                                        </th>
                                        <th class={styles['small-font-cell']}>{t('columns.product.dispoGroup')}</th>
                                        <th class={`${styles['small-font-cell']} ${styles['item-group-col']}`}>{t('columns.product.itemGroup')}</th>
                                        <th class={styles['small-font-cell']}>{t('columns.product.caseSize')}</th>
                                        <th>{t('statusReport.results.dominantStatus')}</th>
                                        {warehouseColumns.map(wh => (
                                            <th 
                                                key={wh} 
                                                class={`${styles['warehouse-header']} ${styles.clickable} ${sortByWarehouse === wh ? styles.sorted : ''}`}
                                                onClick={() => setSortByWarehouse(sortByWarehouse === wh ? null : wh)}
                                            >
                                                {wh}
                                                <span class={styles['rdc-name']}>{rdcNameMap.get(wh) || ''}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedResults.map(item => {
                                        const isExcluded = exclusionList.list.has(item.productId);
                                        const isStatutoryExcluded = STATUTORY_EXCLUDED_ITEM_GROUPS.has(item.itemGroup);
                                        return (
                                        <tr key={`${item.productId}-${item.caseSize}`} class={isExcluded || isStatutoryExcluded ? styles['excluded-row'] : ''}>
                                            <td>{item.productId}</td>
                                            <td title={item.productName}>
                                                <div class={styles['truncated-cell-content']} style={{width: `${(productNameWidth || 200) - 24}px`}}>
                                                    {item.productName}
                                                </div>
                                            </td>
                                            <td class={styles['small-font-cell']}>{item.dispoGroup}</td>
                                            <td class={`${styles['small-font-cell']} ${styles['item-group-col']}`} title={`${item.itemGroup} - ${itemGroupMap[item.itemGroup] || ''}`}>
                                                <div class={styles['truncated-cell-content']}>
                                                    {item.itemGroup} - {itemGroupMap[item.itemGroup] || ''}
                                                </div>
                                            </td>
                                            <td class={styles['small-font-cell']}>{item.caseSize}</td>
                                            <td>
                                                <strong>{item.dominantStatusInfo.status}</strong>
                                                {item.dominantStatusInfo.type !== 'none' && (
                                                    <span style={{fontSize: '0.8em', marginLeft: '4px', color: 'var(--text-light-color)'}}>
                                                        ({t(`statusReport.statusTypes.${item.dominantStatusInfo.type}`)})
                                                    </span>
                                                )}
                                            </td>
                                            {warehouseColumns.map(wh => {
                                                const status = item.statusesByWarehouse[wh];
                                                const isConsistent = status === item.dominantStatusInfo.status;
                                                const isWh290SpecialExclusion = wh === '290' && (item.itemGroup === '20' || item.itemGroup === '74');
                                                return (
                                                    <td 
                                                        key={wh} 
                                                        class={`${status && !isConsistent && !isWh290SpecialExclusion ? styles['status-inconsistent'] : ''} ${isWh290SpecialExclusion ? styles['special-exclusion-cell'] : ''}`}
                                                        onMouseEnter={(e) => handleCellMouseEnter(e, item, wh, isWh290SpecialExclusion)}
                                                        onMouseLeave={handleCellMouseLeave}
                                                    >
                                                        {status ?? '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                        <div class={sharedStyles.pagination}>
                            <span>{sortedAndFilteredResults.length.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>{t('dataPreview.pagination.previous')}</button>
                            <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>{t('dataPreview.pagination.next')}</button>
                        </div>
                        </>
                    ) : (
                         <div class={sharedStyles['placeholder-view']}>
                            <p>{t('statusReport.results.noResults')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import type { VNode } from 'preact';
import { useTranslation } from '../i18n';
import type { StatusReportResultItem, StatusReportWorkerMessage, StatusReportWorkerRequest, RDC } from '../utils/types';
import { itemGroupMap } from '../utils/itemGroups';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';


const PAGE_SIZE = 20;
const SUSPICIOUS_STATUSES = ['5', '6', '7', '9', '10', '11', '12'];
const EXCLUDABLE_STATUSES = ['5', '6', '7', '8', '9', '10', '11', '12','-'];

export const StatusReportView = (props: { rdcList: RDC[] }) => {
    const { t, language } = useTranslation();
    const { rdcList } = props;
    const workerRef = useRef<Worker | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
    const [reportResults, setReportResults] = useState<StatusReportResultItem[] | null>(null);
    
    const [productIdFilter, setProductIdFilter] = useState('');
    const [pastedProductIds, setPastedProductIds] = useState<string[]>([]);
    const [dominantStatusFilter, setDominantStatusFilter] = useState('');
    const [dispoGroupFilter, setDispoGroupFilter] = useState('');
    const [itemGroupFilter, setItemGroupFilter] = useState('');
    const [excludeNoStock, setExcludeNoStock] = useState(true);
    const [showOnlyUndetermined, setShowOnlyUndetermined] = useState(false);
    const [excludedDominantStatuses, setExcludedDominantStatuses] = useState<string[]>(EXCLUDABLE_STATUSES.filter(s => s !== '8'));
    const [includeConsistent, setIncludeConsistent] = useState(false);
    
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

        if (!includeConsistent) {
            results = results.filter(item => item.isInconsistent);
        }
        
        return results.filter(item => {
            if (pastedProductIds.length > 0) {
                if (!pastedProductIds.includes(item.productId)) {
                    return false;
                }
            } else if (productIdFilter && !item.productId.toLowerCase().includes(productIdFilter.toLowerCase())) {
                return false;
            }
            if (dominantStatusFilter && item.dominantStatusInfo.status !== dominantStatusFilter) {
                return false;
            }
            if (dispoGroupFilter && item.dispoGroup !== dispoGroupFilter) {
                return false;
            }
            if (itemGroupFilter && item.itemGroup !== itemGroupFilter) {
                return false;
            }
            if (excludeNoStock) {
                const totalStock = Object.values(item.stockByWarehouse).reduce((sum, stock) => sum + stock, 0);
                if (totalStock <= 0) return false;
            }
            if (showOnlyUndetermined && item.dominantStatusInfo.type !== 'none') {
                return false;
            }
            if (excludedDominantStatuses.length > 0 && excludedDominantStatuses.includes(item.dominantStatusInfo.status)) {
                return false;
            }
            return true;
        });
    }, [reportResults, productIdFilter, pastedProductIds, dominantStatusFilter, dispoGroupFilter, itemGroupFilter, excludeNoStock, showOnlyUndetermined, excludedDominantStatuses, includeConsistent]);
    
    const combinedSummaryData = useMemo(() => {
        if (!filteredResults) return null;

        const summary: {
            [whId: string]: {
                totalItemsChecked: number;
                filteredStatus8Items: number;
                filteredSuspiciousCounts: { [status: string]: number };
            }
        } = {};

        rdcList.forEach(rdc => {
            summary[rdc.id] = {
                totalItemsChecked: 0,
                filteredStatus8Items: 0,
                filteredSuspiciousCounts: {},
            };
        });
        
        for (const item of filteredResults) {
            for (const rdc of rdcList) {
                const whId = rdc.id;
                if (item.statusesByWarehouse[whId] !== undefined) {
                    summary[whId].totalItemsChecked++;
                    const status = item.statusesByWarehouse[whId];
                    if (status === '8') {
                        summary[whId].filteredStatus8Items++;
                    }
                    if (item.isInconsistent && status !== item.dominantStatusInfo.status && SUSPICIOUS_STATUSES.includes(status)) {
                        summary[whId].filteredSuspiciousCounts[status] = (summary[whId].filteredSuspiciousCounts[status] || 0) + 1;
                    }
                }
            }
        }

        return summary;
    }, [filteredResults, rdcList]);
    
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

    const handleClearFilters = () => {
        setProductIdFilter('');
        setPastedProductIds([]);
        setDominantStatusFilter('');
        setDispoGroupFilter('');
        setItemGroupFilter('');
        setExcludeNoStock(true);
        setShowOnlyUndetermined(false);
        setExcludedDominantStatuses(EXCLUDABLE_STATUSES.filter(s => s !== '8'));
        setIncludeConsistent(false);
    };

    const handleExcludeStatusChange = (status: string, isChecked: boolean) => {
        setExcludedDominantStatuses(prev => {
            if (isChecked) {
                return [...prev, status];
            } else {
                return prev.filter(s => s !== status);
            }
        });
    };

    const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const pastedText = e.clipboardData?.getData('text');
        if (pastedText) {
            const ids = pastedText.split(/[\s,;\t\n]+/).map(s => s.trim()).filter(Boolean);
            if (ids.length > 0) {
                setPastedProductIds(ids);
                setProductIdFilter(''); 
            }
        }
    };
    
    const handleCellMouseEnter = (
        e: MouseEvent,
        item: StatusReportResultItem,
        warehouseId: string
    ) => {
        const stock = item.stockByWarehouse[warehouseId];
        const orderInfo = item.openOrdersByWarehouse[warehouseId];

        const content = (
            <div>
                <p><strong>{t('columns.product.stockOnHand')}:</strong> {stock !== undefined ? stock.toLocaleString(language) : 'N/A'}</p>
                <p><strong>{t('dataType.openOrders')}:</strong> {orderInfo?.hasFutureOrders ? t('common.yesShort') : t('common.noShort')}</p>
                {orderInfo?.hasFutureOrders && orderInfo.nextOrderDate && (
                    <p><strong>{t('columns.openOrder.deliveryDate')}:</strong> {orderInfo.nextOrderDate}</p>
                )}
            </div>
        );
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltip({
            visible: true,
            content,
            x: rect.left,
            y: rect.top
        });
    };

    const handleCellMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
    };

    const generatePdf = () => {
        if (!sortedAndFilteredResults) return;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        
        const warehousesToExport = selectedExportWarehouse === 'all'
            ? rdcList.filter(rdc => warehouseColumns.includes(rdc.id))
            : rdcList.filter(rdc => rdc.id === selectedExportWarehouse);

        let isFirstSection = true;

        for (const warehouse of warehousesToExport) {
            if (!isFirstSection) {
                doc.addPage();
            }
            
            doc.setFontSize(18);
            doc.text(`${t('statusReport.pdf.reportForWarehouse')}: ${warehouse.id} - ${warehouse.name}`, 40, 60);

            const itemsForWarehouse = sortedAndFilteredResults.filter(item =>
                item.statusesByWarehouse[warehouse.id] &&
                item.statusesByWarehouse[warehouse.id] !== item.dominantStatusInfo.status &&
                SUSPICIOUS_STATUSES.includes(item.statusesByWarehouse[warehouse.id])
            );

            if (itemsForWarehouse.length === 0) {
                doc.setFontSize(10);
                doc.text(t('statusReport.pdf.noInconsistencies'), 40, 80);
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
            
            let startY = 80;

            for (const status of sortedSuspiciousStatuses) {
                const itemsForStatus = itemsForWarehouse.filter(item => item.statusesByWarehouse[warehouse.id] === status);
                
                if (startY > doc.internal.pageSize.height - 100) {
                    doc.addPage();
                    startY = 60;
                }
                
                doc.setFontSize(12);
                doc.text(t('statusReport.pdf.groupedByStatus', { status }), 40, startY);
                
                const isSingleWarehouseExport = selectedExportWarehouse !== 'all';
                const tableHead = isSingleWarehouseExport
                    ? [
                        t('columns.product.productId'),
                        t('columns.product.name'),
                        t('columns.product.dispoGroup'),
                        t('columns.product.itemGroup'),
                        t('columns.product.caseSize'),
                        t('statusReport.results.dominantStatus'),
                        `${t('statusReport.pdf.statusIn')} ${warehouse.id}`,
                      ]
                    : [
                        t('columns.product.productId'),
                        t('columns.product.name'),
                        t('columns.product.caseSize'),
                        t('statusReport.results.dominantStatus'),
                        ...warehouseColumns
                    ];

                const tableBody = itemsForStatus.map(item => isSingleWarehouseExport
                    ? [
                        item.productId,
                        item.productName,
                        item.dispoGroup,
                        `${item.itemGroup} - ${itemGroupMap[item.itemGroup] || ''}`,
                        item.caseSize,
                        `${item.dominantStatusInfo.status} (${t(`statusReport.statusTypes.${item.dominantStatusInfo.type}`)})`,
                        item.statusesByWarehouse[warehouse.id]
                      ]
                    : [
                        item.productId,
                        item.productName,
                        item.caseSize,
                        `${item.dominantStatusInfo.status} (${t(`statusReport.statusTypes.${item.dominantStatusInfo.type}`)})`,
                        ...warehouseColumns.map(wh => item.statusesByWarehouse[wh] ?? '-')
                    ]
                );

                autoTable(doc, {
                    head: [tableHead],
                    body: tableBody,
                    startY: startY + 10,
                    theme: 'grid',
                    styles: { fontSize: isSingleWarehouseExport ? 8 : 7, cellPadding: 2, overflow: 'ellipsize' },
                    headStyles: { fillColor: [74, 144, 226], textColor: 255, fontStyle: 'bold' },
                    didParseCell: (data: any) => {
                        const item = itemsForStatus[data.row.index];
                        if (!item) return;

                        if (isSingleWarehouseExport) {
                             if (data.column.index === 6) {
                                data.cell.styles.fillColor = '#f8d7da';
                                data.cell.styles.textColor = '#721c24';
                            }
                        } else {
                            if (data.column.index >= 4) { 
                                const wh = warehouseColumns[data.column.index - 4];
                                const cellStatus = item.statusesByWarehouse[wh];
                                if (cellStatus && cellStatus !== item.dominantStatusInfo.status) {
                                    data.cell.styles.fillColor = '#f8d7da';
                                    data.cell.styles.textColor = '#721c24';
                                }
                            }
                        }
                    },
                });

                startY = (doc as any).lastAutoTable.finalY + 20;
            }
            isFirstSection = false;
        }
        
        doc.save(`oms_status_report_${selectedExportWarehouse}_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsExportModalVisible(false);
    };


    const handleMouseDown = useCallback((e: MouseEvent) => {
        isResizingRef.current = true;
        resizerRef.current?.classList.add('resizing');
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
        resizerRef.current?.classList.remove('resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    return (
        <div class="status-report-view">
            {isExportModalVisible && (
                <div class="login-modal-overlay">
                    <div class="login-modal">
                        <h3>{t('statusReport.pdf.exportOptionsTitle')}</h3>
                        <div class="filter-group">
                            <label for="export-warehouse-select">{t('statusReport.pdf.selectWarehouse')}</label>
                            <select
                                id="export-warehouse-select"
                                value={selectedExportWarehouse}
                                onChange={(e) => setSelectedExportWarehouse((e.target as HTMLSelectElement).value)}
                            >
                                <option value="all">{t('statusReport.pdf.allWarehouses')}</option>
                                {rdcList.map(rdc => <option key={rdc.id} value={rdc.id}>{rdc.id} - {rdc.name}</option>)}
                            </select>
                        </div>
                        <div class="filter-actions" style={{justifyContent: 'center'}}>
                            <button class="button-primary" onClick={generatePdf}>{t('statusReport.pdf.exportButton')}</button>
                            <button class="button-secondary" onClick={() => setIsExportModalVisible(false)}>{t('statusReport.pdf.cancelButton')}</button>
                        </div>
                    </div>
                </div>
            )}
            {tooltip.visible && (
                <div 
                    class="status-report-tooltip"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
            <div class="status-report-controls">
                <h3>{t('statusReport.title')}</h3>
                <p>{t('statusReport.description')}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem'}}>
                    <button class="button-primary" onClick={handleRunReport} disabled={isLoading}>
                        {reportResults ? t('simulations.buttons.rerun') : t('statusReport.runReport')}
                    </button>
                    {reportResults && (
                         <button class="button-secondary" onClick={() => setIsExportModalVisible(true)} disabled={sortedAndFilteredResults.length === 0}>
                            {t('statusReport.results.exportPdf')}
                        </button>
                    )}
                </div>
                 {reportResults && (
                    <div class="status-report-filters">
                        <div class="filter-group">
                            <label htmlFor="sr-productId">{t('columns.product.productId')}</label>
                            <input
                                id="sr-productId"
                                type="text"
                                value={pastedProductIds.length > 0 ? t('statusReport.filters.pastedInfo', { count: pastedProductIds.length }) : productIdFilter}
                                onInput={(e) => setProductIdFilter((e.target as HTMLInputElement).value)}
                                onPaste={handlePaste}
                                placeholder={t('dataPreview.filters.productIdPlaceholder')}
                                disabled={pastedProductIds.length > 0}
                            />
                        </div>
                        <div class="filter-group">
                            <label htmlFor="sr-dispoGroup">{t('columns.product.dispoGroup')}</label>
                            <select id="sr-dispoGroup" value={dispoGroupFilter} onChange={(e) => setDispoGroupFilter((e.target as HTMLSelectElement).value)}>
                                <option value="">{t('dataPreview.filters.all')}</option>
                                {availableDispoGroups.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div class="filter-group">
                            <label htmlFor="sr-itemGroup">{t('columns.product.itemGroup')}</label>
                            <select id="sr-itemGroup" value={itemGroupFilter} onChange={(e) => setItemGroupFilter((e.target as HTMLSelectElement).value)}>
                                <option value="">{t('dataPreview.filters.all')}</option>
                                {availableItemGroups.map(g => <option key={g} value={g}>{g} - {itemGroupMap[g] || ''}</option>)}
                            </select>
                        </div>
                         <div class="filter-group">
                            <label htmlFor="sr-dominantStatus">{t('statusReport.filters.dominantStatus')}</label>
                            <select id="sr-dominantStatus" value={dominantStatusFilter} onChange={(e) => setDominantStatusFilter((e.target as HTMLSelectElement).value)}>
                                <option value="">{t('dataPreview.filters.all')}</option>
                                {availableDominantStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div class="status-report-checkbox-filters">
                             <label>
                                <input type="checkbox" checked={excludeNoStock} onChange={(e) => setExcludeNoStock((e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.excludeNoStock')}
                            </label>
                            <label>
                                <input type="checkbox" checked={showOnlyUndetermined} onChange={(e) => setShowOnlyUndetermined((e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.showOnlyUndetermined')}
                            </label>
                            <label>
                                <input type="checkbox" checked={includeConsistent} onChange={(e) => setIncludeConsistent((e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.includeConsistent')}
                            </label>
                        </div>
                        <div class="filter-actions">
                            <button class="button-secondary" onClick={handleClearFilters}>{t('dataPreview.filters.clear')}</button>
                        </div>
                        <div class="dominant-status-exclude-filter">
                            <label class="filter-group-label">{t('statusReport.filters.excludeWhenDominantIs')}</label>
                            <div class="checkbox-group">
                                {EXCLUDABLE_STATUSES.map(status => (
                                    <label key={status}>
                                        <input
                                            type="checkbox"
                                            checked={excludedDominantStatuses.includes(status)}
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
                <div class="report-progress-section">
                    <h4>{t('statusReport.runningTitle')}</h4>
                    {progress && progress.total > 0 ? (
                        <>
                            <p>{t('statusReport.runningDescription', { processed: progress.processed, total: progress.total })}</p>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style={{ width: `${(progress.processed / progress.total) * 100}%` }}></div>
                            </div>
                        </>
                    ) : (
                        <div class="spinner"></div>
                    )}
                </div>
            )}

            {reportResults && !isLoading && combinedSummaryData && (
                 <div class="status-report-summary">
                     <div class={`summary-header ${!isSummaryExpanded ? 'collapsed' : ''}`} onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                        <h3>{t('statusReport.summary.title')}</h3>
                        <span class="arrow">▼</span>
                    </div>
                    {isSummaryExpanded && (
                        <div class="summary-table-container">
                            <table class="summary-table">
                                <thead>
                                    <tr>
                                        <th rowSpan={2}>{t('statusReport.summary.warehouse')}</th>
                                        <th rowSpan={2}>{t('statusReport.summary.itemsChecked')}</th>
                                        <th class="group-header" colSpan={foundSuspiciousStatuses.length || 1}>{t('statusReport.summary.suspiciousStatuses')}</th>
                                        <th rowSpan={2}>{t('statusReport.summary.status8Items')}</th>
                                    </tr>
                                    <tr>
                                        {foundSuspiciousStatuses.map(status => <th key={status}>{status}</th>)}
                                        {foundSuspiciousStatuses.length === 0 && <th>-</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(combinedSummaryData)
                                        .filter(([whId, data]) => rdcNameMap.has(whId) && data.totalItemsChecked > 0)
                                        .map(([whId, data]) => (
                                        <tr key={whId}>
                                            <td><strong>{whId}</strong> - {rdcNameMap.get(whId) || ''}</td>
                                            <td>{data.totalItemsChecked.toLocaleString()}</td>
                                            {foundSuspiciousStatuses.map(status => {
                                                const count = data.filteredSuspiciousCounts[status] || 0;
                                                const total = data.totalItemsChecked;
                                                const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
                                                const isHighlighted = highlightedValues.get(status)?.has(count) && count > 0;
                                                return (
                                                    <td key={status} class={isHighlighted ? 'highlighted-suspicious-cell' : ''}>
                                                        <div class="suspicious-status-cell-content">
                                                            {count.toLocaleString()}
                                                             <span class="suspicious-status-percent">({percentage}%)</span>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            {foundSuspiciousStatuses.length === 0 && <td>0</td>}
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
                <div class="status-report-results">
                    <h3>
                        {includeConsistent
                            ? t('statusReport.results.titleWithConsistent', { count: sortedAndFilteredResults.length.toLocaleString(language) })
                            : `${t('statusReport.results.title')} (${sortedAndFilteredResults.length.toLocaleString(language)})`
                        }
                    </h3>
                    {sortedAndFilteredResults.length > 0 ? (
                        <>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('columns.product.productId')}</th>
                                        <th ref={thRef} class="resizable" style={{ width: productNameWidth ? `${productNameWidth}px` : 'auto', minWidth: '150px' }}>
                                            {t('columns.product.name')}
                                            <div ref={resizerRef} class="resizer" onMouseDown={handleMouseDown} />
                                        </th>
                                        <th class="small-font-cell">{t('columns.product.dispoGroup')}</th>
                                        <th class="small-font-cell item-group-col">{t('columns.product.itemGroup')}</th>
                                        <th class="small-font-cell">{t('columns.product.caseSize')}</th>
                                        <th>{t('statusReport.results.dominantStatus')}</th>
                                        {warehouseColumns.map(wh => (
                                            <th 
                                                key={wh} 
                                                class={`warehouse-header clickable ${sortByWarehouse === wh ? 'sorted' : ''}`}
                                                onClick={() => setSortByWarehouse(sortByWarehouse === wh ? null : wh)}
                                            >
                                                {wh}
                                                <span class="rdc-name">{rdcNameMap.get(wh) || ''}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedResults.map(item => (
                                        <tr key={`${item.productId}-${item.caseSize}`}>
                                            <td>{item.productId}</td>
                                            <td title={item.productName}>
                                                <div class="truncated-cell-content" style={{width: `${(productNameWidth || 200) - 24}px`}}>
                                                    {item.productName}
                                                </div>
                                            </td>
                                            <td class="small-font-cell">{item.dispoGroup}</td>
                                            <td class="small-font-cell item-group-col" title={`${item.itemGroup} - ${itemGroupMap[item.itemGroup] || ''}`}>
                                                <div class="truncated-cell-content">
                                                    {item.itemGroup} - {itemGroupMap[item.itemGroup] || ''}
                                                </div>
                                            </td>
                                            <td class="small-font-cell">{item.caseSize}</td>
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
                                                return (
                                                    <td 
                                                        key={wh} 
                                                        class={status && !isConsistent ? 'status-inconsistent' : ''}
                                                        onMouseEnter={(e) => handleCellMouseEnter(e, item, wh)}
                                                        onMouseLeave={handleCellMouseLeave}
                                                    >
                                                        {status ?? '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div class="pagination">
                            <span>{sortedAndFilteredResults.length.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>{t('dataPreview.pagination.previous')}</button>
                            <span>{t('dataPreview.pagination.page', { currentPage, totalPages })}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>{t('dataPreview.pagination.next')}</button>
                        </div>
                        </>
                    ) : (
                         <div class="placeholder-view">
                            <p>{t('statusReport.results.noResults')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import { useTranslation } from '../i18n';
import type { StatusReportResultItem, StatusReportWorkerMessage, StatusReportWorkerRequest, RDC } from '../utils/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const PAGE_SIZE = 20;
const SUSPICIOUS_STATUSES = ['5', '6', '7', '9', '10', '11', '12'];


type SummaryData = {
    [warehouseId: string]: {
        itemsChecked: number;
        suspiciousStatuses: number;
        status8Items: number;
    }
};

export const StatusReportView = (props: { rdcList: RDC[] }) => {
    const { t, language } = useTranslation();
    const { rdcList } = props;
    const workerRef = useRef<Worker | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
    const [reportResults, setReportResults] = useState<StatusReportResultItem[] | null>(null);
    
    const [productIdFilter, setProductIdFilter] = useState('');
    const [dominantStatusFilter, setDominantStatusFilter] = useState('');
    const [excludeNoStock, setExcludeNoStock] = useState(true);
    const [requireActiveStatus, setRequireActiveStatus] = useState(true);
    const [showOnlyUndetermined, setShowOnlyUndetermined] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);

    const [productNameWidth, setProductNameWidth] = useState<number | null>(null);
    const resizerRef = useRef<HTMLDivElement>(null);
    const thRef = useRef<HTMLTableCellElement>(null);
    const isResizingRef = useRef(false);

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
        const request: StatusReportWorkerRequest = {};
        workerRef.current.postMessage(request);
    };
    
    const availableDominantStatuses = useMemo(() => {
        if (!reportResults) return [];
        const statuses = new Set(reportResults.map(r => r.dominantStatusInfo.status).filter(s => s !== '-'));
        return Array.from(statuses).sort();
    }, [reportResults]);

    const filteredResults = useMemo(() => {
        if (!reportResults) return [];
        
        return reportResults.filter(item => {
            if (productIdFilter && !item.productId.toLowerCase().includes(productIdFilter.toLowerCase())) {
                return false;
            }
            if (dominantStatusFilter && item.dominantStatusInfo.status !== dominantStatusFilter) {
                return false;
            }
            if (excludeNoStock) {
                const totalStock = Object.values(item.stockByWarehouse).reduce((sum, stock) => sum + stock, 0);
                if (totalStock <= 0) return false;
            }
            if (requireActiveStatus) {
                const hasActiveStatus = Object.values(item.statusesByWarehouse).some(status => ['6', '7', '8'].includes(status));
                if (!hasActiveStatus) return false;
            }
            if (showOnlyUndetermined && item.dominantStatusInfo.type !== 'none') {
                return false;
            }
            return true;
        });
    }, [reportResults, productIdFilter, dominantStatusFilter, excludeNoStock, requireActiveStatus, showOnlyUndetermined]);
    
    const summaryData = useMemo<SummaryData | null>(() => {
        if (!reportResults) return null;

        const summary: SummaryData = {};
        const allWarehouseIds = new Set<string>();
        
        reportResults.forEach(item => {
            Object.keys(item.statusesByWarehouse).forEach(wh => allWarehouseIds.add(wh));
        });

        for (const whId of Array.from(allWarehouseIds).sort()) {
            summary[whId] = { itemsChecked: 0, suspiciousStatuses: 0, status8Items: 0 };
        }
        
        for (const item of reportResults) {
            for (const [whId, status] of Object.entries(item.statusesByWarehouse)) {
                if (summary[whId]) {
                    summary[whId].itemsChecked++;
                    if (status === '8') {
                        summary[whId].status8Items++;
                    }
                    if (SUSPICIOUS_STATUSES.includes(status) && status !== item.dominantStatusInfo.status) {
                        summary[whId].suspiciousStatuses++;
                    }
                }
            }
        }
        return summary;
    }, [reportResults]);


    useEffect(() => {
        setCurrentPage(1);
    }, [filteredResults]);

    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredResults.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredResults, currentPage]);
    
    const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);

    const warehouseColumns = useMemo(() => {
        if (!reportResults) return [];
        const allWarehouses = new Set<string>();
        reportResults.forEach(item => {
            Object.keys(item.statusesByWarehouse).forEach(wh => allWarehouses.add(wh));
        });
        return Array.from(allWarehouses).sort();
    }, [reportResults]);

    const handleClearFilters = () => {
        setProductIdFilter('');
        setDominantStatusFilter('');
        setExcludeNoStock(true);
        setRequireActiveStatus(true);
        setShowOnlyUndetermined(false);
    };

    const handleExportToPdf = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

        doc.setFontSize(18);
        doc.text(t('statusReport.title'), 40, 60);

        // --- Summary Section ---
        if (summaryData) {
            doc.setFontSize(14);
            doc.text(t('statusReport.pdf.summaryTitle'), 40, 90);
            const summaryHead = [[
                t('statusReport.summary.warehouse'),
                t('statusReport.summary.itemsChecked'),
                t('statusReport.summary.suspiciousStatuses'),
                t('statusReport.summary.status8Items'),
            ]];
            const summaryBody = Object.entries(summaryData).map(([whId, data]) => [
                `${whId} - ${rdcNameMap.get(whId) || ''}`,
                data.itemsChecked,
                data.suspiciousStatuses,
                data.status8Items,
            ]);
            autoTable(doc, {
                head: summaryHead,
                body: summaryBody,
                startY: 100,
                theme: 'grid',
                headStyles: { fillColor: [74, 144, 226], textColor: 255 },
            });
        }
        
        doc.addPage();
        
        // --- Inconsistent Products Section ---
        doc.setFontSize(14);
        doc.text(t('statusReport.pdf.inconsistentProductsTitle'), 40, 60);

        const tableHead = [
            t('statusReport.results.productId'),
            t('statusReport.results.productName'),
            t('statusReport.results.caseSize'),
            t('statusReport.results.dominantStatus'),
            ...warehouseColumns
        ];

        for (const status of SUSPICIOUS_STATUSES) {
            const itemsForStatus = filteredResults.filter(item => {
                const whStatuses = Object.values(item.statusesByWarehouse);
                return whStatuses.includes(status) && item.dominantStatusInfo.status !== status;
            });
            
            if (itemsForStatus.length > 0) {
                 const tableBody = itemsForStatus.map(item => [
                    item.productId,
                    item.productName,
                    item.caseSize,
                    `${item.dominantStatusInfo.status} (${t(`statusReport.statusTypes.${item.dominantStatusInfo.type}`)})`,
                    ...warehouseColumns.map(wh => item.statusesByWarehouse[wh] ?? '-')
                ]);

                autoTable(doc, {
                    head: [tableHead],
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 2, overflow: 'ellipsize' },
                    headStyles: { fillColor: [74, 144, 226], textColor: 255, fontStyle: 'bold' },
                    didParseCell: (data: any) => {
                        const item = itemsForStatus[data.row.index];
                        if (item && data.column.index >= 4) { // warehouse columns
                            const wh = warehouseColumns[data.column.index - 4];
                            const cellStatus = item.statusesByWarehouse[wh];
                            if (cellStatus && cellStatus !== item.dominantStatusInfo.status) {
                                data.cell.styles.fillColor = '#f8d7da';
                                data.cell.styles.textColor = '#721c24';
                            }
                        }
                    },
                    didDrawPage: (data) => {
                        doc.setFontSize(12);
                        doc.text(t('statusReport.pdf.groupedByStatus', { status: status }), 40, data.cursor?.y ? data.cursor.y - 15 : 40);
                    },
                    margin: { top: 60 }
                });
            }
        }

        doc.save(`oms_status_report_${new Date().toISOString().split('T')[0]}.pdf`);
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
            <div class="status-report-controls">
                <h3>{t('statusReport.title')}</h3>
                <p>{t('statusReport.description')}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem'}}>
                    <button class="button-primary" onClick={handleRunReport} disabled={isLoading}>
                        {reportResults ? t('simulations.buttons.rerun') : t('statusReport.runReport')}
                    </button>
                    {reportResults && (
                         <button class="button-secondary" onClick={handleExportToPdf} disabled={filteredResults.length === 0}>
                            {t('statusReport.results.exportPdf')}
                        </button>
                    )}
                </div>
                 {reportResults && (
                    <div class="status-report-filters">
                        <div class="filter-group">
                            <label htmlFor="sr-productId">{t('statusReport.filters.productId')}</label>
                            <input
                                id="sr-productId"
                                type="text"
                                value={productIdFilter}
                                onInput={(e) => setProductIdFilter((e.target as HTMLInputElement).value)}
                                placeholder={t('dataPreview.filters.productIdPlaceholder')}
                            />
                        </div>
                         <div class="filter-group">
                            <label htmlFor="sr-dominantStatus">{t('statusReport.filters.dominantStatus')}</label>
                            <select id="sr-dominantStatus" value={dominantStatusFilter} onChange={(e) => setDominantStatusFilter((e.target as HTMLSelectElement).value)}>
                                <option value="">{t('statusReport.filters.all')}</option>
                                {availableDominantStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div class="status-report-checkbox-filters">
                             <label>
                                <input type="checkbox" checked={excludeNoStock} onChange={(e) => setExcludeNoStock((e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.excludeNoStock')}
                            </label>
                            <label>
                                <input type="checkbox" checked={requireActiveStatus} onChange={(e) => setRequireActiveStatus((e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.requireActiveStatus')}
                            </label>
                            <label>
                                <input type="checkbox" checked={showOnlyUndetermined} onChange={(e) => setShowOnlyUndetermined((e.target as HTMLInputElement).checked)} />
                                {t('statusReport.filters.showOnlyUndetermined')}
                            </label>
                        </div>
                        <div class="filter-actions">
                            <button class="button-secondary" onClick={handleClearFilters}>{t('statusReport.filters.clear')}</button>
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

            {reportResults && !isLoading && summaryData && (
                 <div class="status-report-summary">
                    <h3>{t('statusReport.summary.title')}</h3>
                    <div class="summary-table-container">
                        <table class="summary-table">
                            <thead>
                                <tr>
                                    <th>{t('statusReport.summary.warehouse')}</th>
                                    <th>{t('statusReport.summary.itemsChecked')}</th>
                                    <th>{t('statusReport.summary.suspiciousStatuses')}</th>
                                    <th>{t('statusReport.summary.status8Items')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(summaryData).map(([whId, data]) => (
                                    <tr key={whId}>
                                        <td><strong>{whId}</strong> - {rdcNameMap.get(whId) || ''}</td>
                                        <td>{data.itemsChecked.toLocaleString()}</td>
                                        <td>{data.suspiciousStatuses.toLocaleString()}</td>
                                        <td>{data.status8Items.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {reportResults && !isLoading && (
                <div class="status-report-results">
                    <h3>{t('statusReport.results.title')} ({filteredResults.length})</h3>
                    {filteredResults.length > 0 ? (
                        <>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('statusReport.results.productId')}</th>
                                        <th ref={thRef} class="resizable" style={{ width: productNameWidth ? `${productNameWidth}px` : 'auto', minWidth: '150px' }}>
                                            {t('statusReport.results.productName')}
                                            <div ref={resizerRef} class="resizer" onMouseDown={handleMouseDown} />
                                        </th>
                                        <th>{t('statusReport.results.caseSize')}</th>
                                        <th>{t('statusReport.results.dominantStatus')}</th>
                                        {warehouseColumns.map(wh => (
                                            <th key={wh} class="warehouse-header">
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
                                            <td style={{whiteSpace: 'normal'}}>{item.productName}</td>
                                            <td>{item.caseSize}</td>
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
                            <span>{filteredResults.length.toLocaleString(language)} {t('dataPreview.pagination.records')}</span>
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

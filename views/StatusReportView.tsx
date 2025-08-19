import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { useTranslation } from '../i18n';
import type { StatusReportResultItem, StatusReportWorkerMessage, StatusReportWorkerRequest } from '../utils/types';

export const StatusReportView = () => {
    const { t } = useTranslation();
    const workerRef = useRef<Worker | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
    const [reportResults, setReportResults] = useState<StatusReportResultItem[] | null>(null);
    
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
        const request: StatusReportWorkerRequest = {}; // No params needed
        workerRef.current.postMessage(request);
    };
    
    const warehouseColumns = useMemo(() => {
        if (!reportResults) return [];
        const allWarehouses = new Set<string>();
        reportResults.forEach(item => {
            Object.keys(item.statusesByWarehouse).forEach(wh => allWarehouses.add(wh));
        });
        return Array.from(allWarehouses).sort();
    }, [reportResults]);

    return (
        <div class="status-report-view">
            <div class="status-report-controls">
                <h3>{t('statusReport.title')}</h3>
                <p>{t('statusReport.description')}</p>
                <div class="filter-actions" style={{justifyContent: 'flex-start'}}>
                    <button class="button-primary" onClick={handleRunReport} disabled={isLoading}>
                        {t('statusReport.runReport')}
                    </button>
                </div>
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

            {reportResults && !isLoading && (
                <div class="status-report-results">
                    <h3>{t('statusReport.results.title')}</h3>
                    {reportResults.length > 0 ? (
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('statusReport.results.productId')}</th>
                                        <th>{t('statusReport.results.productName')}</th>
                                        <th>{t('statusReport.results.caseSize')}</th>
                                        <th>{t('statusReport.results.dominantStatus')}</th>
                                        {warehouseColumns.map(wh => <th key={wh}>{wh}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportResults.map(item => (
                                        <tr key={`${item.productId}-${item.caseSize}`}>
                                            <td>{item.productId}</td>
                                            <td>{item.productName}</td>
                                            <td>{item.caseSize}</td>
                                            <td><strong>{item.dominantStatus}</strong></td>
                                            {warehouseColumns.map(wh => {
                                                const status = item.statusesByWarehouse[wh];
                                                const isConsistent = status === item.dominantStatus;
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

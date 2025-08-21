import { useState, useEffect, useRef } from 'preact/hooks';
import { useTranslation } from '../i18n';
import type { ShcDataType, ShcAnalysisResult, ShcMismatchItem, ShcSectionConfig, ShcWorkerMessage } from '../utils/types';
import styles from './ShcReportView.module.css';
import sharedStyles from '../styles/shared.module.css';

type Props = {
    files: Map<ShcDataType, FileSystemFileHandle>;
};

export const ShcReportView = ({ files }: Props) => {
    const { t } = useTranslation();
    const workerRef = useRef<Worker | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ message: string; percentage: number } | null>(null);
    const [results, setResults] = useState<ShcAnalysisResult | null>(null);
    const [mismatches, setMismatches] = useState<ShcMismatchItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    // TODO: This should check counts from DB instead of just linked files
    const canRunAnalysis = files.size === 4;

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


    const handleRunAnalysis = async () => {
        if (!canRunAnalysis || !workerRef.current) return;
        
        setIsLoading(true);
        setError(null);
        setResults(null);
        setMismatches([]);
        setProgress({ message: t('shcReport.status.readingFiles'), percentage: 0 });

        // TODO: Load section config from DB
        const sectionConfig: ShcSectionConfig = { sections: [], order: [] }; 

        workerRef.current.postMessage({
            sectionConfig,
        });
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
            
            {/* TODO: Add Section Configuration Management UI */}
            
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
                            <pre class={styles['json-preview']}>
                                {JSON.stringify(results, null, 2)}
                            </pre>
                        </div>
                    )}
                     {mismatches.length > 0 && (
                        <div class={styles['results-section']}>
                            <h3>{t('shcReport.results.mismatchesTitle')} ({mismatches.length})</h3>
                            <pre class={styles['json-preview']}>
                                {JSON.stringify(mismatches, null, 2)}
                            </pre>
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

import { useState, useEffect, useRef } from 'preact/hooks';
import { useTranslation } from '../i18n';
import type { ShcDataType, ShcAnalysisResult, ShcMismatchItem, ShcSectionConfig } from '../utils/types';
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

        workerRef.current.onmessage = (e: MessageEvent) => {
            // TODO: Handle messages from worker (progress, complete, error)
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

        try {
            // TODO: Load section config from DB
            const sectionConfig: ShcSectionConfig = { sections: [], order: [] }; 

            workerRef.current.postMessage({
                sectionConfig,
            });

        } catch (err) {
            setError(t('shcReport.errors.fileReadError'));
            setIsLoading(false);
        }
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

            {/* TODO: Add Results Display and PDF Export */}
            {results && !isLoading && (
                 <div class={sharedStyles['placeholder-view']}>
                    <h2>{t('shcReport.results.title')}</h2>
                    <p>{t('shcReport.results.placeholder')}</p>
                 </div>
            )}
        </div>
    );
};

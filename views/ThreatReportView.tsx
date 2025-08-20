import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { useTranslation } from '../i18n';
import { getUniqueWarehouseIds, getUniqueItemGroups, getUniqueProductStatuses } from '../db';
import type { ReportResultItem, WorkerMessage, WorkerRequest, UserSession } from '../utils/types';
import styles from './ThreatReportView.module.css';
import sharedStyles from '../styles/shared.module.css';

type CheckboxFilterProps = {
    title: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    disabled?: boolean;
};

const CheckboxFilterGroup = ({ title, options, selected, onChange, disabled = false }: CheckboxFilterProps) => {
    const { t } = useTranslation();

    const handleSelectAll = () => onChange(options);
    const handleDeselectAll = () => onChange([]);
    
    const handleCheckboxChange = (option: string, isChecked: boolean) => {
        if (isChecked) {
            onChange([...selected, option]);
        } else {
            onChange(selected.filter(item => item !== option));
        }
    };

    return (
        <div class={styles['checkbox-filter-group']}>
            <fieldset disabled={disabled}>
                <legend>{title}</legend>
                <div class={styles['checkbox-filter-header']}>
                    <button onClick={handleSelectAll}>{t('threatReport.controls.selectAll')}</button>
                    <button onClick={handleDeselectAll}>{t('threatReport.controls.deselectAll')}</button>
                </div>
                <div class={styles['checkbox-list']}>
                    {options.map(option => (
                        <label key={option}>
                            <input
                                type="checkbox"
                                checked={selected.includes(option)}
                                onChange={(e) => handleCheckboxChange(option, (e.target as HTMLInputElement).checked)}
                            />
                            {option}
                        </label>
                    ))}
                </div>
            </fieldset>
        </div>
    );
};

type ThreatReportViewProps = {
    userSession: UserSession | null;
    onNavigateToSimulation: (warehouseId: string, fullProductId: string) => void;
    onStartWatchlist: (items: ReportResultItem[]) => void;
};

export const ThreatReportView = ({ userSession, onNavigateToSimulation, onStartWatchlist }: ThreatReportViewProps) => {
    const { t, language } = useTranslation();
    const workerRef = useRef<Worker | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
    const [reportResults, setReportResults] = useState<ReportResultItem[] | null>(null);

    const [availableWarehouses, setAvailableWarehouses] = useState<string[]>([]);
    const [availableItemGroups, setAvailableItemGroups] = useState<string[]>([]);
    const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
    const [selectedItemGroups, setSelectedItemGroups] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    
    const [selectedForWatchlist, setSelectedForWatchlist] = useState<Set<string>>(new Set());

    useEffect(() => {
        workerRef.current = new Worker(new URL('../threatReport.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
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

    useEffect(() => {
        (async () => {
            const isRdcMode = userSession?.mode === 'rdc';
            const [ig, st] = await Promise.all([
                getUniqueItemGroups(),
                getUniqueProductStatuses(),
            ]);

            if (isRdcMode) {
                const rdcId = userSession.rdc!.id;
                setAvailableWarehouses([rdcId]);
                setSelectedWarehouses([rdcId]);
            } else {
                const wh = await getUniqueWarehouseIds();
                setAvailableWarehouses(wh);
                setSelectedWarehouses(wh);
            }
            
            setAvailableItemGroups(ig);
            setAvailableStatuses(st);
            setSelectedItemGroups(ig);
            setSelectedStatuses(st);
        })();
    }, [userSession]);

    const handleRunReport = () => {
        if (!workerRef.current) return;
        setIsLoading(true);
        setReportResults(null);
        setSelectedForWatchlist(new Set());
        setProgress({ processed: 0, total: 0 });
        const request: WorkerRequest = {
            warehouseIds: selectedWarehouses,
            itemGroupIds: selectedItemGroups,
            statusIds: selectedStatuses,
        };
        workerRef.current.postMessage(request);
    };

    const handleToggleWatchlistItem = (key: string, checked: boolean) => {
        const newSet = new Set(selectedForWatchlist);
        if (checked) {
            newSet.add(key);
        } else {
            newSet.delete(key);
        }
        setSelectedForWatchlist(newSet);
    };

    const handleToggleAllWatchlistItems = (checked: boolean) => {
        if (checked) {
            const allKeys = reportResults?.map(item => `${item.warehouseId}-${item.fullProductId}`) || [];
            setSelectedForWatchlist(new Set(allKeys));
        } else {
            setSelectedForWatchlist(new Set());
        }
    };
    
    const handleAnalyzeSelected = () => {
        if (!reportResults) return;
        const selectedItems = reportResults.filter(item => 
            selectedForWatchlist.has(`${item.warehouseId}-${item.fullProductId}`)
        );
        onStartWatchlist(selectedItems);
    };

    const canRun = useMemo(() => {
        return selectedWarehouses.length > 0 && selectedItemGroups.length > 0 && selectedStatuses.length > 0 && !isLoading;
    }, [selectedWarehouses, selectedItemGroups, selectedStatuses, isLoading]);
    
    const allSelected = reportResults ? reportResults.length > 0 && selectedForWatchlist.size === reportResults.length : false;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(language, { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    }
    
    return (
        <div class={styles['threat-report-view']}>
            <div class={styles['threat-report-controls']}>
                <h3>{t('threatReport.title')}</h3>
                <p>{t('threatReport.description')}</p>

                <div class={styles['threat-report-filters']}>
                    <CheckboxFilterGroup 
                        title={t('threatReport.controls.warehouses')}
                        options={availableWarehouses}
                        selected={selectedWarehouses}
                        onChange={setSelectedWarehouses}
                        disabled={userSession?.mode === 'rdc'}
                    />
                     <CheckboxFilterGroup 
                        title={t('threatReport.controls.itemGroups')}
                        options={availableItemGroups}
                        selected={selectedItemGroups}
                        onChange={setSelectedItemGroups}
                    />
                     <CheckboxFilterGroup 
                        title={t('threatReport.controls.statuses')}
                        options={availableStatuses}
                        selected={selectedStatuses}
                        onChange={setSelectedStatuses}
                    />
                </div>
                <div class={`${sharedStyles['filter-actions']}`} style={{justifyContent: 'flex-start', flexWrap: 'wrap'}}>
                    <button class={sharedStyles['button-primary']} onClick={handleRunReport} disabled={!canRun}>
                        {t('threatReport.controls.runReport')}
                    </button>
                    {selectedForWatchlist.size > 0 && (
                        <button class={`${sharedStyles['button-primary']} ${sharedStyles.reload}`} onClick={handleAnalyzeSelected}>
                            {t('threatReport.results.analyzeSelected', { count: selectedForWatchlist.size })}
                        </button>
                    )}
                </div>
            </div>

            {isLoading && (
                <div class={styles['report-progress-section']}>
                    <h4>{t('threatReport.controls.runningTitle')}</h4>
                    {progress && progress.total > 0 && (
                        <>
                            <p>{t('threatReport.controls.runningDescription', { processed: progress.processed, total: progress.total })}</p>
                            <div class={sharedStyles['progress-bar-container']}>
                                <div class={sharedStyles['progress-bar']} style={{ width: `${(progress.processed / progress.total) * 100}%` }}></div>
                            </div>
                        </>
                    )}
                     {(!progress || progress.total === 0) && <div class={sharedStyles.spinner}></div>}
                </div>
            )}

            {reportResults && !isLoading && (
                 <div class={styles['threat-report-results']}>
                    <h3>{t('threatReport.results.title')}</h3>
                    {reportResults.length > 0 ? (
                        <div class={sharedStyles['table-container']}>
                            <table>
                                <thead>
                                    <tr>
                                        <th class={styles['checkbox-cell']}>
                                            <input 
                                                type="checkbox" 
                                                checked={allSelected}
                                                onChange={(e) => handleToggleAllWatchlistItems((e.target as HTMLInputElement).checked)}
                                            />
                                        </th>
                                        <th>{t('threatReport.results.warehouseId')}</th>
                                        <th>{t('threatReport.results.productId')}</th>
                                        <th>{t('threatReport.results.caseSize')}</th>
                                        <th>{t('threatReport.results.palletFactor')}</th>
                                        <th>{t('threatReport.results.daysOfStock')}</th>
                                        <th>{t('threatReport.results.aldValue')}</th>
                                        <th>{t('threatReport.results.avgDailySales')}</th>
                                        <th>{t('threatReport.results.nonCompliantReceipts')}</th>
                                        <th>{t('threatReport.results.writeOffValue')}</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportResults.map(item => {
                                        const key = `${item.warehouseId}-${item.fullProductId}`;
                                        return (
                                        <tr key={key}>
                                            <td class={styles['checkbox-cell']}>
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedForWatchlist.has(key)}
                                                    onChange={(e) => handleToggleWatchlistItem(key, (e.target as HTMLInputElement).checked)}
                                                />
                                            </td>
                                            <td>{item.warehouseId}</td>
                                            <td>{item.productId}</td>
                                            <td>{item.caseSize}</td>
                                            <td>{item.cartonsPerPallet}</td>
                                            <td>{item.daysOfStock.toFixed(1)}</td>
                                            <td>{formatCurrency(item.aldValue)}</td>
                                            <td>{item.avgDailySales.toFixed(2)}</td>
                                            <td>{item.nonCompliantReceipts}</td>
                                            <td><strong>{formatCurrency(item.totalWriteOffValue)}</strong></td>
                                            <td>
                                                <button 
                                                    class={sharedStyles['button-primary']}
                                                    onClick={() => onNavigateToSimulation(item.warehouseId, item.fullProductId)}
                                                >
                                                    {t('threatReport.results.goToSimulation')}
                                                </button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p>{t('threatReport.results.noResults')}</p>
                    )}
                 </div>
            )}
        </div>
    );
};

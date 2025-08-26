import { useTranslation } from '../i18n';
import { DataType, UserSession, ShcDataType } from '../utils/types';
import { ImportMetadata } from '../db';
import styles from './ImportView.module.css';
import sharedStyles from '../styles/shared.module.css';

const isDateToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear();
};

type ImportViewProps = {
    isLoading: boolean;
    importMetadata: ImportMetadata;
    counts: { [key in DataType | ShcDataType | 'writeOffsTargets']: number };
    onFileSelect: (type: DataType, event: Event) => void;
    onClear: (type: DataType) => void;
    onClearShcFile: (type: ShcDataType) => void;
    onShcFileSelect: (type: ShcDataType, event: Event) => void;
    linkedFiles: Map<DataType, FileSystemFileHandle>;
    onReload: (type: DataType) => void;
    userSession: UserSession | null;
    onLinkFile: (dataType: DataType) => void;
    onClearLink: (dataType: DataType) => void;
    onClearAll: () => void;
    onImportWriteOffsTargetsClick: () => void;
    onClearWriteOffsTargets: () => void;
};

export const ImportView = (props: ImportViewProps) => {
    const { t, language } = useTranslation();
    const isApiSupported = 'showOpenFilePicker' in window;
    
    const {
        isLoading, importMetadata, counts, onFileSelect, onClear, onClearShcFile, onShcFileSelect,
        linkedFiles, onReload, userSession, onLinkFile, onClearLink, onClearAll,
        onImportWriteOffsTargetsClick, onClearWriteOffsTargets
    } = props;

    const formatStatusDate = (date: Date): string => {
        if (isDateToday(date)) {
            return `${t('import.status.todayAt')} ${date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleDateString(language, { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const dataTypes: {
        key: DataType;
        titleKey: string;
        descriptionKey: string;
        accept: string;
    }[] = [
        { key: 'products', titleKey: 'import.products.title', descriptionKey: 'import.products.description', accept: '.csv' },
        { key: 'goodsReceipts', titleKey: 'import.goodsReceipts.title', descriptionKey: 'import.goodsReceipts.description', accept: '.csv' },
        { key: 'openOrders', titleKey: 'import.openOrders.title', descriptionKey: 'import.openOrders.description', accept: '.csv' },
        { key: 'sales', titleKey: 'import.sales.title', descriptionKey: 'import.sales.description', accept: '.csv,.txt' },
    ];
    
    const shcDataTypes: {
        key: ShcDataType;
        titleKey: string;
        accept: string;
    }[] = [
        { key: 'shc', titleKey: 'import.shc.shc.title', accept: '.csv' },
        { key: 'planogram', titleKey: 'import.shc.planogram.title', accept: '.xls' },
        { key: 'orgStructure', titleKey: 'import.shc.orgStructure.title', accept: '.xlsx' },
        { key: 'categoryRelation', titleKey: 'import.shc.categoryRelation.title', accept: '.xls' },
    ];

    const renderStatusAndCount = (type: DataType | ShcDataType | 'writeOffsTargets') => {
        const meta = (importMetadata as any)[type];
        const count = counts[type] || 0;
        const statusIcon = count > 0 ? '✓' : '✗';
        const statusClass = count > 0 ? styles.success : styles.error;
        let statusText = t('import.status.noData');
        if (meta && meta.lastImported) {
            statusText = `${t('import.status.updated')} ${formatStatusDate(new Date(meta.lastImported))}`;
        }
        return (
            <div class={styles['import-status-details']}>
                <span class={`${styles['status-icon']} ${statusClass}`}>{statusIcon}</span>
                <div>
                    <p class={styles['status-main-text']}>{statusText}</p>
                    <p class={styles['status-sub-text']}>{count.toLocaleString(language)} {t('import.status.records')}</p>
                </div>
            </div>
        );
    };

    return (
        <div class={styles['import-view']}>
            <div class={styles['import-view-header']}>
                <h3>{t('sidebar.import')}</h3>
                <button 
                    class={sharedStyles['button-secondary']} 
                    onClick={onClearAll} 
                    disabled={isLoading}
                >
                    {t('actions.clearAll')}
                </button>
            </div>
            <div class={styles['import-container']}>
                {dataTypes.map(({ key, titleKey, descriptionKey, accept }) => {
                    const isLinked = linkedFiles.has(key);
                    const count = counts[key] || 0;
                    return (
                        <div class={styles['import-section']} key={key}>
                            <div class={styles['import-section-header']}>
                                <h2>{t(titleKey)}</h2>
                                {renderStatusAndCount(key)}
                            </div>
                            <div class={styles['import-section-description']}>
                                <p>{t(descriptionKey)}</p>
                            </div>
                            
                            <div class={styles['import-section-footer']}>
                                <div class={styles['import-link-status']}>
                                    {isLinked
                                        ? <><strong>{t('import.status.linkedTo')}:</strong> {linkedFiles.get(key)?.name}</>
                                        : <span>{t('import.status.noLinkedFile')}</span>
                                    }
                                </div>
                                <div class={styles['import-actions']}>
                                    <input id={`${key}-file-input`} type="file" style={{ display: 'none' }} accept={accept} onChange={(e) => onFileSelect(key, e)} disabled={isLoading} />
                                    
                                    {isLinked ? (
                                        <>
                                            <button onClick={() => onReload(key)} class={`${sharedStyles.buttonPrimary} ${sharedStyles.reload}`} disabled={isLoading}>{t('import.buttons.reload')}</button>
                                            <button onClick={() => onClearLink(key)} class={sharedStyles.buttonClear} disabled={isLoading}>{t('settings.dataSources.clearLink')}</button>
                                        </>
                                    ) : (
                                        <>
                                            <label htmlFor={`${key}-file-input`} class={`${sharedStyles.buttonPrimary} ${isLoading ? sharedStyles.disabled : ''}`}>
                                                {count > 0 ? t('import.buttons.change') : t('import.buttons.selectFile')}
                                            </label>
                                            {isApiSupported && (
                                                <button onClick={() => onLinkFile(key)} class={sharedStyles.buttonLink} disabled={isLoading}>{t('settings.dataSources.linkFile')}</button>
                                            )}
                                        </>
                                    )}
                                    
                                    {count > 0 && (
                                        <button onClick={() => onClear(key)} class={sharedStyles.buttonSecondary} disabled={isLoading}>{t('import.buttons.clear')}</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

             <div class={styles['shc-section-container']}>
                <div class={styles['shc-section-header-main']}>
                  <h2>{t('import.shc.title')}</h2>
                </div>
                <div class={styles['import-container']}>
                {shcDataTypes.map(({ key, titleKey, accept }) => {
                    const count = counts[key] || 0;
                    const buttonText = key === 'shc'
                        ? t('import.buttons.addFile')
                        : (count > 0 ? t('import.buttons.change') : t('import.buttons.selectFile'));
                    return (
                        <div class={`${styles['import-section']} ${styles['shc-import-section']}`} key={key}>
                            <div class={styles['import-section-header']}>
                                <h2>{t(titleKey)}</h2>
                                {renderStatusAndCount(key)}
                            </div>
                            <div class={styles['import-section-footer']}>
                                <div class={styles['import-actions']}>
                                    <input id={`${key}-file-input`} type="file" style={{ display: 'none' }} accept={accept} onChange={(e) => onShcFileSelect(key, e)} disabled={isLoading} />
                                    <label htmlFor={`${key}-file-input`} class={`${sharedStyles.buttonPrimary} ${isLoading ? sharedStyles.disabled : ''}`}>
                                        {buttonText}
                                    </label>
                                    {count > 0 && (
                                        <button onClick={() => onClearShcFile(key)} class={sharedStyles.buttonSecondary} disabled={isLoading}>{t('import.buttons.clear')}</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>

            <div class={styles['shc-section-container']}>
                <div class={styles['shc-section-header-main']}>
                    <h2>{t('import.writeOffs.title')}</h2>
                </div>
                <div class={styles['import-container']}>
                    <div class={`${styles['import-section']} ${styles['shc-import-section']}`}>
                        <div class={styles['import-section-header']}>
                            <h2>{t('import.writeOffs.weekly')}</h2>
                            {renderStatusAndCount('writeOffsWeekly')}
                        </div>
                        <div class={styles['import-section-footer']}>
                             <div class={styles['import-actions']}>
                                <input id="writeOffsWeekly-file-input" type="file" style={{ display: 'none' }} accept=".csv" onChange={(e) => onFileSelect('writeOffsWeekly', e)} disabled={isLoading} />
                                <label htmlFor="writeOffsWeekly-file-input" class={`${sharedStyles.buttonPrimary} ${isLoading ? sharedStyles.disabled : ''}`}>{t('import.buttons.selectFile')}</label>
                                {counts.writeOffsWeekly > 0 && <button onClick={() => onClear('writeOffsWeekly')} class={sharedStyles.buttonSecondary} disabled={isLoading}>{t('import.buttons.clear')}</button>}
                            </div>
                        </div>
                    </div>
                     <div class={`${styles['import-section']} ${styles['shc-import-section']}`}>
                        <div class={styles['import-section-header']}>
                            <h2>{t('import.writeOffs.ytd')}</h2>
                            {renderStatusAndCount('writeOffsYTD')}
                        </div>
                        <div class={styles['import-section-footer']}>
                             <div class={styles['import-actions']}>
                                <input id="writeOffsYTD-file-input" type="file" style={{ display: 'none' }} accept=".csv" onChange={(e) => onFileSelect('writeOffsYTD', e)} disabled={isLoading} />
                                <label htmlFor="writeOffsYTD-file-input" class={`${sharedStyles.buttonPrimary} ${isLoading ? sharedStyles.disabled : ''}`}>{t('import.buttons.selectFile')}</label>
                                {counts.writeOffsYTD > 0 && <button onClick={() => onClear('writeOffsYTD')} class={sharedStyles.buttonSecondary} disabled={isLoading}>{t('import.buttons.clear')}</button>}
                            </div>
                        </div>
                    </div>
                     <div class={`${styles['import-section']} ${styles['shc-import-section']}`}>
                        <div class={styles['import-section-header']}>
                            <h2>{t('import.writeOffs.targets')}</h2>
                            {renderStatusAndCount('writeOffsTargets')}
                        </div>
                        <div class={styles['import-section-footer']}>
                           <div class={styles['import-actions']}>
                                <button onClick={onImportWriteOffsTargetsClick} class={`${sharedStyles.buttonPrimary} ${isLoading ? sharedStyles.disabled : ''}`}>{t('import.buttons.selectFile')}</button>
                                {counts.writeOffsTargets > 0 && <button onClick={onClearWriteOffsTargets} class={sharedStyles.buttonSecondary} disabled={isLoading}>{t('import.buttons.clear')}</button>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

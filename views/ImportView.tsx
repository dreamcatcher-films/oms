import { useTranslation } from '../i18n';
import { DataType } from '../utils/types';
import { ImportMetadata } from '../db';

const isDateToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() &&
        someDate.getMonth() === today.getMonth() &&
        someDate.getFullYear() === today.getFullYear();
};

export const ImportView = ({
    isLoading,
    importMetadata,
    counts,
    onFileSelect,
    onClear,
    linkedFiles,
    onReload,
}: {
    isLoading: boolean;
    importMetadata: ImportMetadata;
    counts: { products: number; goodsReceipts: number; openOrders: number; sales: number };
    onFileSelect: (type: DataType, event: Event) => void;
    onClear: (type: DataType) => void;
    linkedFiles: Map<DataType, FileSystemFileHandle>;
    onReload: (type: DataType) => void;
}) => {
    const { t, language } = useTranslation();
    
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
        {
            key: 'products',
            titleKey: 'import.products.title',
            descriptionKey: 'import.products.description',
            accept: '.csv',
        },
        {
            key: 'goodsReceipts',
            titleKey: 'import.goodsReceipts.title',
            descriptionKey: 'import.goodsReceipts.description',
            accept: '.csv',
        },
        {
            key: 'openOrders',
            titleKey: 'import.openOrders.title',
            descriptionKey: 'import.openOrders.description',
            accept: '.csv',
        },
        {
            key: 'sales',
            titleKey: 'import.sales.title',
            descriptionKey: 'import.sales.description',
            accept: '.csv,.txt',
        },
    ];

    return (
        <div class="import-container">
            {dataTypes.map(({ key, titleKey, descriptionKey, accept }) => {
                const meta = importMetadata[key];
                const count = counts[key];
                const isUpdatedToday = meta && meta.lastImported ? isDateToday(new Date(meta.lastImported)) : false;
                const statusIcon = count > 0 && isUpdatedToday ? '✓' : '✗';
                const statusClass = count > 0 && isUpdatedToday ? 'success' : 'error';
                let statusText = t('import.status.noData');
                if (meta && meta.lastImported) {
                    statusText = `${t('import.status.updated')} ${formatStatusDate(new Date(meta.lastImported))}`;
                }
                const isLinked = linkedFiles.has(key);

                return (
                    <div class="import-section" key={key}>
                        <div class="import-section-header">
                            <h2>{t(titleKey)}</h2>
                            <div class={`import-status-details`}>
                                <span class={`status-icon ${statusClass}`}>{statusIcon}</span>
                                <div>
                                    <p class="status-main-text">{statusText}</p>
                                    <p class="status-sub-text">{count.toLocaleString(language)} {t('import.status.records')}</p>
                                </div>
                            </div>
                        </div>
                        <div class="import-section-description">
                            <p>{t(descriptionKey)}</p>
                        </div>
                        <div class="import-section-actions">
                             {isLinked && (
                                <button onClick={() => onReload(key)} class="button-primary reload" disabled={isLoading}>{t('import.buttons.reload')}</button>
                            )}
                            <label htmlFor={`${key}-file-input`} class={`file-label ${isLoading ? 'disabled' : ''}`}>
                                {isLinked ? t('import.buttons.change') : t('import.buttons.selectFile')}
                            </label>
                            <input id={`${key}-file-input`} type="file" accept={accept} onChange={(e) => onFileSelect(key, e)} disabled={isLoading} />
                            {count > 0 && <button onClick={() => onClear(key)} class="button-clear" disabled={isLoading}>{t('import.buttons.clear')}</button>}
                        </div>
                         {isLinked && (
                            <div class="import-linked-info">
                                <strong>{t('import.status.linkedTo')}:</strong> {linkedFiles.get(key)?.name}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

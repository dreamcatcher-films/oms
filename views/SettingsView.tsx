import { useTranslation } from '../i18n';
import { DataType } from '../utils/types';

type SettingsViewProps = {
    linkedFiles: Map<DataType, FileSystemFileHandle>;
    onLinkFile: (dataType: DataType) => void;
    onReloadFile: (dataType: DataType) => void;
    onClearLink: (dataType: DataType) => void;
    isLoading: boolean;
};

export const SettingsView = ({ linkedFiles, onLinkFile, onReloadFile, onClearLink, isLoading }: SettingsViewProps) => {
    const { t } = useTranslation();

    const dataTypes: DataType[] = ['products', 'goodsReceipts', 'openOrders', 'sales'];

    const isApiSupported = 'showOpenFilePicker' in window;

    return (
        <div class="settings-view">
            <h2>{t('settings.title')}</h2>
            
            <div class="settings-section">
                <h3>{t('settings.dataSources.title')}</h3>
                <p>{t('settings.dataSources.description')}</p>

                {!isApiSupported && (
                    <div class="status-container error" role="alert">
                        <p class="status-text">Your browser does not support the File System Access API. This feature is unavailable.</p>
                    </div>
                )}
                
                <div class="table-container">
                    <table class="data-sources-table">
                        <thead>
                            <tr>
                                <th>{t('settings.dataSources.dataType')}</th>
                                <th>{t('settings.dataSources.linkedFile')}</th>
                                <th>{t('settings.dataSources.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataTypes.map(type => {
                                const handle = linkedFiles.get(type);
                                const isLinked = !!handle;
                                return (
                                    <tr key={type}>
                                        <td><strong>{t(`dataType.${type}`)}</strong></td>
                                        <td>
                                            {isLinked ? (
                                                <span class="file-info">{handle.name}</span>
                                            ) : (
                                                <span class="file-info">{t('settings.dataSources.notLinked')}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div class="data-source-actions">
                                                <button 
                                                    onClick={() => onLinkFile(type)} 
                                                    class="button-link"
                                                    disabled={isLoading || !isApiSupported}
                                                >
                                                    {t('settings.dataSources.linkFile')}
                                                </button>
                                                {isLinked && (
                                                    <>
                                                        <button 
                                                            onClick={() => onReloadFile(type)} 
                                                            class="button-primary reload"
                                                            disabled={isLoading || !isApiSupported}
                                                        >
                                                            {t('import.buttons.reload')}
                                                        </button>
                                                        <button 
                                                            onClick={() => onClearLink(type)} 
                                                            class="button-clear"
                                                            disabled={isLoading || !isApiSupported}
                                                        >
                                                            {t('settings.dataSources.clearLink')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="settings-section">
                <h3>{t('settings.configManagement.title')}</h3>
                <p>{t('settings.configManagement.description')}</p>
                <div class="filter-actions">
                    <button class="button-primary" disabled>{t('settings.configManagement.exportButton')}</button>
                    <button class="button-primary" disabled>{t('settings.configManagement.importButton')}</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>{t('settings.watchlists.title')}</h3>
                <p>{t('settings.watchlists.description')}</p>
            </div>
        </div>
    );
};

import { useState } from 'preact/hooks';
import { useTranslation } from '../i18n';
import { DataType, RDC, UserSession, ExclusionListData } from '../utils/types';
import styles from './SettingsView.module.css';
import sharedStyles from '/styles/shared.module.css';

type SettingsViewProps = {
    linkedFiles: Map<DataType, FileSystemFileHandle>;
    onLinkFile: (dataType: DataType) => void;
    onReloadFile: (dataType: DataType) => void;
    onClearLink: (dataType: DataType) => void;
    isLoading: boolean;
    userSession: UserSession | null;
    rdcList: RDC[];
    onAddRdc: (rdc: RDC) => void;
    onDeleteRdc: (rdcId: string) => void;
    onExportConfig: () => void;
    onImportClick: () => void;
    exclusionList: ExclusionListData;
    onImportExclusionListClick: () => void;
    onClearExclusionList: () => void;
};

export const SettingsView = (props: SettingsViewProps) => {
    const { 
        linkedFiles, 
        onLinkFile, 
        onReloadFile, 
        onClearLink, 
        isLoading,
        userSession,
        rdcList,
        onAddRdc,
        onDeleteRdc,
        onExportConfig,
        onImportClick,
        exclusionList,
        onImportExclusionListClick,
        onClearExclusionList
    } = props;
    const { t } = useTranslation();
    const [newRdc, setNewRdc] = useState({ id: '', name: '' });

    const dataTypes: DataType[] = ['products', 'goodsReceipts', 'openOrders', 'sales'];
    const isApiSupported = 'showOpenFilePicker' in window;
    const isHq = userSession?.mode === 'hq';
    const exclusionListSize = exclusionList.list.size;

    const handleAddRdc = (e: Event) => {
        e.preventDefault();
        if (newRdc.id && newRdc.name) {
            onAddRdc(newRdc);
            setNewRdc({ id: '', name: '' });
        }
    };

    return (
        <div class={styles.settingsView}>
            <h2>{t('settings.title')}</h2>
            
            <div class={styles.settingsSection}>
                <h3>{t('settings.dataSources.title')}</h3>
                <p>{t('settings.dataSources.description')}</p>

                {!isApiSupported && (
                    <div class={`${sharedStyles.statusContainer} ${sharedStyles.error}`} role="alert">
                        <p class={sharedStyles.statusText}>Your browser does not support the File System Access API. This feature is unavailable.</p>
                    </div>
                )}
                
                <div class={sharedStyles.tableContainer}>
                    <table class={styles.settingsTable}>
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
                                                <span class={styles.fileInfo}>{handle.name}</span>
                                            ) : (
                                                <span class={styles.fileInfo}>{t('settings.dataSources.notLinked')}</span>
                                            )}
                                        </td>
                                        <td>
                                            <div class={styles.dataSourceActions}>
                                                <button 
                                                    onClick={() => onLinkFile(type)} 
                                                    class={sharedStyles.buttonLink}
                                                    disabled={isLoading || !isApiSupported}
                                                >
                                                    {t('settings.dataSources.linkFile')}
                                                </button>
                                                {isLinked && (
                                                    <>
                                                        <button 
                                                            onClick={() => onReloadFile(type)} 
                                                            class={`${sharedStyles.buttonPrimary} ${sharedStyles.reload}`}
                                                            disabled={isLoading || !isApiSupported}
                                                        >
                                                            {t('import.buttons.reload')}
                                                        </button>
                                                        <button 
                                                            onClick={() => onClearLink(type)} 
                                                            class={sharedStyles.buttonClear}
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

             <div class={styles.settingsSection}>
                <h3>{t('settings.exclusionList.title')}</h3>
                <p>{t('settings.exclusionList.description')}</p>
                <p><strong>{t('settings.exclusionList.currentCount', { count: exclusionListSize })}</strong></p>
                <div class={sharedStyles.filterActions}>
                    <button class={sharedStyles.buttonPrimary} onClick={onImportExclusionListClick}>{t('settings.exclusionList.importButton')}</button>
                    <button class={sharedStyles.buttonSecondary} onClick={onClearExclusionList} disabled={exclusionListSize === 0}>{t('settings.exclusionList.clearButton')}</button>
                </div>
            </div>

            <div class={styles.settingsSection}>
                <h3>{t('settings.configManagement.title')}</h3>
                <p>{t('settings.configManagement.description')}</p>
                <div class={sharedStyles.filterActions}>
                    <button class={sharedStyles.buttonPrimary} onClick={onExportConfig}>{t('settings.configManagement.exportButton')}</button>
                    <button class={sharedStyles.buttonPrimary} onClick={onImportClick}>{t('settings.configManagement.importButton')}</button>
                </div>
            </div>

            {isHq && (
                <div class={styles.settingsSection}>
                    <h3>{t('settings.rdcManagement.title')}</h3>
                    <p>{t('settings.rdcManagement.description')}</p>
                    <div class={sharedStyles.tableContainer}>
                        <table class={styles.settingsTable}>
                            <thead>
                                <tr>
                                    <th>{t('settings.rdcManagement.rdcId')}</th>
                                    <th>{t('settings.rdcManagement.rdcName')}</th>
                                    <th>{t('settings.dataSources.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rdcList.map(rdc => (
                                    <tr key={rdc.id}>
                                        <td>{rdc.id}</td>
                                        <td>{rdc.name}</td>
                                        <td class={styles.rdcActions}>
                                            <button 
                                                onClick={() => {
                                                    if(confirm(t('settings.rdcManagement.deleteConfirm'))) {
                                                        onDeleteRdc(rdc.id)
                                                    }
                                                }}
                                                title={t('settings.rdcManagement.deleteRdc')}
                                            >&times;</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <form class={styles.addRdcForm} onSubmit={handleAddRdc}>
                        <div class={sharedStyles.filterGroup}>
                            <label for="new-rdc-id">{t('settings.rdcManagement.rdcId')}</label>
                            <input 
                                id="new-rdc-id" 
                                type="text" 
                                value={newRdc.id}
                                onInput={(e) => setNewRdc({...newRdc, id: (e.target as HTMLInputElement).value})}
                                required
                            />
                        </div>
                        <div class={sharedStyles.filterGroup}>
                            <label for="new-rdc-name">{t('settings.rdcManagement.rdcName')}</label>
                            <input 
                                id="new-rdc-name" 
                                type="text" 
                                value={newRdc.name}
                                onInput={(e) => setNewRdc({...newRdc, name: (e.target as HTMLInputElement).value})}
                                required
                            />
                        </div>
                        <div class={sharedStyles.filterActions}>
                             <button type="submit" class={sharedStyles.buttonPrimary}>{t('settings.rdcManagement.addRdc')}</button>
                        </div>
                    </form>
                </div>
            )}

            <div class={styles.settingsSection}>
                <h3>{t('settings.watchlists.title')}</h3>
                <p>{t('settings.watchlists.description')}</p>
            </div>
        </div>
    );
};

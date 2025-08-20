import { useTranslation } from '../i18n';
import styles from './AutoRefreshControl.module.css';

type Props = {
    config: { isEnabled: boolean; interval: number; };
    onConfigChange: (newConfig: { isEnabled: boolean; interval: number; }) => void;
    timeToNextRefresh: number;
};

const formatTime = (seconds: number) => {
    if (seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const AutoRefreshControl = ({ config, onConfigChange, timeToNextRefresh }: Props) => {
    const { t } = useTranslation();
    const intervals = [15, 30, 60, 120];

    return (
        <div class={styles['auto-refresh-container']}>
            <div class={styles['control-group']}>
                <label class={styles['control-label']} for="auto-refresh-toggle">{t('header.autoRefresh.title')}</label>
                <label class={styles.switch}>
                    <input
                        id="auto-refresh-toggle"
                        type="checkbox"
                        checked={config.isEnabled}
                        onChange={(e) => onConfigChange({ ...config, isEnabled: (e.target as HTMLInputElement).checked })}
                    />
                    <span class={styles.slider}></span>
                </label>
            </div>
            {config.isEnabled && (
                <>
                    <div class={styles['control-group']}>
                        <label class={styles['control-label']} for="interval-select">{t('header.autoRefresh.interval')}:</label>
                        <select
                            id="interval-select"
                            value={config.interval}
                            onChange={(e) => onConfigChange({ ...config, interval: parseInt((e.target as HTMLSelectElement).value, 10) })}
                        >
                            {intervals.map(i => <option key={i} value={i}>{i} {t('header.autoRefresh.minutes')}</option>)}
                        </select>
                    </div>
                    <div class={styles['timer-display']} title={t('header.autoRefresh.nextRefreshIn')}>
                        {formatTime(timeToNextRefresh)}
                    </div>
                </>
            )}
        </div>
    );
};

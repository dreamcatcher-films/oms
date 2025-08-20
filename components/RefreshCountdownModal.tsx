import { useTranslation } from '../i18n';
import styles from './RefreshCountdownModal.module.css';
import sharedStyles from '../styles/shared.module.css';

type Props = {
    countdown: number;
    onCancel: () => void;
};

export const RefreshCountdownModal = ({ countdown, onCancel }: Props) => {
    const { t } = useTranslation();

    return (
        <div class={styles['modal-overlay']}>
            <div class={styles['modal-content']}>
                <h3>{t('modals.refresh.title')}</h3>
                <p>{t('modals.refresh.message', { seconds: countdown })}</p>
                <div class={styles['modal-actions']}>
                    <button class={sharedStyles['button-secondary']} onClick={onCancel}>
                        {t('modals.refresh.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

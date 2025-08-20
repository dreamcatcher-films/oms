import { useTranslation } from '../i18n';
import styles from './IdleSplashScreen.module.css';

type Props = {
    onContinue: () => void;
};

export const IdleSplashScreen = ({ onContinue }: Props) => {
    const { t } = useTranslation();

    return (
        <div class={styles['splash-overlay']}>
            <h1 class={styles['splash-title']}>OMS</h1>
            <p class={styles['splash-message']}>{t('modals.idle.title')}</p>
            <button class={styles['splash-button']} onClick={onContinue}>
                {t('modals.idle.continue')}
            </button>
        </div>
    );
};

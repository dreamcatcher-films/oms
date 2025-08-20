import { useState } from "preact/hooks";
import { useTranslation } from '../i18n';
import styles from './LanguageSelector.module.css';

export const LanguageSelector = () => {
    const { language, setLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'pl', name: 'Polski', flag: '🇵🇱' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    ];

    const selectedLanguage = languages.find(lang => lang.code === language);

    return (
        <div class={styles.languageSelector} onBlur={() => setIsOpen(false)} tabIndex={0}>
            <button class={styles.selectorButton} onClick={() => setIsOpen(!isOpen)}>
                {selectedLanguage?.flag}
                <span class={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
                <ul class={styles.selectorDropdown}>
                    {languages.map(lang => (
                        <li key={lang.code} onMouseDown={() => { setLanguage(lang.code); setIsOpen(false); }}>
                            {lang.flag} {lang.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

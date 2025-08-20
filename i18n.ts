import { h, createContext, Component, VNode, ComponentChildren } from 'preact';
import { useState, useContext, useEffect } from 'preact/hooks';

import en from './locales/en.js';
import pl from './locales/pl.js';
import de from './locales/de.js';

type Translations = { [key: string]: any };

const translations: { [key: string]: Translations } = { en, pl, de };

const getInitialLanguage = (): string => {
    const savedLang = localStorage.getItem('oms-language');
    if (savedLang && translations[savedLang]) {
        return savedLang;
    }
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) {
        return browserLang;
    }
    return 'en';
};

type LanguageContextType = {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ComponentChildren }) => {
  const [language, setLanguageState] = useState<string>(getInitialLanguage());

  useEffect(() => {
    localStorage.setItem('oms-language', language);
  }, [language]);

  const setLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguageState(lang);
    }
  };

  const t = (key: string, options?: { [key: string]: string | number }): string => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found
        let fallbackResult: any = translations['en'];
        for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
        }
        if (fallbackResult === undefined) {
            return key; // Return key if not found in English either
        }
        result = fallbackResult;
        break;
      }
    }
    
    if (typeof result === 'string' && options) {
        return result.replace(/{{(\w+)}}/g, (placeholder, name) => {
            return options[name] !== undefined ? String(options[name]) : placeholder;
        });
    }

    return result || key;
  };
  
  return h(LanguageContext.Provider, { value: { language, setLanguage, t } }, children);
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import en from './locales/en.json';
import zhHans from './locales/zh-hans.json';
import type { Language } from '../types';

const resources: Record<Language, Record<string, string>> = {
  en: en as Record<string, string>,
  'zh-hans': zhHans as Record<string, string>,
};

/**
 * 按浏览器语言偏好自动选择语言。`navigator.languages` 正是浏览器请求头
 * Accept-Language 的来源（按优先级排列）：首选语言为中文或其衍生
 * （zh、zh-CN、zh-TW、zh-Hant 等）时使用简体中文，其余一律使用 English。
 */
function detectLanguage(): Language {
  const preferred = navigator.languages?.[0] || navigator.language || '';
  return /^zh/i.test(preferred) ? 'zh-hans' : 'en';
}

// 显式 ?lang= 优先，其次按 Accept-Language 自动判定
const urlParams = new URLSearchParams(window.location.search);
const langParam = urlParams.get('lang');
let defaultLang: Language = detectLanguage();
if (langParam === 'en') defaultLang = 'en';
else if (langParam === 'zh-hans' || langParam === 'zh-Hans') defaultLang = 'zh-hans';

function tFunc(lang: Language, key: string): string {
  return resources[lang]?.[key] ?? resources['zh-hans']?.[key] ?? key;
}

interface I18nContextValue {
  language: Language;
  t: (key: string) => string;
  changeLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextValue>({
  language: defaultLang,
  t: (key: string) => tFunc(defaultLang, key),
  changeLanguage: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(defaultLang);

  // 同步文档语言标记，便于屏幕阅读器与搜索引擎按实际语言解析
  useEffect(() => {
    document.documentElement.lang = language === 'zh-hans' ? 'zh-Hans' : 'en';
  }, [language]);

  const t = useCallback((key: string) => {
    return tFunc(language, key);
  }, [language]);

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
  }, []);

  const value = useMemo(() => ({ language, t, changeLanguage }), [language, t, changeLanguage]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  return {
    t: ctx.t,
    i18n: {
      language: ctx.language,
      changeLanguage: ctx.changeLanguage,
    },
  };
}

export default { useTranslation };
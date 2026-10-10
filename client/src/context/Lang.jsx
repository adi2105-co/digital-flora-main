import React, { createContext, useContext, useState, useEffect } from 'react';
import { STR } from '../i18n.js';

const Ctx = createContext(null);
export const useLang = () => useContext(Ctx);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('df_lang') || 'en'; } catch { return 'en'; } });
  useEffect(() => { try { localStorage.setItem('df_lang', lang); } catch { /* ignore */ } document.documentElement.lang = lang; }, [lang]);
  const t = (k) => (STR[lang] && STR[lang][k]) || STR.en[k] || k;
  // local plant name per language (falls back to English)
  const pname = (p) => {
    const en = p.common_name.split('(')[0].trim();
    if (lang === 'hi' && p.hindi_name) return p.hindi_name;
    if (lang === 'mr' && p.marathi_name) return p.marathi_name;
    return en;
  };
  return <Ctx.Provider value={{ lang, setLang, t, pname }}>{children}</Ctx.Provider>;
}

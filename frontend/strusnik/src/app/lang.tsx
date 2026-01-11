"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "pl" | "en";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null);
const KEY = "lang";

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pl");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "pl" || saved === "en") {
        setLangState(saved);
        document.documentElement.lang = saved;
      } else {
        document.documentElement.lang = "pl";
      }
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
      document.documentElement.lang = l;
    } catch {}
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);

  if (!ctx) {
    return {
      lang: "pl" as const,
      setLang: (_l: "pl" | "en") => {},
    };
  }

  return ctx;
}

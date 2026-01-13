"use client";

import React, { useEffect, useState } from "react";
import { useLang } from "../lang";
import { t } from "../i18n";

type Theme = "dark" | "light";

export default function TopRightToggles() {
  const { lang, setLang } = useLang();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const initial: Theme =
        saved === "light" || saved === "dark" ? saved : "dark";

      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    } catch (e) { }
  }, []);

  const toggleLang = () => setLang(lang === "pl" ? "en" : "pl");

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;

    try {
      localStorage.setItem("theme", next);
    } catch (e) { }
  };

  return (
    <div className="top-right-controls" role="group">
      <button type="button" className="top-right-btn touch-target" onClick={toggleLang}>
        {lang === "pl" ? "PL" : "EN"}
      </button>

      <button type="button" className="top-right-btn touch-target" onClick={toggleTheme}>
        <span className="hidden sm:inline">{theme === "dark" ? t(lang, "theme.dark") : t(lang, "theme.light")}</span>
        <span className="sm:hidden">{theme === "dark" ? "🌙" : "☀️"}</span>
      </button>
    </div>
  );
}

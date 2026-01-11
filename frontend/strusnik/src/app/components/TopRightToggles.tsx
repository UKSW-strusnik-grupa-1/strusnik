"use client";

import React, { useState } from "react";
import { useLang } from "../lang";
import { t } from "../i18n"; // ← dopasuj ścieżkę jeśli trzeba

export default function TopRightToggles() {
  const { lang, setLang } = useLang();
  const [themeStep, setThemeStep] = useState<1 | 2>(1);

  const toggleLang = () => setLang(lang === "pl" ? "en" : "pl");
  const toggleThemePlaceholder = () =>
    setThemeStep((v) => (v === 1 ? 2 : 1));

  return (
    <div className="top-right-controls" role="group">
      <button
        type="button"
        className="top-right-btn"
        onClick={toggleLang}
      >
        {lang === "pl" ? "PL" : "EN"}
      </button>

      <button
        type="button"
        className="top-right-btn"
        onClick={toggleThemePlaceholder}
      >
        {themeStep === 1
          ? t(lang, "theme.dark")
          : t(lang, "theme.light")}
      </button>
    </div>
  );
}

'use client';

import Button from "./components/main/button";
import { useLang } from "./lang";
import { t } from "./i18n";

export default function HomePage() {
  const { lang } = useLang();

  return (
    <main className="center">
      <nav className="menu-cta" aria-label="glowne menu">
        <Button alt="gry jednoosobowe" text={t(lang, "home.single")} href="/singleplayer" />
        <Button alt="gry wieloosobowe" text={t(lang, "home.multi")} href="/multiplayer" />
        <Button alt="rankingi" text={t(lang, "home.rankings")} href="/rankings" />
        <button type="button" className="menu-logout">
          {t(lang, "home.logout")}
        </button>
      </nav>
    </main>
  );
}
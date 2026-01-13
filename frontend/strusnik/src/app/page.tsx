'use client';

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./components/main/button";
import { useLang } from "./lang";
import { t } from "./i18n";
import { UserContext } from "./context/UserContext";
import { useSocket } from "./hooks/useSocket";
import ActiveGameBanner from "./components/lobby/ActiveGameBanner";

export default function HomePage() {
  const { lang } = useLang();
  const router = useRouter();
  const userContext = useContext(UserContext);
  const { activeGame, setActiveGame } = useSocket();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/admin/check', { credentials: 'include' });
        const data = await res.json();
        setIsAdmin(data.is_admin || false);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (userContext) {
        userContext.setUserInfo(null);
      }
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <main className="center safe-area-inset">
      {activeGame && (
        <div className="fixed top-12 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-full px-2 sm:px-0 sm:w-auto">
          <ActiveGameBanner
            gameName={activeGame.gameName}
            roomId={activeGame.roomId}
            roomName={activeGame.roomName}
            onDismiss={() => setActiveGame(null)}
          />
        </div>
      )}

      <nav className="menu-cta" aria-label="glowne menu">
        <Button alt="gry jednoosobowe" text={t(lang, "home.single")} href="/singleplayer" />
        <Button alt="gry wieloosobowe" text={t(lang, "home.multi")} href="/multiplayer" />
        <Button alt="rankingi" text={t(lang, "home.rankings")} href="/rankings" />
        {isAdmin && (
          <Button alt="panel administratora" text="ADMIN PANEL" href="/admin" />
        )}
        <button type="button" className="menu-logout touch-target" onClick={handleLogout}>
          {t(lang, "home.logout")}
        </button>
      </nav>
    </main>
  );
}
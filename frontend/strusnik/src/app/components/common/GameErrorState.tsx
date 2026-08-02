"use client";

import Link from "next/link";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

interface GameErrorStateProps {
  message: string;
  href: string;
  roomId?: string;
}

export default function GameErrorState({ message, href, roomId }: GameErrorStateProps) {
  const { lang } = useLang();

  return (
    <main id="main-content" className="game-page-shell">
      <section className="game-error-state" role="alert" aria-labelledby="game-error-title">
        <p className="page-kicker">{t(lang, "error.title")}</p>
        <h1 id="game-error-title">{message}</h1>
        {roomId && <p className="game-error-state__id">{roomId}</p>}
        <Link className="game-primary-button" href={href}>
          {t(lang, "arrow")}
        </Link>
      </section>
    </main>
  );
}

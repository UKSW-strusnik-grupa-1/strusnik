"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

export default function AccountRequiredState() {
  const { lang } = useLang();

  return (
    <section
      className="account-required-state"
      aria-labelledby="account-required-title"
      aria-describedby="account-required-description"
    >
      <div className="account-required-state__icon" aria-hidden="true">
        <LockKeyhole size={28} strokeWidth={1.8} />
      </div>

      <div className="account-required-state__copy">
        <p className="account-required-state__eyebrow">{t(lang, "account.kicker")}</p>
        <h1 id="account-required-title">{t(lang, "account.title")}</h1>
        <p id="account-required-description">{t(lang, "account.description")}</p>
      </div>

      <div className="account-required-state__actions">
        <Link className="game-primary-button" href="/auth">
          {t(lang, "account.login")}
        </Link>
        <Link className="game-secondary-button" href="/">
          {t(lang, "account.back")}
        </Link>
      </div>
    </section>
  );
}

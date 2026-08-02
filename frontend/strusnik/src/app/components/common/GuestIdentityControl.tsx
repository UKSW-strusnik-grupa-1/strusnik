"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, Pencil, UserRound } from "lucide-react";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import { useUser } from "@/app/hooks/useUser";
import { useSocket } from "@/app/hooks/useSocket";
import { isValidGuestName } from "@/app/utils/guest";

export default function GuestIdentityControl() {
  const { lang } = useLang();
  const { userInfo, updateGuestName, resetGuest } = useUser();
  const { socket } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userInfo?.isGuest) return;
    const timer = window.setTimeout(() => setDraft(userInfo.nickname), 0);
    return () => window.clearTimeout(timer);
  }, [userInfo?.isGuest, userInfo?.nickname]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  if (!userInfo?.isGuest) return null;

  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.trim();
    if (!isValidGuestName(name)) {
      setError(t(lang, "guest.invalid_name"));
      return;
    }
    updateGuestName(name);
    socket?.emit("update_identity", { username: name });
    setError("");
    setIsOpen(false);
  };

  const endSession = () => {
    if (!window.confirm(t(lang, "guest.end_session_confirm"))) return;
    resetGuest();
    setIsOpen(false);
    window.location.assign("/");
  };

  return (
    <div className="guest-identity-control">
      <button
        type="button"
        className="guest-identity-trigger touch-target"
        aria-expanded={isOpen}
        aria-controls="guest-identity-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserRound size={16} aria-hidden="true" />
        <span>{userInfo.nickname}</span>
        <ChevronDown size={15} aria-hidden="true" className={isOpen ? "rotate-180" : ""} />
      </button>

      {isOpen && (
        <div id="guest-identity-panel" className="guest-identity-panel" role="dialog" aria-label={t(lang, "guest.badge")}>
          <p className="guest-identity-kicker">{t(lang, "guest.badge")}</p>
          <form onSubmit={saveName} className="guest-identity-form">
            <label htmlFor="guest-name">{t(lang, "guest.name_label")}</label>
            <div className="guest-name-field">
              <input
                id="guest-name"
                name="guest-name"
                value={draft}
                minLength={3}
                maxLength={20}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="nickname"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "guest-name-error" : undefined}
              />
              <Pencil size={15} aria-hidden="true" />
            </div>
            {error && <p id="guest-name-error" className="guest-identity-error" role="alert">{error}</p>}
            <button type="submit" className="game-primary-button">{t(lang, "guest.save")}</button>
          </form>
          <Link className="guest-login-link" href="/auth" target="_blank" rel="noreferrer">
            {t(lang, "guest.login")}
          </Link>
          <button type="button" className="guest-end-button" onClick={endSession}>
            {t(lang, "guest.end_session")}
          </button>
        </div>
      )}
    </div>
  );
}

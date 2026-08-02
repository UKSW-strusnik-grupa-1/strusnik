"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Accessibility, Check, KeyRound, Languages, LogIn, ShieldAlert, Trash2, UserRound, X } from "lucide-react";
import ReturnArrow from "../components/lobby/returnArrow";
import { useNotification } from "../context/NotificationsContext";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";
import { useLang, type Lang } from "../lang";
import { useMotionPreference } from "../motion";
import { t } from "../i18n";
import { isValidGuestName } from "../utils/guest";

type ApiPayload = {
  code?: string;
  error?: string;
};

const API_ERROR_KEYS: Record<string, string> = {
  UNAUTHORIZED: "settings.error.unauthorized",
  PASSWORD_FIELDS_REQUIRED: "settings.error.password_fields_required",
  INVALID_CURRENT_PASSWORD: "settings.error.invalid_current_password",
  PASSWORD_TOO_SHORT: "settings.error.password_too_short",
  PASSWORD_TOO_LONG: "settings.error.password_too_long",
  PASSWORD_MISMATCH: "settings.error.password_mismatch",
  PASSWORD_UNCHANGED: "settings.error.password_unchanged",
  PASSWORD_CHANGE_FAILED: "settings.error.password_change_failed",
  INVALID_DELETE_CONFIRMATION: "settings.error.invalid_delete_confirmation",
  ACTIVE_GAME: "settings.error.active_game",
  LAST_ADMIN: "settings.error.last_admin",
  ACCOUNT_DELETE_FAILED: "settings.error.account_delete_failed",
  NETWORK_ERROR: "settings.error.network_error",
};

async function readApiPayload(response: Response): Promise<ApiPayload> {
  return response.json().catch(() => ({}));
}

function localizedApiError(lang: Lang, payload: ApiPayload) {
  const key = payload.code ? API_ERROR_KEYS[payload.code] : undefined;
  return key ? t(lang, key) : t(lang, "settings.error.generic");
}

function normalizeConfirmation(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

export default function SettingsPage() {
  const { lang, setLang } = useLang();
  const { reducedMotion, setReducedMotion } = useMotionPreference();
  const [gameSoundEnabled, setGameSoundEnabled] = useState(true);
  const [gameEffectsEnabled, setGameEffectsEnabled] = useState(true);
  const { userInfo, isLoading, setUserInfo, updateGuestName } = useUser();
  const { socket, activeGame } = useSocket();
  const { notify } = useNotification();
  const router = useRouter();
  const isGuest = Boolean(userInfo?.isGuest);

  const [guestDraft, setGuestDraft] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guestSaved, setGuestSaved] = useState(false);
  const [isSavingGuest, setIsSavingGuest] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteDialogRef = useRef<HTMLElement>(null);
  const deleteTitleId = useId();
  const deleteDescriptionId = useId();
  const deleteErrorId = useId();

  useEffect(() => {
    if (isGuest && userInfo) setGuestDraft(userInfo.nickname);
  }, [isGuest, userInfo]);

  useEffect(() => {
    try {
      setGameSoundEnabled(window.localStorage.getItem("haxball-sound-enabled") !== "false");
      setGameEffectsEnabled(window.localStorage.getItem("haxball-effects-enabled") !== "false");
    } catch {
      // Local preferences are optional.
    }
  }, []);

  const updateGamePreference = (key: "haxball-sound-enabled" | "haxball-effects-enabled", enabled: boolean) => {
    try {
      window.localStorage.setItem(key, String(enabled));
    } catch {
      // Local preferences are optional.
    }
  };

  useEffect(() => {
    if (!isDeleteOpen) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const appContent = document.getElementById("app-content");
    appContent?.setAttribute("inert", "");

    const focusFrame = window.requestAnimationFrame(() => {
      const firstControl = deleteDialogRef.current?.querySelector<HTMLElement>("[data-delete-dialog-focus]");
      (firstControl ?? deleteDialogRef.current)?.focus();
    });

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isDeleting) setIsDeleteOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = deleteDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", trapFocus);
      appContent?.removeAttribute("inert");
      if (previousActiveElement && !isDeleting) previousActiveElement.focus({ preventScroll: true });
    };
  }, [isDeleteOpen, isDeleting]);

  const saveGuestName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidGuestName(guestDraft.trim())) {
      setGuestError(t(lang, "guest.invalid_name"));
      setGuestSaved(false);
      return;
    }

    setIsSavingGuest(true);
    const name = guestDraft.trim();
    updateGuestName(name);
    socket?.emit("update_identity", { username: name });
    setGuestDraft(name);
    setGuestError("");
    setGuestSaved(true);
    setIsSavingGuest(false);
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t(lang, "settings.error.password_fields_required"));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t(lang, "settings.error.password_too_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t(lang, "settings.error.password_mismatch"));
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) {
        setPasswordError(localizedApiError(lang, payload));
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } catch {
      setPasswordError(t(lang, "settings.error.network_error"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const openDeleteDialog = () => {
    setDeletePassword("");
    setDeleteConfirmation("");
    setDeleteError("");
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setIsDeleteOpen(false);
    deleteTriggerRef.current?.focus();
  };

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteError("");
    if (!deletePassword || !deleteConfirmation) {
      setDeleteError(t(lang, "settings.error.delete_fields_required"));
      return;
    }
    if (normalizeConfirmation(deleteConfirmation) !== normalizeConfirmation(t(lang, "settings.delete_confirmation_value"))) {
      setDeleteError(t(lang, "settings.error.invalid_delete_confirmation"));
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: deletePassword, confirmation: deleteConfirmation }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) {
        setDeleteError(localizedApiError(lang, payload));
        return;
      }

      setUserInfo(null);
      notify(t(lang, "settings.account_deleted"), "success");
      router.replace("/auth");
    } catch {
      setDeleteError(t(lang, "settings.error.network_error"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main id="main-content" className="settings-page-shell" aria-busy="true">
        <ReturnArrow href="/" text={t(lang, "settings.back")} />
        <div className="settings-page-frame settings-page-frame--loading">
          <span className="settings-loading">{t(lang, "settings.loading")}</span>
        </div>
      </main>
    );
  }

  const deleteDialog = isDeleteOpen && typeof document !== "undefined"
    ? createPortal(
      <div
        className="settings-dialog-layer"
        onMouseDown={(event) => {
          if (!isDeleting && event.target === event.currentTarget) closeDeleteDialog();
        }}
      >
        <div className="settings-dialog-backdrop" aria-hidden="true" onMouseDown={closeDeleteDialog} />
        <section
          ref={deleteDialogRef}
          className="settings-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={deleteTitleId}
          aria-describedby={deleteDescriptionId}
          tabIndex={-1}
        >
          <header className="settings-dialog__header">
            <div>
              <span className="settings-kicker">{t(lang, "settings.danger_zone")}</span>
              <h2 id={deleteTitleId}>{t(lang, "settings.delete_account_dialog_title")}</h2>
              <p id={deleteDescriptionId}>{t(lang, "settings.delete_account_dialog_description")}</p>
            </div>
            <button
              type="button"
              className="settings-icon-button"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
              data-delete-dialog-focus
              aria-label={t(lang, "settings.cancel")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <form className="settings-form" onSubmit={handleDeleteAccount}>
            <label className="settings-field">
              <span>{t(lang, "settings.delete_password")}</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                autoComplete="current-password"
                disabled={isDeleting}
              />
            </label>
            <label className="settings-field">
              <span>{t(lang, "settings.delete_confirmation")}</span>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
                aria-describedby={`${deleteDescriptionId} ${deleteError ? deleteErrorId : ""}`}
                disabled={isDeleting}
              />
              <small>{t(lang, "settings.delete_confirmation_hint")}</small>
            </label>
            {deleteError && <p id={deleteErrorId} className="settings-form-message settings-form-message--error" role="alert">{deleteError}</p>}
            <div className="settings-dialog__actions">
              <button type="button" className="settings-button settings-button--secondary" onClick={closeDeleteDialog} disabled={isDeleting}>
                {t(lang, "settings.cancel")}
              </button>
              <button type="submit" className="settings-button settings-button--danger" disabled={isDeleting}>
                <Trash2 size={16} aria-hidden="true" />
                {isDeleting ? t(lang, "settings.loading") : t(lang, "settings.confirm_delete_account")}
              </button>
            </div>
          </form>
        </section>
      </div>,
      document.body,
    )
    : null;

  return (
    <main id="main-content" className="settings-page-shell">
      <ReturnArrow href="/" text={t(lang, "settings.back")} />
      <section className="settings-page-frame" aria-labelledby="settings-title">
        <header className="settings-page-header">
          <div>
            <span className="settings-kicker">STRUSNIK / {t(lang, "settings.title")}</span>
            <h1 id="settings-title">{t(lang, "settings.title")}</h1>
            <p>{t(lang, "settings.intro")}</p>
          </div>
        </header>

        <div className="settings-sections">
          <section className="settings-section" aria-labelledby="settings-general-title">
            <div className="settings-section-heading">
              <Languages size={20} aria-hidden="true" />
              <div>
                <h2 id="settings-general-title">{t(lang, "settings.general")}</h2>
                <p>{t(lang, "settings.language_description")}</p>
              </div>
            </div>
            <div className="settings-language-switch" role="group" aria-label={t(lang, "settings.language")}>
              <button type="button" className={lang === "pl" ? "is-selected" : ""} aria-pressed={lang === "pl"} onClick={() => setLang("pl")}>
                {t(lang, "settings.polish")}
              </button>
              <button type="button" className={lang === "en" ? "is-selected" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                {t(lang, "settings.english")}
              </button>
            </div>
          </section>

          <section className="settings-section" aria-labelledby="settings-profile-title">
            <div className="settings-section-heading">
              <UserRound size={20} aria-hidden="true" />
              <div>
                <h2 id="settings-profile-title">{t(lang, "settings.profile")}</h2>
                <p>{isGuest ? t(lang, "settings.guest_name_description") : t(lang, "settings.member_name_description")}</p>
              </div>
            </div>
            {isGuest ? (
              <form className="settings-form" onSubmit={saveGuestName}>
                <label className="settings-field">
                  <span>{t(lang, "settings.guest_name")}</span>
                  <input
                    type="text"
                    value={guestDraft}
                    minLength={3}
                    maxLength={20}
                    onChange={(event) => {
                      setGuestDraft(event.target.value);
                      setGuestError("");
                      setGuestSaved(false);
                    }}
                    autoComplete="nickname"
                    placeholder={t(lang, "settings.guest_name_placeholder")}
                    aria-invalid={Boolean(guestError)}
                    aria-describedby={guestError ? "settings-guest-name-error" : undefined}
                    disabled={isSavingGuest}
                  />
                </label>
                {guestError && <p id="settings-guest-name-error" className="settings-form-message settings-form-message--error" role="alert">{guestError}</p>}
                {guestSaved && <p className="settings-form-message settings-form-message--success" role="status"><Check size={15} aria-hidden="true" />{t(lang, "settings.guest_name_saved")}</p>}
                <button type="submit" className="settings-button settings-button--primary" disabled={isSavingGuest}>
                  {t(lang, "settings.save_guest_name")}
                </button>
              </form>
            ) : (
              <div className="settings-readonly-value">
                <strong>{userInfo?.nickname}</strong>
                <span>{t(lang, "settings.member_name")}</span>
              </div>
            )}
          </section>

          <section className="settings-section" aria-labelledby="settings-accessibility-title">
            <div className="settings-section-heading">
              <Accessibility size={20} aria-hidden="true" />
              <div>
                <h2 id="settings-accessibility-title">{t(lang, "settings.accessibility")}</h2>
                <p>{t(lang, "settings.reduced_motion_description")}</p>
              </div>
            </div>
            <label className="settings-switch-row">
              <span>
                <strong>{t(lang, "settings.reduced_motion")}</strong>
                <small>{reducedMotion ? t(lang, "settings.enabled") : t(lang, "settings.disabled")}</small>
              </span>
              <input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} />
              <span className="settings-switch" aria-hidden="true" />
            </label>
            <label className="settings-switch-row">
              <span>
                <strong>{t(lang, "settings.game_sound")}</strong>
                <small>{t(lang, "settings.game_sound_description")}</small>
              </span>
              <input
                type="checkbox"
                checked={gameSoundEnabled}
                onChange={(event) => {
                  setGameSoundEnabled(event.target.checked);
                  updateGamePreference("haxball-sound-enabled", event.target.checked);
                }}
              />
              <span className="settings-switch" aria-hidden="true" />
            </label>
            <label className="settings-switch-row">
              <span>
                <strong>{t(lang, "settings.game_effects")}</strong>
                <small>{t(lang, "settings.game_effects_description")}</small>
              </span>
              <input
                type="checkbox"
                checked={gameEffectsEnabled}
                onChange={(event) => {
                  setGameEffectsEnabled(event.target.checked);
                  updateGamePreference("haxball-effects-enabled", event.target.checked);
                }}
              />
              <span className="settings-switch" aria-hidden="true" />
            </label>
          </section>

          <section className="settings-section" aria-labelledby="settings-security-title">
            <div className="settings-section-heading">
              <KeyRound size={20} aria-hidden="true" />
              <div>
                <h2 id="settings-security-title">{t(lang, "settings.security")}</h2>
                <p>{isGuest ? t(lang, "settings.account_required") : t(lang, "settings.password_description")}</p>
              </div>
            </div>
            {isGuest ? (
              <Link href="/auth" className="settings-button settings-button--primary">
                <LogIn size={16} aria-hidden="true" />
                {t(lang, "settings.login")}
              </Link>
            ) : (
              <form className="settings-form" onSubmit={handlePasswordChange}>
                <label className="settings-field">
                  <span>{t(lang, "settings.current_password")}</span>
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" disabled={isChangingPassword} />
                </label>
                <label className="settings-field">
                  <span>{t(lang, "settings.new_password")}</span>
                  <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" disabled={isChangingPassword} />
                </label>
                <label className="settings-field">
                  <span>{t(lang, "settings.confirm_password")}</span>
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" disabled={isChangingPassword} />
                </label>
                {passwordError && <p className="settings-form-message settings-form-message--error" role="alert">{passwordError}</p>}
                {passwordSuccess && <p className="settings-form-message settings-form-message--success" role="status"><Check size={15} aria-hidden="true" />{t(lang, "settings.password_changed")}</p>}
                <button type="submit" className="settings-button settings-button--primary" disabled={isChangingPassword}>
                  {isChangingPassword ? t(lang, "settings.loading") : t(lang, "settings.change_password")}
                </button>
              </form>
            )}
          </section>

          {!isGuest && (
            <section className="settings-section settings-section--danger" aria-labelledby="settings-danger-title">
              <div className="settings-section-heading">
                <ShieldAlert size={20} aria-hidden="true" />
                <div>
                  <h2 id="settings-danger-title">{t(lang, "settings.danger_zone")}</h2>
                  <p>{t(lang, "settings.delete_account_description")}</p>
                </div>
              </div>
              {activeGame && <p className="settings-inline-warning" role="status">{t(lang, "settings.active_game")}</p>}
              <p className="settings-danger-copy">{t(lang, "settings.delete_account_warning")}</p>
              <button ref={deleteTriggerRef} type="button" className="settings-button settings-button--danger" onClick={openDeleteDialog} disabled={Boolean(activeGame)}>
                <Trash2 size={16} aria-hidden="true" />
                {t(lang, "settings.delete_account")}
              </button>
            </section>
          )}
        </div>
      </section>
      {deleteDialog}
    </main>
  );
}

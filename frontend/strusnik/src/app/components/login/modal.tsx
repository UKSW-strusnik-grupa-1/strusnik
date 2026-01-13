'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import { useNotification } from "@/app/context/NotificationsContext";

import { useFetchWithNotify } from "@/app/hooks/useFetchWithNotify";

export default function LoginModal() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { lang } = useLang();
  const { notify } = useNotification();

  const fetchWithNotify = useFetchWithNotify();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    const data = await fetchWithNotify("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    if (!data) {
      setIsLoading(false);
      return;
    }

    notify(t(lang, "logging_in.success") || "Zalogowano pomyślnie", "success");

    window.location.href = "/";
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      const msg = t(lang, "logging_in.passwords_dont_match");
      setError(msg);
      notify(msg, "warning");
      setIsLoading(false);
      return;
    }

    const data = await fetchWithNotify("/api/auth/register", {
      body: JSON.stringify({ username, password }),
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!data) {
      setIsLoading(false);
      return;
    }

    const successMsg = t(lang, "logging_in.register_success");
    setSuccess(successMsg);
    notify(successMsg, "success");
    setIsRegisterMode(false);
    setIsLoading(false);
  };

  const handleGuestLogin = () => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const guestName = `Gość${Math.floor(Math.random() * 9999)}`;

    localStorage.setItem('guestUser', JSON.stringify({ id: guestId, name: guestName }));

    notify("Zalogowano jako gość", "info");
    window.location.href = "/";
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError("");
    setSuccess("");
  };

  return (
    <div className="fixed inset-0 z-100 grid place-items-center px-3 sm:px-4 before:content-[''] before:absolute before:inset-0 before:bg-[rgba(5,8,16,0.55)] before:backdrop-blur-xs">
      <div className="relative w-full max-w-[640px] flex flex-col items-center text-[#e9ecf3]">
        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="w-full flex flex-col items-center">
          <div
            className="w-full h-auto min-h-[380px] sm:min-h-[430px] bg-cover bg-no-repeat bg-center flex flex-col items-center pb-4"
            style={{ backgroundImage: "url('/main/login_details.png')" }}>

            <h1 className="text-xl sm:text-2xl font-bold mt-8 sm:mt-12 mb-6 sm:mb-8 px-4 text-center">
              {isRegisterMode ? t(lang, "logging_in.register_title") : t(lang, "logging_in.greeting")}
            </h1>

            <div className="w-[85%] sm:w-[78%] flex flex-col gap-4 sm:gap-5">
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm tracking-wide">{t(lang, "logging_in.name")}</span>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  minLength={3}
                  className="
                    h-11 sm:h-12
                    bg-black/35
                    border border-white/15
                    text-white
                    rounded-lg
                    px-3 sm:px-4
                    outline-none
                    text-[14px] sm:text-[15px]
                    focus:border-white/30
                    focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]
                  "
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm tracking-wide">{t(lang, "logging_in.password")}</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  required
                  minLength={4}
                  className="
                    h-11 sm:h-12
                    bg-black/35
                    border border-white/15
                    text-white
                    rounded-lg
                    px-3 sm:px-4
                    outline-none
                    text-[14px] sm:text-[15px]
                    focus:border-white/30
                    focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]
                  "
                />
              </div>

              {isRegisterMode && (
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm tracking-wide">{t(lang, "logging_in.confirm_password")}</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    minLength={4}
                    className="
                      h-11 sm:h-12
                      bg-black/35
                      border border-white/15
                      text-white
                      rounded-lg
                      px-3 sm:px-4
                      outline-none
                      text-[14px] sm:text-[15px]
                      focus:border-white/30
                      focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]
                    "
                  />
                </div>
              )}

              {error.length > 0 && (
                <p className="text-red-500 -mt-2 text-xs sm:text-sm text-center">{error}</p>
              )}
              {success.length > 0 && (
                <p className="text-green-500 -mt-2 text-xs sm:text-sm text-center">{success}</p>
              )}
            </div>
          </div>

          <div className="mt-3 sm:mt-4 w-full flex flex-col gap-2 sm:gap-3 px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
              <button
                type="submit"
                disabled={isLoading}
                className="
                  flex-1 h-14 sm:h-16
                  bg-no-repeat bg-cover bg-center
                  flex items-center justify-center
                  font-extrabold tracking-wide
                  text-white text-sm sm:text-base
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                  hover:brightness-110 transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                  touch-target
                "
                style={{ backgroundImage: "url('/main/button.png')" }}>
                {isLoading ? "..." : (isRegisterMode ? t(lang, "logging_in.register") : t(lang, "logging_in.login"))}
              </button>

              <button
                type="button"
                onClick={toggleMode}
                disabled={isLoading}
                className="
                  flex-1 h-14 sm:h-16
                  bg-no-repeat bg-cover bg-center
                  flex items-center justify-center
                  font-extrabold tracking-wide
                  text-white text-sm sm:text-base
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                  hover:brightness-110 transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                  touch-target
                "
                style={{ backgroundImage: "url('/main/button.png')" }}>
                {isRegisterMode ? t(lang, "logging_in.back_to_login") : t(lang, "logging_in.register")}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
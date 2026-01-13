'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

import { useFetchWithNotify } from "@/app/hooks/useFetchWithNotify";

export default function LoginModal() {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { lang } = useLang();
  
  const fetchWithNotify = useFetchWithNotify();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    try {
      const response = await fetchWithNotify("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Unknown error.";
        try {
            const data = await response.json();
            errorMessage = data.error || errorMessage;
        } catch (e) {}
        
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      window.location.href = "/";

    } catch (err) {
      console.error(err);
      setError(t(lang, "logging_in.connection_error") || "Connection error.");
      setIsLoading(false);
    }
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
      setError(t(lang, "logging_in.passwords_dont_match"));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetchWithNotify("/api/auth/register", {
        body: JSON.stringify({ username, password }),
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
         let errorMessage = "Registration error.";
         try {
             const data = await response.json();
             errorMessage = data.error || errorMessage;
         } catch (e) {}

        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      setSuccess(t(lang, "logging_in.register_success"));
      setIsRegisterMode(false);
      setIsLoading(false);

    } catch (err) {
      console.error("Register error:", err);
      setError(t(lang, "logging_in.connection_error") || "Connection error.");
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const guestName = `Gość${Math.floor(Math.random() * 9999)}`;

    localStorage.setItem('guestUser', JSON.stringify({ id: guestId, name: guestName }));

    window.location.href = "/";
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError("");
    setSuccess("");
  };

  return (
    <div className="fixed inset-0 z-100 grid place-items-center before:content-[''] before:absolute before:inset-0 before:bg-[rgba(5,8,16,0.55)] before:backdrop-blur-xs">
      <div className="relative w-[min(640px,95vw)] flex flex-col items-center text-[#e9ecf3]">
        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="w-full flex flex-col items-center">
          <div
            className="w-full h-[430px] bg-cover bg-no-repeat bg-center flex flex-col items-center"
            style={{ backgroundImage: "url('/main/login_details.png')" }}>

            <h1 className="text-2xl font-bold mt-12 mb-8">
              {isRegisterMode ? t(lang, "logging_in.register_title") : t(lang, "logging_in.greeting")}
            </h1>

            <div className="w-[78%] flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-sm tracking-wide">{t(lang, "logging_in.name")}</span>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  minLength={3}
                  className="
                    h-12
                    bg-black/35
                    border border-white/15
                    text-white
                    rounded-lg
                    px-4
                    outline-none
                    text-[15px]
                    focus:border-white/30
                    focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]
                  "
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm tracking-wide">{t(lang, "logging_in.password")}</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  required
                  minLength={4}
                  className="
                    h-12
                    bg-black/35
                    border border-white/15
                    text-white
                    rounded-lg
                    px-4
                    outline-none
                    text-[15px]
                    focus:border-white/30
                    focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]
                  "
                />
              </div>

              {isRegisterMode && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm tracking-wide">{t(lang, "logging_in.confirm_password")}</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    minLength={4}
                    className="
                      h-12
                      bg-black/35
                      border border-white/15
                      text-white
                      rounded-lg
                      px-4
                      outline-none
                      text-[15px]
                      focus:border-white/30
                      focus:shadow-[0_0_0_4px_rgba(255,255,255,0.08)]
                    "
                  />
                </div>
              )}

              {error.length > 0 && (
                <p className="text-red-500 -mt-2 text-sm text-center">{error}</p>
              )}
              {success.length > 0 && (
                <p className="text-green-500 -mt-2 text-sm text-center">{success}</p>
              )}
            </div>
          </div>

          <div className="mt-4 w-full flex flex-col gap-3">
            <div className="flex gap-3 w-full">
              <button
                type="submit"
                disabled={isLoading}
                className="
                  flex-1 h-16
                  bg-no-repeat bg-cover bg-center
                  flex items-center justify-center
                  font-extrabold tracking-wide
                  text-white
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                  hover:brightness-110 transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                style={{ backgroundImage: "url('/main/button.png')" }}>
                {isLoading ? "..." : (isRegisterMode ? t(lang, "logging_in.register") : t(lang, "logging_in.login"))}
              </button>

              <button
                type="button"
                onClick={toggleMode}
                disabled={isLoading}
                className="
                  flex-1 h-16
                  bg-no-repeat bg-cover bg-center
                  flex items-center justify-center
                  font-extrabold tracking-wide
                  text-white
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                  hover:brightness-110 transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                style={{ backgroundImage: "url('/main/button.png')" }}>
                {isRegisterMode ? t(lang, "logging_in.back_to_login") : t(lang, "logging_in.register")}
              </button>
            </div>

            {!isRegisterMode && (
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isLoading}
                className="
                  w-full h-16
                  bg-no-repeat bg-cover bg-center
                  flex items-center justify-center
                  font-extrabold tracking-wide
                  text-white
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                  hover:brightness-110 transition
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                style={{ backgroundImage: "url('/main/button.png')" }}>
                {t(lang, "logging_in.guest")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
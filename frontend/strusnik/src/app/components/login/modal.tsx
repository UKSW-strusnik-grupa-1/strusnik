'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

import { useFetchWithNotify } from "@/app/hooks/useFetchWithNotify";

export default function LoginModal() {
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const { lang } = useLang();
  
  const fetchWithNotify = useFetchWithNotify();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");

    const data = await fetchWithNotify("/api/auth/login", {
      body: JSON.stringify({ username, password }),
      method: "POST",
      credentials: "include",
    });

    if (!data) {
      return;
    }

    window.location.href = "/";
  };

  const handleRegister = () => {
    console.log("Redirect to register");
  };

  return (
    <div className="fixed inset-0 z-100 grid place-items-center before:content-[''] before:absolute before:inset-0 before:bg-[rgba(5,8,16,0.55)] before:backdrop-blur-xs">
      <div className="relative w-[min(640px,95vw)] flex flex-col items-center text-[#e9ecf3]">
        <form onSubmit={handleLogin} className="w-full flex flex-col items-center">
          <div
            className="w-full h-[430px] bg-cover bg-no-repeat bg-center flex flex-col items-center"
            style={{ backgroundImage: "url('/main/login_details.png')" }}>

            <h1 className="text-2xl font-bold mt-12 mb-8">{t(lang, "logging_in.greeting")}</h1>
            
            <div className="w-[78%] flex flex-col gap-7">
              <div className="flex flex-col gap-2">
                <span className="text-sm tracking-wide">{t(lang, "logging_in.name")}</span>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  className="
                    h-14
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
                  autoComplete="current-password"
                  className="
                    h-14
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

              {error.length > 0 && (
                <p className="text-red-500 -mt-2">{error}</p>
              )}
            </div>
          </div>

          <div className="mt-4 w-full flex flex-col gap-3">
            <div className="flex gap-3 w-full">
              <button
                type="submit"
                className="
                  flex-1 h-16
                  bg-no-repeat bg-cover bg-center
                  flex items-center justify-center
                  font-extrabold tracking-wide
                  text-white
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                  hover:brightness-110 transition
                "
                style={{ backgroundImage: "url('/main/button.png')" }}>{t(lang, "logging_in.login")}</button>

              <button
                type="button"
                onClick={handleRegister}
                className="
                  flex-1 h-16
                  bg-no-repeat bg-cover bg-center
                  flex items-center justify-center
                  font-extrabold tracking-wide
                  text-white
                  drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                  hover:brightness-110 transition
                "
                style={{ backgroundImage: "url('/main/button.png')" }}>{t(lang, "logging_in.register")}</button>
            </div>

            <button
              type="button"
              className="
                w-full h-16
                bg-no-repeat bg-cover bg-center
                flex items-center justify-center
                font-extrabold tracking-wide
                text-white
                drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]
                hover:brightness-110 transition
              "
              style={{ backgroundImage: "url('/main/button.png')" }}>{t(lang, "logging_in.guest")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

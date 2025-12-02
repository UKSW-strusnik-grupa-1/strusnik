'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginModal() {
  const [error, setError] = useState<string>("")
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    
    const username = formData.get('username');
    const password = formData.get('password');

    const response = await fetch("/api/auth/login", {
      body: JSON.stringify({username, password}),
      method: "POST",
      credentials: "include"
    })

    const data = await response.json()

    if (response.status !== 200) {
      setError(data.error || "Unknown error.")
      return;
    }

    // router.replace("/main")
    window.location.href = "/"
  };

  const handleRegister = () => {
    console.log('Redirect to register');
  };

  return (
    <div className="fixed inset-0 z-100 grid place-items-center before:content-[''] before:absolute before:inset-0 before:bg-[rgba(5,8,16,0.55)] before:backdrop-blur-xs">
      <div className="relative w-[min(520px,92vw)] bg-[rgba(14,18,32,0.92)] border border-white/10 rounded-2xl p-6 text-[#e9ecf3] shadow-[0_12px_48px_rgba(0,0,0,0.65),0_0_36px_rgba(255,138,61,0.15)]">
        <h1 className="m-0 mb-1.5 text-2xl font-bold">
          Zaloguj sie
        </h1>

        
        <form onSubmit={handleLogin}>
          <div className="flex flex-col gap-1.5 my-3">
            <span className="text-sm text-[#a6b0c4]">Login</span>
            <input 
              type="text" 
              name="username" 
              autoComplete="username" 
              placeholder="np. strusnik"
              className="bg-[#0f1330] border border-white/10 text-[#e9ecf3] rounded-[10px] px-3.5 py-3 outline-none transition-all duration-200 placeholder:text-[#a6b0c4] focus:border-[#ff8a3d] focus:shadow-[0_0_0_4px_rgba(255,138,61,0.25)]"
            />
          </div>
          
          <div className="flex flex-col gap-1.5 my-3">
            <span className="text-sm text-[#a6b0c4]">Haslo</span>
            <input 
              type="password" 
              name="password" 
              autoComplete="current-password" 
              placeholder="••••••••"
              className="bg-[#0f1330] border border-white/10 text-[#e9ecf3] rounded-[10px] px-3.5 py-3 outline-none transition-all duration-200 placeholder:text-[#a6b0c4] focus:border-[#ff8a3d] focus:shadow-[0_0_0_4px_rgba(255,138,61,0.25)]"
            />
          </div>

          {error.length > 0 && <p className="text-red-500">{error}</p>}
          
          <div className="flex gap-2.5 mt-4">
            <button 
              type="submit" 
              className="border-0 rounded-[10px] px-4 py-3 font-extrabold cursor-pointer bg-linear-to-b from-[#ff8a3d] to-[#ff6a00] text-[#180b05] shadow-[0_10px_20px_rgba(255,138,61,0.25),0_0_0_1px_rgba(255,255,255,0.08)_inset] hover:brightness-105 hover:shadow-[0_12px_26px_rgba(255,138,61,0.35),0_0_0_1px_rgba(255,255,255,0.12)_inset] transition-all"
            >
              Zaloguj
            </button>
            <button 
              type="button"
              onClick={handleRegister}
              className="rounded-[10px] px-4 py-3 font-extrabold cursor-pointer bg-transparent border border-white/[0.14] text-[#e9ecf3] hover:bg-white/6 transition-all"
            >
              Utworz konto
            </button>
          </div>

          <div className="flex flex-row justify-center items-center mt-3 mb-0">
            <button className="hover transition-opacity duration-100 hover:opacity-50 cursor-pointer">
              Kontynuuj jako gosc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"use client";

import React, { useState } from "react";
import SearchInput from "@/app/components/lobby/searchInput"; // Upewnij się, że ścieżka jest poprawna

interface PasswordModalProps {
  isOpen: boolean;
  gameName: string;
  errorMessage: string;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function PasswordModal({
  isOpen,
  gameName,
  errorMessage,
  onSubmit,
  onClose,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="
        relative 
        w-full max-w-sm 
        bg-[#2b1d15] 
        border-2 border-[#403832] 
        rounded-xl 
        shadow-[0_0_20px_rgba(0,0,0,0.8),inset_1px_1px_2px_rgba(255,255,255,0.05)]
        p-6 
        text-center 
        overflow-hidden
        mx-4
      ">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#826c5e] to-transparent opacity-50" />

        <h3 className="text-xl font-bold text-[#eaddcf] mb-1 drop-shadow-md uppercase tracking-wide">
          POKOJ PRYWATNY
        </h3>
        <p className="text-[#8b735b] text-xs mb-6 font-medium">
          WYMAGANE UWIERZYTELNIENIE
        </p>

        <div className="mb-4">
          <label className="block text-left text-xs text-[#8b735b] font-bold uppercase ml-1 mb-1 tracking-wider">
            HASLO DO POKOJU
          </label>
          <SearchInput
            text={password}
            setText={setPassword}
            placeholder="Wpisz haslo..."
            className="mb-0"
          />
        </div>

        {errorMessage && (
          <div className="bg-[#3f1d1d]/50 border border-red-500/30 rounded p-2 mb-4">
            <p className="text-red-300 text-xs font-bold text-center">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={onClose}
            className="
              flex-1
              cursor-pointer 
              py-3 px-4 
              rounded-lg 
              bg-[#3f1d1d] 
              text-red-200/80
              font-bold 
              border-2 border-[#5c2b2b]
              shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]
              transition-all duration-200
              hover:bg-[#5c2b2b] 
              hover:text-red-100
              hover:border-red-500/30
              hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.7),0_0_10px_rgba(220,38,38,0.2)]
              active:scale-95
              uppercase text-xs tracking-wider
            "
          >
            ANULUJ
          </button>

          <button
            onClick={() => onSubmit(password)}
            className="
              flex-1
              cursor-pointer 
              py-3 px-4 
              rounded-lg 
              bg-[#1d3f23] 
              text-green-200/80
              font-bold 
              border-2 border-[#2b5c33]
              shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]
              transition-all duration-200
              hover:bg-[#2b5c33] 
              hover:text-green-100
              hover:border-green-500/30
              hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.7),0_0_10px_rgba(34,197,94,0.2)]
              active:scale-95
              uppercase text-xs tracking-wider
            "
          >
            DOLACZ
          </button>
        </div>
      </div>
    </div>
  );
}
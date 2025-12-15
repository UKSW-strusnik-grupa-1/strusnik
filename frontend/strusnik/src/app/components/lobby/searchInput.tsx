import React from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  text?: string;
  setText?: React.Dispatch<React.SetStateAction<string>>;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ 
  text, 
  setText,
  placeholder = "Szukaj przeciwnika...", 
  className = "" 
}: SearchInputProps) {

  return (
    <div className={`relative w-full max-w-md mx-auto mb-6 ${className}`}>
      <input
        type="text"
        onChange={(e) => setText?.(e.target.value)}
        value={text}
        placeholder={placeholder}
        className="
          w-full
          bg-[#2b1d15] 
          text-[#eaddcf] 
          placeholder-[#6F5C50]
          border-2 
          border-[#403832] 
          rounded-lg
          py-3 
          pl-12 
          pr-4
          outline-none
          transition-all
          duration-300
          shadow-[inset_2px_2px_5px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]
          hover:border-[#826c5e]
          focus:border-[#826c5e]
          focus:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),0_0_10px_rgba(130,108,94,0.3)]
        "
      />

      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <Search className="h-5 w-5 text-[#6F5C50]" />
      </div>
    </div>
  );
}
import React from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  text?: string;
  setText?: React.Dispatch<React.SetStateAction<string>>;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  text = "",
  setText,
  placeholder = "Szukaj pokoju...",
  className = "",
}: SearchInputProps) {
  const inputId = "lobby-room-search";

  return (
    <div className={`room-search ${className}`}>
      <label className="sr-only" htmlFor={inputId}>{placeholder}</label>
      <Search className="room-search__icon" size={19} strokeWidth={2} aria-hidden="true" />
      <input
        id={inputId}
        type="search"
        value={text}
        onChange={(event) => setText?.(event.target.value)}
        placeholder={placeholder}
        className="room-search__input"
      />
    </div>
  );
}

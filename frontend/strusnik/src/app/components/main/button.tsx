"use client";

import Link from "next/link";
import React from "react";

interface ButtonProps {
  alt: string;
  text: string;
  href?: string;
  onClick?: () => void;
}

export default function Button({ alt, text, href, onClick }: ButtonProps) {
  const content = (
    <div className="relative menu-btn group cursor-pointer select-none">
      <img
        alt={alt}
        src="/main/button.png"
        className="transition-all group-hover:brightness-110"
        draggable={false}
      />

      <div className="menu-button-label absolute inset-0 flex items-center justify-center text-center whitespace-pre-line transition-all pointer-events-none">
        {text}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="flex flex-col items-center">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center bg-transparent border-0 p-0">
      {content}
    </button>
  );
}

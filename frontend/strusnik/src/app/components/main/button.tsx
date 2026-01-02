"use client";

import Link from "next/link";
import React, { useState } from "react";

interface ButtonProps {
  alt: string;
  text: string;
  title?: string;
  active?: boolean;
  inactiveText?: string;
  href?: string;
}

export default function Button({
  alt,
  text,
  title,
  active = true,
  inactiveText,
  href,
}: ButtonProps) {
  const [inactiveShown, setInactiveShown] = useState<boolean>(false);

  const handleInactiveClick = () => {
    if (!active && !inactiveShown) {
      setInactiveShown(true);
      setTimeout(() => {
        setInactiveShown(false);
      }, 5 * 1000);
    }
  };

  const baseLabelClasses =
    "menu-button-label absolute inset-0 flex flex-col items-center justify-center text-center whitespace-pre-line transition-all";

  return (
    <div className="flex flex-col items-center group">
      <div className="relative menu-btn">
        <img
          alt={alt}
          src="/main/button.png"
          className="transition-all group-hover:brightness-110"
        />

        {active ? (
          <Link
            href={href ?? ""}
            className={`${baseLabelClasses} cursor-pointer group-hover:scale-105`}
          >
            <span>{text}</span>
            {title && (
              <span className="text-sm font-normal opacity-90">{title}</span>
            )}
          </Link>
        ) : (
          <div
            onClick={handleInactiveClick}
            className={`${baseLabelClasses} cursor-not-allowed brightness-50`}
          >
            <span>{text}</span>
            {title && (
              <span className="text-sm font-normal opacity-90">{title}</span>
            )}
          </div>
        )}
      </div>

      {!active && inactiveText && inactiveShown && (
        <p className="mt-2 text-sm text-red-700 text-center font-bold">
          {inactiveText}
        </p>
      )}
    </div>
  );
}

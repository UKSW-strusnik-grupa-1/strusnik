"use client";

import Link from "next/link";
import React from "react";
import { ArrowUpRight } from "lucide-react";

interface ButtonProps {
  alt?: string;
  text: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  index?: number;
}

export default function Button({ text, description, href, onClick, icon, index = 0 }: ButtonProps) {
  const content = (
    <span className="menu-action__surface">
      <span className="menu-action__topline">
        <span className="menu-action__icon" aria-hidden="true">
          {icon}
        </span>
        <ArrowUpRight className="menu-action__arrow" size={20} aria-hidden="true" />
      </span>
      <span className="menu-action__bottomline">
        <span className="menu-action__text">
          <span className="menu-action__label">{text}</span>
          {description && <span className="menu-action__description">{description}</span>}
        </span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="menu-action"
        style={{ "--action-delay": `${180 + index * 90}ms` } as React.CSSProperties}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="menu-action border-0 bg-transparent p-0 text-left"
      style={{ "--action-delay": `${180 + index * 90}ms` } as React.CSSProperties}
    >
      {content}
    </button>
  );
}

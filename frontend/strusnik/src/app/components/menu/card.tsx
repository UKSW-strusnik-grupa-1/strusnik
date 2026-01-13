"use client";

import { Games } from "@/app/constants/games";
import Link from "next/link";
import React from "react";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

interface CardProps {
  gameName: string;
  imgSrc: string;
  compact?: boolean;
}

function gameKey(name: string) {
  return name.trim().toLowerCase();
}

export default function Card({ gameName, imgSrc, compact = false }: CardProps) {
  const { lang } = useLang();

  const getGameLink = () => {
    if (Games["singleplayer"].includes(gameName)) return `/singleplayer/${gameName}`;
    return `/lobby/${gameName}`;
  };

  const title = t(lang, `games.${gameKey(gameName)}`);

  const imgClass = compact
    ? "w-[calc(50vw-16px)] min-w-[120px] max-w-[250px] sm:w-[170px] md:w-[205px] lg:w-[240px] h-auto object-cover rounded-lg"
    : "w-[calc(50vw-16px)] min-w-[140px] max-w-[300px] sm:w-[200px] md:w-[250px] lg:w-[300px] h-auto object-cover rounded-lg";

  return (
    <Link href={getGameLink()}>
      <div className="flex flex-col gap-1 cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98]">
        <div className="relative">
          <img alt={gameName} src={imgSrc} className={imgClass} />

          <div
            className="pointer-events-none absolute left-1/2 w-[92%] text-center"
            style={{ bottom: "18%", transform: "translate(-50%, 50%)" }}
          >
            <p
              className="text-white font-bold uppercase tracking-wide"
              style={{
                fontSize: "clamp(14px, 2.2vw, 26px)",
                textShadow: "0 3px 3px rgba(0,0,0,0.95)",
              }}
            >
              {title}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

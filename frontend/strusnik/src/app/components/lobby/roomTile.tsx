"use client"

import Link from 'next/link';
import React from 'react'
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

function normalizeGameName(name: string): string {
  const normalized: Record<string, string> = {
    'chess': 'Chess',
    'stratego': 'Stratego',
    'tysiac': 'Tysiac',
    'battleships': 'Battleships',
    'set': 'Set',
  };
  return normalized[name.toLowerCase()] || name;
}

interface RoomTileProps {
  uuid: string;
  gameName: string;
  roomName: string;
  isPrivate?: boolean;
  players: number;
  maxPlayers: number;
}

export default function RoomTile({ gameName, roomName, isPrivate = false, players, maxPlayers, uuid }: RoomTileProps) {

  const { lang } = useLang()
  const normalizedGameName = normalizeGameName(gameName);

  return (
    <div className="relative w-full max-w-[600px] h-[60px] sm:h-[70px] md:h-[75px] select-none group/tile">
      <img
        alt="Room background"
        src="/lobby/tile_room.png"
        className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md"
      />

      <div className="relative z-10 w-full h-full grid grid-cols-[1fr_auto_auto] items-center px-3 sm:px-4 md:px-6 gap-2 sm:gap-3 md:gap-4">

        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="shrink-0 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <p className="text-white font-bold text-sm sm:text-base md:text-lg truncate shadow-black drop-shadow-md">
            {roomName}
          </p>
        </div>

        <div className="flex items-center justify-center min-w-14 sm:min-w-16 md:min-w-20 gap-1 sm:gap-2">
          {isPrivate && (
            <div className="flex items-center justify-center">
              <img
                src="/lobby/lock.png"
                alt="Prywatny"
                className="w-6 sm:w-8 md:w-10 mx-0.5 sm:mx-1 h-auto drop-shadow-sm opacity-90"
              />
            </div>
          )}

          <p className="text-gray-200 font-bold text-xs sm:text-sm md:text-base drop-shadow-md whitespace-nowrap hidden sm:block">
            {t(lang, "rooms.players")} <span className="text-white">{players + "/" + maxPlayers}</span>
          </p>
          <p className="text-gray-200 font-bold text-xs drop-shadow-md whitespace-nowrap sm:hidden">
            <span className="text-white">{players + "/" + maxPlayers}</span>
          </p>
        </div>

        <div className="flex items-center justify-end">
          <Link href={`/games/${normalizedGameName}/${uuid}`}>
            <div className="relative group cursor-pointer w-[70px] sm:w-[85px] md:w-[100px]">
              <img
                alt="PRZYCISK DOLACZ"
                src="/lobby/join.png"
                className="w-full h-auto transition-transform duration-200 group-hover:scale-105 group-hover:brightness-110"
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white text-xs sm:text-sm font-bold uppercase tracking-wide drop-shadow-md">
                  {t(lang, "rooms.join")}
                </p>
              </div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
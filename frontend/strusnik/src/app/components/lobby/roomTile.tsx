"use client"

import Link from 'next/link';
import React from 'react'

interface RoomTileProps {
  uuid: string;
  gameName: string;
  roomName: string;
  isPrivate?: boolean;
  players: number;
  maxPlayers: number;
}

export default function RoomTile({ gameName, roomName, isPrivate = false, players, maxPlayers, uuid }: RoomTileProps) {
  return (
    <div className="relative w-[600px] h-[75px] select-none group/tile">
      <img
        alt="Tło pokoju"
        src="/lobby/tile_room.png"
        className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-md"
      />

      <div className="relative z-10 w-full h-full grid grid-cols-[1fr_auto_auto] items-center px-6 gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <p className="text-white font-bold text-lg truncate shadow-black drop-shadow-md">
            {roomName}
          </p>
        </div>

        <div className="flex items-center justify-center min-w-20">
          <p className="text-gray-200 font-bold text-base drop-shadow-md">
            Gracze: <span className="text-white">{players + "/" + maxPlayers}</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          {isPrivate && (
            <div className="flex items-center justify-center w-8">
              <img
                src="/lobby/lock.png"
                alt="Prywatny"
                className="w-6 h-auto drop-shadow-sm opacity-90"
              />
            </div>
          )}

          <Link href={`/games/${gameName}/${uuid}`}>
            <div className="relative group cursor-pointer w-[100px]">
              <img
                alt="Przycisk dołącz"
                src="/lobby/join.png"
                className="w-full h-auto transition-transform duration-200 group-hover:scale-105 group-hover:brightness-110"
              />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white text-sm font-bold uppercase tracking-wide drop-shadow-md">
                  Dolacz
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
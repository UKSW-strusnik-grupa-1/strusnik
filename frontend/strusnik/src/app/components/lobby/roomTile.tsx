"use client"

import { Lock } from 'lucide-react';
import React from 'react'

interface RoomTileProps {
  roomName: string;
  isPrivate?: boolean;
}

export default function RoomTile({ roomName, isPrivate = false }: RoomTileProps) {
  return (
    <div className="relative">
      <img
        alt="Tło"
        src="/lobby/tile_room.png"
        className="w-[600px] h-[65px] rounded-lg"
      />
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div className='flex flex-row items-center gap-2'>
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-black"/>
          <p className="text-white font-bold">{roomName}</p>
        </div>

        <p className="text-white font-bold">Gracze: 1/2</p>

        <div className="relative w-[15%] ml-10">
          {isPrivate && (
            <img
            src="/lobby/lock.png"
            alt="Pokój prywatny"
            className="absolute top-1/2 -translate-y-1/2 right-full mr-2 w-8"
          />
          )}


          <div className="group cursor-pointer">
            <img
              alt="Przycisk dołącz do lobby"
              src="/lobby/join.png"
              className="w-full h-auto transition-all group-hover:brightness-110 relative z-10"
            />

            <div className="absolute inset-0 flex items-center justify-center z-20">
              <p className="text-white text-sm font-bold transition-all group-hover:scale-105">
                Dolacz
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client"

import { Games } from '@/app/constants/games';
import Link from 'next/link';
import React from 'react'

interface CardProps {
  gameName: string;
  imgSrc: string;
}

export default function Card({gameName, imgSrc} : CardProps) {
  const getGameLink = () => {
    if (Games["singleplayer"].includes(gameName)) {
      return `/singleplayer/${gameName}`;
    }
    return `/lobby/${gameName}`;
  }

return (
    <Link href={getGameLink()}>
      <div className="flex flex-col gap-1 cursor-pointer transition-all hover:scale-[1.03]">

        <img
          alt={gameName}
          src={imgSrc}
          className="w-[300px] h-auto object-cover"
        />

      </div>
    </Link>
  );

}

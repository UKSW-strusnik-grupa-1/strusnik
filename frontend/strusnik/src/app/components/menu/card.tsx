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
    <div className='flex flex-col gap-1'>

      <img
        alt={gameName}
        src={imgSrc}
        className='w-[200px] h-[265.11px]'
      />

      <Link href={getGameLink() || ""}>
        <div className='relative group'>
          <img
            alt="Przycisk zagraj"
            src="/main/button.png"
            className='w-[200px] h-auto transition-all group-hover:brightness-110'
          />

          <p className="absolute inset-0 flex items-center justify-center text-white font-bold cursor-pointer transition-all group-hover:scale-105">
            Zagraj
          </p>
        </div>
      </Link>

    </div>
  )
}

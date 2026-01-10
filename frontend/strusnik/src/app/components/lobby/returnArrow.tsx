import Link from 'next/link'
import React from 'react'

interface returnArrowProps {
  href: string;
  text?: string;
}

export default function ReturnArrow({ href = "", text = "MENU" } : returnArrowProps) {
  return (
    <Link href={href} className="absolute top+5 left-2 z-30">
      <div className="relative flex flex-row items-center group cursor-pointer">
        <img alt="strzalka powrotu" src="/main/arrow.png" className="w-50 h-auto transition-transform group-hover:scale-105"/>
        <p className="absolute top-1/2 -translate-y-1/2 left-22 text-white font-bold text-sm tracking-wide transition-all group-hover:scale-105 "> {text} </p>
      </div>
    </Link>
  )}

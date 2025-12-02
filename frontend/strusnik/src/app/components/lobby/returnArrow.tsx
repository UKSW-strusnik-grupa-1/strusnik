import Link from 'next/link'
import React from 'react'

interface returnArrowProps {
    href: string;
    text?: string;
}

export default function ReturnArrow({ href = "", text = "Powrót do menu" } : returnArrowProps) {
  return (
    <Link href={href} className="absolute top-4 left-4 z-20">
        <div className="flex flex-row items-center gap-2 group cursor-pointer">
            <img
                alt="Strzałka do powrotu"
                src="/main/arrow.png"
                className="w-12 h-auto scale-x-[-1] transition-transform group-hover:scale-x-[-1.2] group-hover:scale-y-[1.2]"
            />
            <p className="text-white font-bold text-lg transition-all group-hover:brightness-75 group-hover:scale-y-105">
              {text}
            </p>
        </div>
    </Link>
  )
}

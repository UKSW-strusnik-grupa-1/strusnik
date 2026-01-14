import Link from 'next/link'
import React from 'react'
import { useRouter } from 'next/navigation'

interface returnArrowProps {
  href: string;
  text?: string;
  onClick?: () => void;
}

export default function ReturnArrow({ href = "", text = "MENU", onClick }: returnArrowProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
      setTimeout(() => {
        router.push(href);
      }, 150);
    }
  };

  return (
    <Link href={href} className="fixed sm:absolute top-2 sm:top-5 left-1 sm:left-2 touch-target z-9999" onClick={handleClick}>
      <div className="relative flex flex-row items-center group cursor-pointer">
        <img alt="strzalka powrotu" src="/main/arrow.png" className="w-32 sm:w-40 md:w-50 h-auto transition-transform group-hover:scale-105" />
        <p className="absolute top-1/2 -translate-y-1/2 left-14 sm:left-18 md:left-22 text-white font-bold text-xs sm:text-sm tracking-wide transition-all group-hover:scale-105"> {text} </p>
      </div>
    </Link>
  )
}

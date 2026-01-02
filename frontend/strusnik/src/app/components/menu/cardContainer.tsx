import React from 'react'
import Card from './card'

interface CardContainerProps {
    children: React.ReactNode
}

export default function CardContainer({children} : CardContainerProps) {
  return (
        <div className="relative w-full min-h-screen flex items-center justify-center">
            <div className="z-10 flex flex-wrap justify-center gap-3 max-w-5xl">
                {children}
            </div>
        </div>
    )
}

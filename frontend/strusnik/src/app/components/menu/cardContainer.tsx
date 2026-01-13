import React from 'react'
import Card from './card'

interface CardContainerProps {
    children: React.ReactNode
}

export default function CardContainer({ children }: CardContainerProps) {
    return (
        <div className="relative w-full min-h-screen flex items-center justify-center px-3 py-16 sm:px-4 sm:py-20">
            <div className="z-10 flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 max-w-5xl w-full">
                {children}
            </div>
        </div>
    )
}

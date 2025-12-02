import React, { useState, useEffect } from 'react'

interface GameCardProps {
    cardName: string;
    className?: string;
}

export default function GameCard({
    cardName,
    className = "w-24",
}: GameCardProps) {
    const shouldBeRevealed = cardName !== "cardBack";
    const [isAnimatingRevealed, setIsAnimatingRevealed] = useState(false);

    useEffect(() => {
        if (shouldBeRevealed) {
            const timer = setTimeout(() => {
                setIsAnimatingRevealed(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setIsAnimatingRevealed(false);
        }
    }, [shouldBeRevealed]);

    return (
        <div
            className={`relative aspect-2/3 ${className} perspective-[1000px]`}
        >
            <div
                className={`
                    w-full h-full relative transition-all duration-700 
                    transform-3d 
                    ${isAnimatingRevealed ? 'transform-[rotateY(180deg)]' : ''}
                `}
            >
                <div className="absolute inset-0 w-full h-full backface-hidden transform-[rotateY(180deg)]">
                    {shouldBeRevealed && (
                        <img
                            src={`/blackjack/cards/${cardName}.png`}
                            alt={cardName}
                            className="w-full h-full object-contain drop-shadow-xl rounded-lg"
                        />
                    )}
                </div>

                <div className="absolute inset-0 w-full h-full backface-hidden">
                    <img
                        src="/blackjack/cards/cardBack.png"
                        alt="Card Back"
                        className="w-full h-full object-contain drop-shadow-xl rounded-lg"
                    />
                </div>
            </div>
        </div>
    )
}
import { get } from 'http';
import React from 'react'

interface TokenProps {
    amount: number;
    withText: boolean;
    onPress?: () => void;
}

const TokenImages: Record<number, string> = {
    5: '/blackjack/chips/chipStack0.png',
    20: '/blackjack/chips/chipStack1.png',
    100: '/blackjack/chips/chipStack2.png',
    500: '/blackjack/chips/chipStack3.png',
}

export default function Token({amount, withText = false, onPress} : TokenProps) {
    const getTokenImageFromAmount = (amount: number) => {
        return TokenImages[amount] ?? TokenImages[5];
    }

    return (
        <div className="relative flex items-center justify-center cursor-pointer group">
            <img
                alt="chips"
                src={getTokenImageFromAmount(amount)}
                className="object-cover z-10 transition-all group-hover:scale-105"
                onClick={onPress}
            />
            {withText && (
                <p className="absolute z-10 font-bold text-white pb-1 text-[13px] transition-all group-hover:scale-105">
                    {amount}
                </p>
            )}
        </div>
    );
}

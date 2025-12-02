"use client"

import CardList from '@/app/components/blackjack/cardList'
import GameCard from '@/app/components/blackjack/gameCard'
import Token from '@/app/components/blackjack/token'
import ReturnArrow from '@/app/components/lobby/returnArrow'
import { useBlackjack } from '@/app/hooks/useBlackjack'
import React, { useState } from 'react'

export default function BlackjackPage() {
    const { 
        tokens, 
        addToken, 
        removeToken,
        balance,
        startGame,
        gameStatus,
        playerDeck,
        dealerDeck,
        hit,
        stand,
        playerDeckValue,
        dealerDeckValue
    } = useBlackjack();

    return (
        <div className='relative w-full h-screen flex flex-col overflow-hidden'>
            <ReturnArrow href="/singleplayer" text='Wyjdz z gry'/>
            
            <img 
                alt="background" 
                src="/blackjack/blackjack_bg.png" 
                className="absolute w-full h-full object-fill -z-10"
            />

            {gameStatus === "STARTED" && 
                <div className="absolute top-0 left-0 w-full h-full z-10 pt-24 pointer-events-none">
                    <div className="pointer-events-auto h-full w-full">
                        <CardList 
                            playerDeck={playerDeck} 
                            dealerDeck={dealerDeck} 
                            playerDeckValue={playerDeckValue}
                            dealerDeckValue={dealerDeckValue}
                            hit={hit}
                            stand={stand}
                        />
                    </div>
                </div>
            }
            
            {gameStatus !== "STARTED" && (
                <div className='w-full h-full flex items-center justify-end flex-col gap-3 pb-8 z-20 pointer-events-none'>
                    <div className='pointer-events-auto flex flex-col min-h-[50px] justify-end'> 
                        {[...tokens].reverse().map((token, index) => {
                            const reversedIndex = tokens.length - index - 1
                            return (
                                <div 
                                    key={index} 
                                    className={`-mt-8`} 
                                    style={{zIndex: tokens.length - index}} 
                                    onClick={() => removeToken(reversedIndex)}
                                >
                                    <Token amount={token} withText/>
                                </div>
                            )
                        })}
                    </div>
                    
                    <h1 className='font-bold text-2xl text-white drop-shadow-md'>
                        Saldo: {balance}$
                    </h1>
                    
                    <div className='pointer-events-auto flex items-center justify-center gap-2'>
                        <button onClick={() => addToken(5)} className="hover:scale-110 transition-transform"><Token amount={5} withText/></button>
                        <button onClick={() => addToken(20)} className="hover:scale-110 transition-transform"><Token amount={20} withText/></button>
                        <button onClick={() => addToken(100)} className="hover:scale-110 transition-transform"><Token amount={100} withText/></button>
                        <button onClick={() => addToken(500)} className="hover:scale-110 transition-transform"><Token amount={500} withText/></button>
                    </div>

                    <div className='pointer-events-auto relative flex items-center justify-center group cursor-pointer mt-2' onClick={startGame}>
                        <img
                            src="/main/button.png"
                            className='w-[200px] transition-all group-hover:scale-105 group-hover:brightness-110'
                        />
                        <p className='absolute font-bold transition-all group-hover:scale-105'>Rozpocznij</p>
                    </div>
                </div>
            )}

        </div>
    )
}
"use client"

import CardList from '@/app/components/blackjack/cardList'
import Token from '@/app/components/blackjack/token'
import ReturnArrow from '@/app/components/lobby/returnArrow'
import { useBlackjack } from '@/app/hooks/useBlackjack'
import React from 'react'

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
        playAgain,
        playerDeckValue,
        dealerDeckValue,
        winner,
        cashout
    } = useBlackjack();

    return (
        <div className='relative w-full h-screen flex flex-col overflow-hidden'>
            <ReturnArrow href="/singleplayer" text='Wyjdz z gry'/>
            
            <img 
                alt="background" 
                src="/blackjack/blackjack_bg.png" 
                className="absolute w-full h-full object-cover -z-10"
            />

            {gameStatus !== "NOT-STARTED" && 
                <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none flex items-center justify-center">
                    <div className="pointer-events-auto h-full w-full max-w-7xl mx-auto">
                        <CardList 
                            playerDeck={playerDeck} 
                            dealerDeck={dealerDeck} 
                            playerDeckValue={playerDeckValue}
                            dealerDeckValue={dealerDeckValue}
                            gameStatus={gameStatus}
                            hit={hit}
                            stand={stand}
                            winner={winner}
                            cashout={cashout}
                            playAgain={playAgain}
                        />
                    </div>
                </div>
            }
            
            {gameStatus === "NOT-STARTED" && (
                <div className='w-full h-full flex items-center justify-end flex-col gap-6 pb-12 z-20 pointer-events-none'>
                    <div className='pointer-events-auto flex flex-col min-h-[60px] justify-end items-center'> 
                        {[...tokens].reverse().map((token, index) => {
                            const reversedIndex = tokens.length - index - 1
                            return (
                                <div 
                                    key={index} 
                                    className={`-mt-8 cursor-pointer`} 
                                    style={{zIndex: tokens.length - index}} 
                                    onClick={() => removeToken(reversedIndex)}
                                >
                                    <Token amount={token} withText/>
                                </div>
                            )
                        })}
                    </div>
                    
                    <h1 className='font-bold text-3xl text-white drop-shadow-lg tracking-wider'>
                        Saldo: {balance}$
                    </h1>
                    
                    <div className='pointer-events-auto flex items-center justify-center gap-4 bg-black/30 p-4 rounded-2xl backdrop-blur-sm'>
                        <button onClick={() => addToken(5)} className="hover:scale-110 active:scale-95 transition-transform"><Token amount={5} withText/></button>
                        <button onClick={() => addToken(20)} className="hover:scale-110 active:scale-95 transition-transform"><Token amount={20} withText/></button>
                        <button onClick={() => addToken(100)} className="hover:scale-110 active:scale-95 transition-transform"><Token amount={100} withText/></button>
                        <button onClick={() => addToken(500)} className="hover:scale-110 active:scale-95 transition-transform"><Token amount={500} withText/></button>
                    </div>

                    <div className='pointer-events-auto relative flex items-center justify-center group cursor-pointer mt-4' onClick={startGame}>
                        <img
                            src="/main/button.png"
                            className='w-60 transition-all group-hover:scale-105 group-hover:brightness-110 drop-shadow-xl'
                        />
                        <p className='absolute font-bold text-xl text-white transition-all group-hover:scale-105'>Rozpocznij</p>
                    </div>
                </div>
            )}
        </div>
    )
}
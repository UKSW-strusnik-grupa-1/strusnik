"use client"

import React, { useState, useEffect } from 'react';
import ReturnArrow from '../components/lobby/returnArrow';
import { Games } from '../constants/games';

interface RankingEntry {
    username: string;
    score: number;
    wins?: number;
    gamesPlayed?: number;
}

export default function RankingsPage() {
    const allGames = [...Games.multiplayer];
    
    const [activeGame, setActiveGame] = useState<string>(allGames[0]);
    const [rankingData, setRankingData] = useState<RankingEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchRanking = async () => {
            if (!activeGame) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/rankings/${activeGame}`);
                
                if (res.ok) {
                    const data = await res.json();
                    setRankingData(data);
                } else {
                    console.error("BLAD POBIERANIA DANYCH");
                    setRankingData([]);
                }
            } catch (error) {
                console.error("BLAD SIECI:", error);
                setRankingData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRanking();
    }, [activeGame]);

    return (
        <div className='relative w-full h-screen flex flex-col items-center justify-center text-white overflow-hidden'>
            
        <div className="absolute w-full h-screen flex flex-col overflow-visible">
            <ReturnArrow href="/singleplayer" text="WYJDZ" />
        </div>

            <div className="z-10 w-[95%] md:w-full md:max-w-4xl lg:max-w-5xl p-2 md:p-6 flex flex-col gap-3 md:gap-6 h-[85vh] md:h-[80vh]">
                
                <h1 className="text-2xl md:text-4xl font-bold text-center drop-shadow-lg tracking-wider text-gray-300 mt-12 md:mt-0">
                    RANKINGI
                </h1>

                <div className="flex flex-wrap justify-center gap-2 md:gap-4 bg-black/40 p-2 md:p-4 rounded-xl backdrop-blur-sm border border-[#6F5C50]">
                    {allGames.map((game) => (
                        <button
                            key={game}
                            onClick={() => setActiveGame(game)}
                            className={`cursor-pointer px-3 py-1 md:px-6 md:py-2 text-sm md:text-base rounded-lg font-bold transition-all duration-300 border-b
                                ${activeGame === game 
                                    ? 'bg-[#36271e] border-[#6F5C50] text-white scale-105 shadow-[0_0_15px_rgba(111,92,80,0.5)]' 
                                    : 'bg-black/50 border-transparent text-gray-400 hover:text-white hover:bg-black/70'
                                }`}
                        >
                            {game}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-hidden bg-black/60 rounded-xl backdrop-blur-md border border-[#403832] flex flex-col shadow-2xl">
                    <div className="grid grid-cols-4 p-2 md:p-4 font-bold text-gray-300 border-b border-[#6F5C50] text-xs md:text-lg uppercase bg-black/20">
                        <div className="text-center">Pozycja</div>
                        <div className="text-left pl-2 md:pl-4">Gracz</div>
                        <div className="text-center">Wygrane</div>
                        <div className="text-center">Punkty</div>
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1 p-1 md:p-2">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-lg md:text-xl">Ladowanie...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1 md:gap-2">
                                {rankingData.map((entry, index) => (
                                    <div 
                                        key={entry.username}
                                        className={`grid grid-cols-4 p-2 md:p-3 items-center rounded-lg transition-colors hover:bg-white/5 text-xs md:text-base
                                            ${index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : ''}
                                            ${index === 1 ? 'bg-gray-400/20 border border-gray-400/30' : ''}
                                            ${index === 2 ? 'bg-amber-700/20 border border-amber-700/30' : ''}
                                        `}
                                    >
                                        <div className="text-center font-bold text-base md:text-xl flex justify-center items-center">
                                            {index === 0 && '🥇'}
                                            {index === 1 && '🥈'}
                                            {index === 2 && '🥉'}
                                            {index > 2 && `${index + 1}.`}
                                        </div>
                                        <div className="text-left pl-2 md:pl-4 font-medium truncate">
                                            {entry.username}
                                        </div>
                                        <div className="text-center text-gray-300">
                                            {entry.wins}
                                        </div>
                                        <div className="text-center font-bold text-gray-300">
                                            {entry.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
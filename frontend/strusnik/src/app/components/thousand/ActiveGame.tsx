'use client';

import React, { useState, useRef, useEffect } from 'react';

// --- TYPY DANYCH ---

interface Player {
    id: string;
    name: string;
    score: number;
}

interface FlyingCard {
    id: string;
    src: string;
    style: React.CSSProperties;
}

interface ActiveGameProps {
    socket: any;
    roomId: string;
    seats: (Player | null)[];
    myId: string;
    initialHand: string[];
}

export default function ActiveGame({ socket, roomId, seats, myId, initialHand }: ActiveGameProps) {
    
    const [myHand, setMyHand] = useState<string[]>(initialHand);
    const [playedCard, setPlayedCard] = useState<string | null>(null);
    const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);

    const centerRef = useRef<HTMLDivElement>(null);
    const topHandRef = useRef<HTMLDivElement>(null);
    const leftHandRef = useRef<HTMLDivElement>(null);
    const rightHandRef = useRef<HTMLDivElement>(null);

    const getMySeatIndex = () => {
        const idx = seats.findIndex(s => s?.id === myId);
        return idx === -1 ? 0 : idx;
    };

    const getPlayerAtScreenPos = (offset: number) => {
        const myIdx = getMySeatIndex();
        const targetIdx = (myIdx + offset) % 4;
        return { data: seats[targetIdx], seatIndex: targetIdx };
    };

    const animateCardMove = (startRect: DOMRect, cardCode: string, startRotation: number = 0) => {
        if (!centerRef.current) return;
        
        const endRect = centerRef.current.getBoundingClientRect();

        const initialStyle: React.CSSProperties = {
            position: 'fixed',
            top: startRect.top,
            left: startRect.left,
            width: startRect.width,
            height: startRect.height,
            zIndex: 50,
            transition: 'all 0.5s ease-in-out', 
            pointerEvents: 'none',
            transform: `rotate(${startRotation}deg)`, 
            transformOrigin: 'center center',
        };

        setFlyingCard({
            id: cardCode,
            src: `/blackjack/cards/${cardCode}.png`,
            style: initialStyle
        });

        setTimeout(() => {
            setFlyingCard((prev) => {
                if (!prev) return null;
                
                const targetWidth = endRect.height * (2/3); 
                const centeredLeft = endRect.left + (endRect.width - targetWidth) / 2;
                
                return {
                    ...prev,
                    style: {
                        ...prev.style,
                        top: endRect.top + 10,
                        left: centeredLeft,
                        width: targetWidth,
                        height: endRect.height - 20,
                        transform: 'rotate(0deg)',
                    }
                };
            });
        }, 20);

        setTimeout(() => {
            setPlayedCard(cardCode);
            setFlyingCard(null);
        }, 500);
    };

    const handleMyPlay = (e: React.MouseEvent, cardCode: string) => {
            if (flyingCard) return;
            
            const startRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMyHand((prev) => prev.filter((c) => c !== cardCode));
            animateCardMove(startRect, cardCode, 0);

            if (socket) {
                socket.emit('player_move', {
                    roomId: roomId,
                    move: {
                        type: 'play_card',
                        card: cardCode
                    }
                });
            }
        };

    const handleOpponentPlay = (playerPos: 'top' | 'left' | 'right', cardCode: string) => {
        if (flyingCard) return;

        let sourceRef = topHandRef;
        let startRotation = 180;

        if (playerPos === 'left') {
            sourceRef = leftHandRef;
            startRotation = -90;
        }
        if (playerPos === 'right') {
            sourceRef = rightHandRef;
            startRotation = 90;
        }

        if (sourceRef.current) {
            const containerRect = sourceRef.current.getBoundingClientRect();
            
            const cardW = containerRect.width < containerRect.height ? containerRect.width / 5 : containerRect.height / 5;
            const cardH = cardW * 1.5;

            let startTop = containerRect.bottom - cardH; 
            let startLeft = containerRect.left + (containerRect.width / 2) - (cardW / 2);

            if (playerPos === 'left') {
                startLeft = containerRect.right - cardW; 
                startTop = containerRect.top + (containerRect.height / 2) - (cardH / 2);
            } 
            else if (playerPos === 'right') {
                startLeft = containerRect.left; 
                startTop = containerRect.top + (containerRect.height / 2) - (cardH / 2);
            }

            const fakeStartRect = {
                top: startTop,
                left: startLeft,
                width: cardW,
                height: cardH,
            } as DOMRect;

            animateCardMove(fakeStartRect, cardCode, startRotation);
        }
    };

    const PlayerInfo = ({ offset }: { offset: number }) => {
        const { data } = getPlayerAtScreenPos(offset);
        const isMe = offset === 0;

        if (!data) return (
            <div className="bg-black/30 border border-dashed border-gray-600 rounded px-2 py-1 text-center min-w-[20vh]">
                <p className="text-gray-500 text-xs">Puste</p>
            </div>
        );

        return (
            <div className={`
                bg-[#000000]/60 border border-[#353434] rounded px-2 py-0.5 text-center min-w-[25vh] mb-1 shadow-md
                ${isMe ? 'border-amber-500/50 bg-amber-900/20' : ''}
            `}>
                <p className={`font-bold whitespace-nowrap ${isMe ? 'text-amber-400' : 'text-amber-50'}`} style={{ fontSize: 'clamp(10px, 1.5vh, 16px)' }}>
                    {isMe ? 'TY' : data.name}
                </p>
                <p className="text-gray-300 leading-tight" style={{ fontSize: 'clamp(8px, 1.2vh, 12px)' }}>
                    {data.score} pkt
                </p>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full h-full relative">
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                <button onClick={() => handleOpponentPlay('top', 'KD')} className="bg-blue-600/50 hover:bg-blue-600 text-white px-2 py-1 text-xs rounded transition">TEST GÓRA</button>
                <button onClick={() => handleOpponentPlay('left', 'AD')} className="bg-green-600/50 hover:bg-green-600 text-white px-2 py-1 text-xs rounded transition">TEST LEWO</button>
                <button onClick={() => handleOpponentPlay('right', '10D')} className="bg-red-600/50 hover:bg-red-600 text-white px-2 py-1 text-xs rounded transition">TEST PRAWO</button>
            </div>

            {flyingCard && (
                <img 
                    src={flyingCard.src}
                    style={flyingCard.style}
                    className="rounded-[5%] drop-shadow-2xl"
                    alt="Flying card"
                />
            )}

            <div className="flex flex-row w-full flex-1 min-h-0 gap-1 items-center justify-center pb-1">
                
                <div className="flex-1 flex items-center justify-center h-full min-w-0">
                    <div className="aspect-square h-full max-h-full w-auto max-w-full bg-[#2b1d15] border-2 border-[#6b5645] rounded-xl relative shadow-2xl overflow-hidden">
                        
                        <div className="absolute top-0 left-0 w-full h-[25%] flex flex-col items-center justify-start pt-2 z-10">
                             <PlayerInfo offset={2} />
                             <div ref={topHandRef} className="flex justify-center w-full"> 
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className="w-[10%] aspect-2/3 bg-[#4a3728] border border-[#6b5645] rounded-[8%] shadow-md -ml-[3%]"></div>
                                ))}
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 w-full h-[25%] flex flex-col-reverse items-center justify-start pb-2 z-10">
                             <div className="mt-1">
                                <PlayerInfo offset={0} />
                             </div>
                            
                            <div className="flex justify-center items-end w-full">
                                {myHand.map((card, i) => (
                                    <img
                                        key={card}
                                        src={`/blackjack/cards/${card}.png`} 
                                        alt={card}
                                        onClick={(e) => handleMyPlay(e, card)} 
                                        className="w-[10%] aspect-2/3 object-contain drop-shadow-xl cursor-pointer hover:-translate-y-[15%] transition-transform -ml-[3%] hover:z-10 relative rounded-[5%]"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="absolute left-0 top-0 h-full w-[25%] flex flex-col items-center justify-center z-0 pointer-events-none">
                            <div className="flex flex-col items-center justify-center w-[100vh] h-full -rotate-90 origin-center pointer-events-auto">
                                 <PlayerInfo offset={3} />
                                 <div ref={leftHandRef} className="flex justify-center w-full">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="w-[10vh] aspect-2/3 bg-[#4a3728] border border-[#6b5645] rounded-[8%] shadow-md -ml-[3vh]"></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="absolute right-0 top-0 h-full w-[25%] flex flex-col items-center justify-center z-0 pointer-events-none">
                            <div className="flex flex-col items-center justify-center w-[100vh] h-full rotate-90 origin-center pointer-events-auto">
                                 <PlayerInfo offset={1} />
                                 <div ref={rightHandRef} className="flex justify-center w-full">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="w-[10vh] aspect-2/3 bg-[#4a3728] border border-[#6b5645] rounded-[8%] shadow-md -ml-[3vh]"></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div ref={centerRef} className="absolute inset-0 m-auto w-[20%] aspect-2/3 flex items-center justify-center z-0">
                            {playedCard ? (
                                <img 
                                    src={`/blackjack/cards/${playedCard}.png`} 
                                    alt="Played Card"
                                    className="w-full h-full object-contain drop-shadow-2xl rounded-[5%]"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#3a281d] border-2 border-[#6b5645] rounded-[8%] flex items-center justify-center opacity-80 shadow-inner">
                                    <span className="text-[#6b5645] opacity-50 select-none" style={{ fontSize: 'clamp(30px, 6vw, 60px)' }}>🂠</span>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                <div className="w-[140px] md:w-[220px] lg:w-[300px] shrink-0 h-full bg-[#000000]/40 border border-[#353434] rounded-xl p-2 flex flex-col gap-2 backdrop-blur-sm overflow-hidden">
                    
                    <div className="flex flex-col gap-1 shrink-0">
                        <div className="bg-[#2b1d15]/60 rounded p-1.5 border border-[#4a3728]">
                            <p className="text-gray-300 text-[10px] lg:text-sm whitespace-nowrap">Licytacja: <span className="text-amber-400 font-bold">120</span></p>
                            <p className="text-gray-300 text-[10px] lg:text-sm">Atut: <span className="text-red-500 font-bold">♥ K</span></p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-2 overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar pr-1 pb-2 p-1">
                        {['Licytuj', 'Pasuj', 'Zamelduj', 'Pokaż'].map((action, index) => (
                            <div key={index} className="relative group flex justify-center items-center h-10 md:h-14 lg:h-16 w-full cursor-pointer shrink-0">
                                <img 
                                    src="/main/button.png" 
                                    className="object-fill w-full h-full -z-10 transition-all duration-300 group-hover:brightness-110 group-hover:scale-105 drop-shadow-lg rounded-lg"
                                />
                                <p className="absolute inset-0 flex items-center justify-center text-amber-50 font-bold text-[10px] md:text-sm lg:text-lg uppercase tracking-wider transition-all duration-300 group-hover:scale-105 overflow-hidden drop-shadow-md">
                                    {action}
                                </p>
                            </div>
                        ))}
                    </div>

                     <div className="mt-auto pt-1 border-t border-[#353434] shrink-0">
                        <div className="bg-[#000000]/60 rounded p-1 h-20 overflow-y-auto text-[9px] lg:text-xs text-gray-400 custom-scrollbar leading-tight">
                            <p><span className="text-blue-400">G1:</span> 100.</p>
                            <p><span className="text-amber-500">TY:</span> 120!</p>
                            <p><span className="text-blue-400">G1:</span> Pas.</p>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
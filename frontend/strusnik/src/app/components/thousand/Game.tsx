'use client';

import React, { useState, useRef, useEffect } from 'react';
import GameCard from '../blackjack/gameCard';
import { useRouter } from 'next/navigation';

interface Player {
    socketId: string;
    userId: string;
    name: string;
    score: number;
    round_points?: number;
    connected?: boolean;
    disconnect_timestamp?: number;
}

interface Winner {
    name: string;
    score: number;
    userId: string;
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

const BigDisconnectOverlay = ({ timestamp, name }: { timestamp: number, name: string }) => {
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now() / 1000;
            const validTimestamp = timestamp || now;
            const diff = 60 - (now - validTimestamp);
            setTimeLeft(diff > 0 ? Math.floor(diff) : 0);
        }, 1000);
        return () => clearInterval(interval);
    }, [timestamp]);

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 border-4 border-red-600/80 rounded-lg backdrop-blur-md shadow-[0_0_30px_rgba(220,38,38,0.5)] p-2">
            <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mb-1">Rozlaczony</p>
            <p className="text-white text-3xl font-mono font-bold leading-none mb-1">{timeLeft}s</p>
            <p className="text-gray-400 text-[10px] truncate max-w-full">{name}</p>
        </div>
    );
};

export default function Game({ socket, roomId, seats: initialSeats, myId, initialHand }: ActiveGameProps) {
    const router = useRouter(); 
    
    const [gameSeats, setGameSeats] = useState<(Player | null)[]>(initialSeats);
    const [myHand, setMyHand] = useState<string[]>(initialHand);
    const [flyingCard, setFlyingCard] = useState<FlyingCard | null>(null);
    const [playedCard, setPlayedCard] = useState<string | null>(null); 
    
    const [currentBid, setCurrentBid] = useState<number>(100);
    const [declarationAmount, setDeclarationAmount] = useState<number>(100);
    
    const [activeUserId, setActiveUserId] = useState<string | null>(null);
    const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null); 
    const [dealerIdx, setDealerIdx] = useState<number>(0);

    const [gameStage, setGameStage] = useState<string>("waiting_for_players"); 
    const [stockCards, setStockCards] = useState<string[]>([]);
    const [cardsToGive, setCardsToGive] = useState<number>(0);
    const [stockRecipients, setStockRecipients] = useState<number[]>([]); 
    const [trumpSuit, setTrumpSuit] = useState<string | null>(null);

    const [cardsOnTable, setCardsOnTable] = useState<any[]>([]);
    const [isInteractionLocked, setIsInteractionLocked] = useState<boolean>(false);
    const [winner, setWinner] = useState<Winner | null>(null);

    const [processingMove, setProcessingMove] = useState<boolean>(false);

    const lastProcessedCardRef = useRef<string | null>(null);
    const centerRef = useRef<HTMLDivElement>(null);
    
    const pendingCardRef = useRef<string | null>(null);
    const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const localDistributedToRef = useRef<number[]>([]);

    const gameSeatsRef = useRef(gameSeats);
    const myIdRef = useRef(myId);
    const gameStageRef = useRef(gameStage);
    const dealerIdxRef = useRef(dealerIdx);

    useEffect(() => { gameSeatsRef.current = gameSeats; }, [gameSeats]);
    useEffect(() => { myIdRef.current = myId; }, [myId]);
    useEffect(() => { gameStageRef.current = gameStage; }, [gameStage]);
    useEffect(() => { dealerIdxRef.current = dealerIdx; }, [dealerIdx]);

    useEffect(() => {
        setDeclarationAmount(currentBid);
    }, [currentBid]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (socket) {
                socket.emit('leave_room', { roomId });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [socket, roomId]);

    const getMySeatIndex = () => {
        const idx = gameSeats.findIndex(s => s && String(s.userId) === String(myId));
        return idx === -1 ? 0 : idx;
    };

    const mySeatIndex = getMySeatIndex();
    const activePlayersCount = gameSeats.filter(s => s !== null).length;
    const amIPausing = activePlayersCount === 4 && mySeatIndex === dealerIdx;

    const amIActive = () => {
        if (!activeUserId) return false;
        return String(activeUserId) === String(myId);
    };

    const getPlayerAtScreenPos = (offset: number) => {
        const myIdx = getMySeatIndex();
        const targetIdx = (myIdx + offset) % 4;
        return { data: gameSeats[targetIdx], seatIndex: targetIdx };
    };

    const isCardValid = (cardCode: string): boolean => {
        if (amIPausing) return false; 
        if (gameStage !== 'playing') return true; 
        if (cardsOnTable.length === 0) return true;

        const leadCard = cardsOnTable[0].card;
        const leadSuit = leadCard.slice(-1);
        const cardSuit = cardCode.slice(-1);
        
        const hasLeadSuit = myHand.some(c => c.slice(-1) === leadSuit);
        const hasTrump = trumpSuit ? myHand.some(c => c.slice(-1) === trumpSuit) : false;

        if (hasLeadSuit) return cardSuit === leadSuit;
        if (hasTrump && trumpSuit) return cardSuit === trumpSuit;
        return true;
    };

    const handleExit = () => {
        if (socket) {
            socket.emit('leave_room', { roomId });
        }
        router.push(`/lobby/Tysiac`);
    };

    useEffect(() => {
        if (!socket) return;
        
        socket.on('game_state_update', (state: any) => {
            setProcessingMove(false);
            if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
            pendingCardRef.current = null;

            if (state.seats !== undefined) setGameSeats(state.seats);
            if (state.active_user_id !== undefined) setActiveUserId(state.active_user_id);
            if (state.current_player !== undefined) setCurrentPlayerId(state.current_player);
            if (state.my_hand !== undefined) setMyHand(state.my_hand);
            if (state.current_bid !== undefined) setCurrentBid(state.current_bid);
            if (state.dealer_idx !== undefined) setDealerIdx(state.dealer_idx);
            
            if (state.winner) {
                setWinner(state.winner);
                setGameStage('game_over');
            }

            if (state.stage !== undefined) {
                const newStage = state.stage;
                const prevStage = gameStageRef.current;
                
                if (newStage !== 'distributing') {
                    localDistributedToRef.current = [];
                }

                if ((newStage === 'declaring' || newStage === 'distributing') && prevStage === 'stock_reveal') {
                    setIsInteractionLocked(true);
                    setTimeout(() => { setIsInteractionLocked(false); }, 1200);
                }
                setGameStage(newStage);
            }

            if (state.cards_to_give !== undefined) setCardsToGive(state.cards_to_give);
            if (state.stock_recipients !== undefined) setStockRecipients(state.stock_recipients); 
            if (state.trump_suit !== undefined) setTrumpSuit(state.trump_suit);
            
            if (state.stock && state.stock.length > 0) {
                setStockCards(state.stock);
            } else {
                const incomingStage = state.stage !== undefined ? state.stage : gameStageRef.current;
                const incomingDealerIdx = state.dealer_idx !== undefined ? state.dealer_idx : dealerIdxRef.current;
                const incomingSeats = state.seats !== undefined ? state.seats : gameSeatsRef.current;
                const myIdVal = myIdRef.current;
                const myIdx = incomingSeats.findIndex((s: Player | null) => s && String(s.userId) === String(myIdVal));
                const isFourPlayers = incomingSeats.filter((s: any) => s !== null).length === 4;
                const amIPausingNow = isFourPlayers && (myIdx === incomingDealerIdx);
                const isRevealPhase = incomingStage === 'stock_reveal';
                const isBiddingPhase = incomingStage === 'bidding';

                if (isRevealPhase) {
                } else if (amIPausingNow && isBiddingPhase) {
                } else {
                    setStockCards([]);
                }
            }

            if (state.cards_on_table !== undefined) {
                setCardsOnTable([...state.cards_on_table]);
            }
        });

        socket.on('error', (data: any) => {
            console.error("BLAD GRY:", data);
            
            if (pendingCardRef.current) {
                const cardToRestore = pendingCardRef.current;
                setMyHand(prev => {
                    if (!prev.includes(cardToRestore)) return [...prev, cardToRestore];
                    return prev;
                });
                pendingCardRef.current = null;
            }
            setProcessingMove(false);
            if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
            socket.emit('sync_state', { roomId });
        });

        socket.on('game_ended_timeout', () => {
             alert("Gra zakończona - gracz nie powrócił.");
             router.push(`/lobby/Tysiac`);
        });

        socket.emit('sync_state', { roomId }); 

        return () => {
            socket.off('game_state_update');
            socket.off('error');
            socket.off('game_ended_timeout');
        };
    }, [socket, roomId, router]);

    useEffect(() => {
        if (cardsOnTable.length === 0) {
            setPlayedCard(null);
            return;
        }
        const newCard = cardsOnTable[cardsOnTable.length - 1]; 
        const isNewCard = newCard.card !== lastProcessedCardRef.current;

        if (isNewCard) {
            lastProcessedCardRef.current = newCard.card;
            const currentSeats = gameSeatsRef.current;
            const currentMyId = myIdRef.current;

            const throwerSeat = currentSeats.find(s => {
                if (!s) return false;
                if (newCard.userId && String(s.userId) === String(newCard.userId)) return true;
                if (newCard.player_id && s.socketId === newCard.player_id) return true;
                return false;
            });

            if (throwerSeat && String(throwerSeat.userId) !== String(currentMyId)) {
                const throwerIndex = currentSeats.indexOf(throwerSeat);
                const myIndex = currentSeats.findIndex(s => s && String(s.userId) === String(currentMyId));
                const safeMyIndex = myIndex === -1 ? 0 : myIndex;
                const relPos = (throwerIndex - safeMyIndex + 4) % 4;
                
                if (relPos === 1) handleOpponentPlay('right', newCard.card);
                if (relPos === 2) handleOpponentPlay('top', newCard.card);
                if (relPos === 3) handleOpponentPlay('left', newCard.card);
            }
        }
    }, [cardsOnTable]);

    const animateCardMove = (startRect: DOMRect, cardCode: string, startRotation: number = 0) => {
        if (!centerRef.current) return;
        const endRect = centerRef.current.getBoundingClientRect();
        const DURATION = 600; const TARGET_CARD_HEIGHT = 120; const TARGET_CARD_WIDTH = TARGET_CARD_HEIGHT * (2/3);

        setFlyingCard({ 
            id: cardCode, src: `/blackjack/cards/${cardCode}.png`, 
            style: { position: 'fixed', top: startRect.top, left: startRect.left, width: startRect.width, height: startRect.height, zIndex: 9999, transition: `all ${DURATION}ms ease-in-out`, pointerEvents: 'none', transform: `rotate(${startRotation}deg)`, transformOrigin: 'center center' } 
        });

        setTimeout(() => {
            setFlyingCard((prev) => prev ? { ...prev, style: { ...prev.style, top: endRect.top + (endRect.height - TARGET_CARD_HEIGHT) / 2, left: endRect.left + (endRect.width - TARGET_CARD_WIDTH) / 2, width: TARGET_CARD_WIDTH, height: TARGET_CARD_HEIGHT, transform: 'rotate(0deg)' } } : null);
        }, 50);

        setTimeout(() => { setPlayedCard(cardCode); setFlyingCard(null); }, DURATION + 100);
    };

    const handleOpponentPlay = (playerPos: 'top' | 'left' | 'right', cardCode: string) => {
        const cardH = 120; const cardW = cardH * (2/3);
        let startTop = 0; let startLeft = 0; let startRotation = 0;
        if (playerPos === 'top') { startRotation = 180; startTop = -cardH; startLeft = (window.innerWidth / 2) - (cardW / 2); } 
        else if (playerPos === 'left') { startRotation = -90; startTop = (window.innerHeight / 2) - (cardH / 2); startLeft = -cardW; } 
        else if (playerPos === 'right') { startRotation = 90; startTop = (window.innerHeight / 2) - (cardH / 2); startLeft = window.innerWidth; }
        animateCardMove({ top: startTop, left: startLeft, width: cardW, height: cardH } as DOMRect, cardCode, startRotation);
    };

    const trickSize = activePlayersCount === 4 ? 3 : activePlayersCount;
    const isTrickFull = activePlayersCount > 0 && cardsOnTable.length >= trickSize;

    const handleBid = () => { if (socket && amIActive()) socket.emit('player_move', { roomId, move: { type: 'bid', amount: currentBid + 10 } }); };
    const handlePass = () => { if (socket && amIActive()) socket.emit('player_move', { roomId, move: { type: 'pass' } }); };
    
    const handleDeclareScore = () => {
        if (socket && amIActive()) {
            socket.emit('player_move', { roomId, move: { type: 'declare_score', amount: Number(declarationAmount) } });
        }
    };

    const handleCardClick = (e: React.MouseEvent, cardCode: string) => {
        if (processingMove || flyingCard || isInteractionLocked || isTrickFull || amIPausing) return; 

        if (gameStage === 'playing' && amIActive()) {
            if (!isCardValid(cardCode)) return;
            handleMyPlay(e, cardCode);
            return;
        }
        
        if (gameStage === 'distributing' && amIActive()) {
            const myIdx = getMySeatIndex();
            const opponentsIndices: number[] = [];
            let checkIdx = (myIdx + 1) % 4;
            
            for (let i = 0; i < 3; i++) {
                const isPausingDealer = activePlayersCount === 4 && checkIdx === dealerIdx;
                
                if (gameSeats[checkIdx] && !isPausingDealer) {
                    opponentsIndices.push(checkIdx);
                }
                checkIdx = (checkIdx + 1) % 4;
            }

            const alreadyReceived = new Set([...stockRecipients, ...localDistributedToRef.current]);
            let targetIdx = opponentsIndices.find(idx => !alreadyReceived.has(idx));
            
            if (targetIdx === undefined && opponentsIndices.length > 0) {
                 targetIdx = opponentsIndices[0];
            }

            if (targetIdx !== undefined) {
                setProcessingMove(true);
                
                localDistributedToRef.current.push(targetIdx);

                pendingCardRef.current = cardCode;
                lastProcessedCardRef.current = cardCode;

                setMyHand((prev) => prev.filter((c) => c !== cardCode));
                
                socket.emit('player_move', { 
                    roomId, 
                    move: { type: 'give_card', card: cardCode, target_idx: targetIdx } 
                });

                if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
                fallbackTimeoutRef.current = setTimeout(() => {
                    console.warn("Brak odpowiedzi serwera przy rozdawaniu. Przywracam stan.");
                    setMyHand(prev => {
                        if (!prev.includes(cardCode)) return [...prev, cardCode];
                        return prev;
                    });
                    setProcessingMove(false);
                    pendingCardRef.current = null;
                    if (socket) socket.emit('sync_state', { roomId });
                }, 3000);
            }
        }
    };

    const handleMyPlay = (e: React.MouseEvent, cardCode: string) => {
        const startRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        
        setProcessingMove(true);
        pendingCardRef.current = cardCode;
        lastProcessedCardRef.current = cardCode; 

        setMyHand((prev) => prev.filter((c) => c !== cardCode));
        animateCardMove(startRect, cardCode, 0);

        if (socket) socket.emit('player_move', { roomId, move: { type: 'play_card', card: cardCode } });

        if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = setTimeout(() => {
            console.warn("Brak odpowiedzi serwera na ruch. Wymuszam synchronizację.");
            setMyHand(prev => {
                if (!prev.includes(cardCode)) return [...prev, cardCode];
                return prev;
            });
            setProcessingMove(false);
            pendingCardRef.current = null;
            if (socket) socket.emit('sync_state', { roomId });
        }, 3000);
    };

    const PlayerInfo = ({ offset }: { offset: number }) => {
        const { data, seatIndex } = getPlayerAtScreenPos(offset);
        const isMe = data && String(data.userId) === String(myId);
        const isActive = data && activeUserId && String(data.userId) === String(activeUserId);
        const isPausingPlayer = activePlayersCount === 4 && seatIndex === dealerIdx;

        if (!data) return <div className="bg-black/30 border border-dashed border-gray-600 rounded px-2 py-1 text-center min-w-[20vh]"><p className="text-gray-500 text-xs">Puste</p></div>;

        const isConnected = data.connected !== false;

        if (!isConnected && data.disconnect_timestamp) {
            return (
                 <div className="relative w-[25vh] h-[10vh]">
                     <BigDisconnectOverlay timestamp={data.disconnect_timestamp} name={data.name} />
                 </div>
            );
        }

        return (
            <div className={`
                transition-all duration-300 bg-[#000000]/60 border rounded px-2 py-1 text-center min-w-[25vh] mb-1 shadow-md flex flex-col items-center justify-center gap-0.5 relative overflow-hidden
                ${isMe ? 'bg-amber-900/20' : ''}
                ${isActive ? 'ring-1 ring-green-500 scale-105 bg-green-900/30' : ''}
                ${isPausingPlayer ? 'opacity-70 grayscale' : ''}
                ${isActive && !isMe && 'mb-2'}
                ${isMe ? 'border-amber-500/50' : 'border-[#353434]'}
            `}>
                <p className={`font-bold whitespace-nowrap ${isMe ? 'text-amber-400' : 'text-amber-50'}`} style={{ fontSize: 'clamp(10px, 1.5vh, 16px)' }}>
                    {isMe ? 'TY' : data.name} {isActive && '⏳'} {isPausingPlayer}
                </p>
                <p className="text-gray-300 leading-tight" style={{ fontSize: 'clamp(8px, 1.2vh, 12px)' }}>
                    {data.score} pkt
                </p>
                <p className="text-amber-500/90 font-mono tracking-wider" style={{ fontSize: 'clamp(8px, 1.1vh, 11px)' }}>
                    ({data.round_points || 0} w rundzie)
                </p>
            </div>
        );
    };

    const isMyTurn = amIActive();
    const getSuitIcon = (suit: string) => {
        const icons: any = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
        const colors: any = { 'H': 'text-red-500', 'D': 'text-red-500', 'C': 'text-gray-500', 'S': 'text-gray-500' };
        return <span className={`text-2xl ${colors[suit] || 'text-white'}`}>{icons[suit]}</span>;
    };

    const isPlayerConnected = (offset: number) => {
        const { data } = getPlayerAtScreenPos(offset);
        return data ? (data.connected !== false) : true;
    };

    const amIConnected = () => {
         const { data } = getPlayerAtScreenPos(0);
         return data ? (data.connected !== false) : true;
    }

    return (
        <div className="flex flex-col w-full h-full relative">
            
            {winner && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-700">
                    <div className="flex flex-col items-center bg-[#2b1d15] border-2 border-amber-500 rounded-xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.5)]">
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-amber-300 to-yellow-600 mb-2 uppercase tracking-widest">
                            Koniec Gry!
                        </h1>
                        <div className="text-6xl mb-4">👑</div>
                        <p className="text-gray-300 text-lg mb-1">Zwyciezca:</p>
                        <p className="text-3xl font-bold text-amber-400 mb-2">{winner.name}</p>
                        <div className="bg-black/40 rounded px-6 py-2 mb-8 border border-amber-900/50">
                            <p className="text-amber-100/80 font-mono text-xl">Wynik: {winner.score}</p>
                        </div>
                        <button 
                            onClick={handleExit}
                            className="cursor-pointer bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105"
                        >
                            Wroc do Lobby
                        </button>
                    </div>
                </div>
            )}

            {flyingCard && <img src={flyingCard.src} style={flyingCard.style} className="rounded-[5%] drop-shadow-2xl border border-white/20" alt="Flying card" />}
            
            <div className="flex flex-row w-full flex-1 min-h-0 gap-1 items-center justify-center pb-1">
                <div className="flex-1 flex items-center justify-center h-full min-w-0">
                    <div className="aspect-square h-full max-h-full w-auto max-w-full bg-[#2b1d15] border-2 border-[#6b5645] rounded-xl relative shadow-2xl overflow-hidden">
                        
                        {trumpSuit && (
                            <div className="absolute top-2 right-2 z-20 bg-black/50 px-3 py-1 rounded-lg border border-amber-500/30 flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Atut</span>
                                {getSuitIcon(trumpSuit)}
                            </div>
                        )}

                        <div className="absolute top-0 left-0 w-full h-[25%] flex flex-col items-center justify-start pt-2 z-10">
                             <PlayerInfo offset={2} />
                             {isPlayerConnected(2) && (!activePlayersCount || activePlayersCount < 4 || (getMySeatIndex() + 2)%4 !== dealerIdx) && (
                                <div className="flex justify-center w-full"> {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="w-[10%] aspect-2/3 bg-[#4a3728] border border-[#6b5645] rounded-[8%] shadow-md -ml-[3%]" />)}</div>
                             )}
                        </div>

                        <div className="absolute bottom-0 left-0 w-full h-[25%] flex flex-col-reverse items-center justify-start pb-2 z-10">
                             <div className="mt-1"><PlayerInfo offset={0} /></div>
                            {amIConnected() && (
                                <div className="flex justify-center items-end w-full">
                                    {(myHand || []).map((card) => {
                                        const isValid = isCardValid(card);
                                        const isInteractive = !processingMove && !isInteractionLocked && !isTrickFull && isMyTurn && (gameStage === 'playing' || gameStage === 'distributing');
                                        let styles = "w-[10%] aspect-2/3 object-contain drop-shadow-xl -ml-[3%] relative rounded-[5%] transition-all duration-300 ";
                                        if (isInteractive) {
                                            styles += isValid ? "cursor-pointer -translate-y-[5%] hover:-translate-y-[25%] brightness-110" : "cursor-not-allowed brightness-50 opacity-80";
                                        } else {
                                            styles += "cursor-default opacity-90 brightness-75";
                                        }
                                        return <img key={card} src={`/blackjack/cards/${card}.png`} alt={card} onClick={(e) => handleCardClick(e, card)} className={styles}/>;
                                    })}
                                    {amIPausing && <p className="text-amber-500/50 text-xs font-bold mb-1">Rozdajacy</p>}
                                </div>
                            )}
                        </div>

                        <div className="absolute left-0 top-0 h-full w-[25%] flex flex-col items-center justify-center z-0 pointer-events-none">
                            <div className="flex flex-col items-center justify-center w-[100vh] h-full -rotate-90 origin-center pointer-events-auto">
                                 <PlayerInfo offset={3} />
                                 {isPlayerConnected(3) && (!activePlayersCount || activePlayersCount < 4 || (getMySeatIndex() + 3)%4 !== dealerIdx) && (
                                     <div className="flex justify-center w-full">{[1, 2, 3, 4, 5].map(i => <div key={i} className="w-[10vh] aspect-2/3 bg-[#4a3728] border border-[#6b5645] rounded-[8%] shadow-md -ml-[3vh]" />)}</div>
                                 )}
                            </div>
                        </div>

                        <div className="absolute right-0 top-0 h-full w-[25%] flex flex-col items-center justify-center z-0 pointer-events-none">
                            <div className="flex flex-col items-center justify-center w-[100vh] h-full rotate-90 origin-center pointer-events-auto">
                                 <PlayerInfo offset={1} />
                                 {isPlayerConnected(1) && (!activePlayersCount || activePlayersCount < 4 || (getMySeatIndex() + 1)%4 !== dealerIdx) && (
                                     <div className="flex justify-center w-full">{[1, 2, 3, 4, 5].map(i => <div key={i} className="w-[10vh] aspect-2/3 bg-[#4a3728] border border-[#6b5645] rounded-[8%] shadow-md -ml-[3vh]" />)}</div>
                                 )}
                            </div>
                        </div>

                        <div ref={centerRef} className="absolute inset-0 m-auto w-[40%] h-[40%] flex items-center justify-center z-0">
                            
                            {((gameStage === 'stock_reveal' || gameStage === 'bidding') && stockCards.length > 0) && (
                                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                    {gameStage === 'bidding' && <p className="text-green-400 text-[10px] font-bold uppercase mb-1 bg-black/50 px-2 rounded">Twoj podglad</p>}
                                    <div className="flex gap-2">
                                        {stockCards.map((card, i) => (
                                            <div key={i} onClick={(e) => {handleCardClick(e, card);} }>
                                                <GameCard cardName={card} key={i} className="w-[8vh] h-auto object-contain hover:scale-110 transition-transform" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {gameStage === 'bidding' && (!stockCards.length) && (
                                <div className="flex flex-col items-center gap-2 animate-in fade-in duration-500">
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map((i) => (
                                            <img key={i} src={`/blackjack/cards/cardBack.png`} className="w-[8vh] h-auto object-contain drop-shadow-xl rounded-[5%] border border-[#6b5645]" alt="Musik Zakryty" />
                                        ))}
                                    </div>
                                    <div className="bg-black/60 backdrop-blur-sm px-4 py-1 rounded-full border border-amber-500/50 shadow-lg mt-1">
                                        <span className="text-amber-100 text-xs uppercase mr-2 opacity-80">Stawka</span>
                                        <span className="text-amber-400 font-bold text-lg">{currentBid}</span>
                                    </div>
                                </div>
                            )}

                            {gameStage === 'playing' && cardsOnTable.length > 0 && (
                                <div className="relative w-full h-full">
                                    <img 
                                        src={`/blackjack/cards/${cardsOnTable[cardsOnTable.length - 1].card}.png`} 
                                        className="absolute w-[25%] h-auto object-contain drop-shadow-2xl rounded-[5%] transition-all duration-300" 
                                        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(0deg)', zIndex: 10 }} 
                                        alt="table" 
                                    />
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                <div className="w-[140px] md:w-[220px] lg:w-[300px] shrink-0 h-full bg-[#000000]/40 border border-[#353434] rounded-xl p-2 flex flex-col gap-2 backdrop-blur-sm overflow-hidden">
                    <div className="bg-[#2b1d15]/60 rounded p-1.5 border border-[#4a3728]">
                        <p className="text-gray-300 text-[10px] lg:text-sm">Status: <span className={isMyTurn ? "text-green-500 font-bold" : "text-gray-400"}>{amIPausing ? "Obserwujesz" : (isMyTurn ? "TWOJ RUCH!" : "Czekaj...")}</span></p>
                    </div>
                    <div className="flex flex-col gap-2 mt-2 flex-1">
                        {gameStage === 'bidding' && !amIPausing && (
                            <>
                                <button onClick={handleBid} disabled={!isMyTurn} className={`h-12 w-full rounded bg-amber-700 text-white font-bold transition-all hover:bg-amber-600 ${!isMyTurn && 'opacity-50 cursor-not-allowed'}`}>Licytuj (+10)</button>
                                <button onClick={handlePass} disabled={!isMyTurn} className={`h-12 w-full rounded bg-gray-700 text-white font-bold transition-all hover:bg-gray-600 ${!isMyTurn && 'opacity-50 cursor-not-allowed'}`}>Pasuj</button>
                            </>
                        )}
                        {gameStage === 'declaring' && (
                            <div className="flex flex-col gap-2 animate-in slide-in-from-right duration-300">
                                {isMyTurn ? (
                                    <>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-gray-400 text-[10px] uppercase font-bold">Twoja gra:</label>
                                            <input type="number" step="10" min={currentBid} value={declarationAmount} onChange={(e) => setDeclarationAmount(Number(e.target.value))} className="w-full bg-black/50 border border-amber-600/50 rounded px-2 py-2 text-amber-400 font-bold text-center focus:outline-none focus:border-amber-500"/>
                                        </div>
                                        <button onClick={handleDeclareScore} disabled={declarationAmount < currentBid} className="h-10 w-full rounded bg-green-700 hover:bg-green-600 text-white font-bold text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Zatwierdź</button>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-14 w-full rounded bg-amber-900/20 border border-amber-500/10"><span className="text-gray-400 text-xs text-center italic">Gracz ustala wynik...</span></div>
                                )}
                            </div>
                        )}
                        {gameStage === 'stock_reveal' && (
                            <div className="flex items-center justify-center h-14 w-full rounded bg-amber-900/50 border border-amber-500/30"><span className="text-amber-200 text-xs font-bold animate-pulse text-center">Pobieranie musika...</span></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from "@/app/hooks/useSocket";
import { useSearchParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import PasswordModal from '@/app/components/lobby/passwordModal';
import SetCard from './SetCard';
import SetWaitingRoom from './SetWaitingRoom';
import { GameChat } from '@/app/components/chat/GameChat';
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';

interface SetBoardProps {
    gameName: string;
    roomId: string;
    myId: string;
    myName: string;
}

interface Seat {
    socketId: string;
    userId: string;
    name: string;
    score: number;
    sets_found: number;
    connected: boolean;
}

interface Card {
    shape: number;
    color: number;
    fill: number;
    count: number;
    id: string;
}

interface GameState {
    stage: string;
    seats: (Seat | null)[];
    table_cards: (Card | null)[];
    deck_remaining: number;
    last_set_by: string | null;
    last_set_cards: string[];
    winner: string | null;
    winners: string[];
    msg: string;
    game_over: boolean;
}

export default function SetBoard({ gameName, roomId, myId, myName }: SetBoardProps) {
    const { socket } = useSocket();
    const searchParams = useSearchParams();
    const router = useRouter();

    const autoJoinAttempted = useRef(false);

    const [gameStage, setGameStage] = useState<string>('waiting_for_players');
    const [seats, setSeats] = useState<(Seat | null)[]>([null, null, null, null]);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [maxPlayers, setMaxPlayers] = useState<number>(4);
    const [selectedCards, setSelectedCards] = useState<number[]>([]);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string; timeLeft: number } | null>(null);

    const { lang } = useLang();

    const joinRoom = (pwd: string = "") => {
        if (!socket) return;
        if (!roomId) return;

        socket.emit('join_room', {
            game_name: gameName,
            room_id: roomId,
            password: pwd
        });
    };

    const leaveRoom = () => {
        if (!socket || !roomId) return;
        socket.emit('leave_room', { roomId });
    };

    useEffect(() => {
        if (!socket) return;

        if (!roomId) {
            setConnectionError(t(lang, "set.error.no_room_id"));
            return;
        }

        const handleJoinResponse = (response: any) => {
            if (response.success && response.room_data) {
                setHostId(response.room_data.host_id);
                if (response.room_data.max_players) {
                    setMaxPlayers(response.room_data.max_players);
                }

                setShowPasswordModal(false);
                setConnectionError(null);
                setErrorMessage("");

                const shouldAutoJoin = searchParams.get('autojoin');

                if (shouldAutoJoin && !autoJoinAttempted.current) {
                    autoJoinAttempted.current = true;

                    socket.emit('sit_down', {
                        roomId,
                        seatIndex: 0,
                        playerName: myName
                    });

                    router.replace(`/games/${gameName}/${roomId}`, { scroll: false });
                }
            } else {
                if (response.error_code === 'PASSWORD_REQUIRED') {
                    setShowPasswordModal(true);
                    const msg = String(response.message || '').toLowerCase();
                    if (msg.includes('password') || msg.includes('haslo') || msg.includes('błędne') || msg.includes('bledne')) {
                        setErrorMessage(t(lang, "set.error.wrong_password"));
                    }
                } else {
                    setConnectionError(response.message || t(lang, "set.error.could_not_join"));
                    setShowPasswordModal(false);
                }
            }
        };

        const handleGameState = (state: GameState) => {
            if (state.stage) setGameStage(state.stage);
            if (state.seats) {
                setSeats(state.seats);

                const mySeatIdx = state.seats.findIndex((s: any) => s && s.userId === myId);
                if (mySeatIdx !== -1 && state.stage === 'playing') {
                    const opponentSeatIdx = mySeatIdx === 0 ? 1 : 0;
                    const opponentSeat = state.seats[opponentSeatIdx];
                    if (opponentSeat) {
                        if (opponentSeat.connected === true) {
                            setOpponentDisconnected(null);
                        } else if (opponentSeat.connected === false) {
                            setOpponentDisconnected((prev) => {
                                if (prev !== null) return prev;
                                return { name: opponentSeat.name || 'OPPONENT', timeLeft: 60 };
                            });
                        }
                    }
                }
            }
            setGameState(state);

            if (state.last_set_cards && state.last_set_cards.length > 0) {
                setSelectedCards([]);
            }
        };

        const handleError = (err: any) => {
            console.error("Socket error:", err);
        };

        const handleOpponentDisconnected = (data: any) => {
            if (data.playerName) {
                setOpponentDisconnected({ name: data.playerName, timeLeft: data.waitTime || 90 });
            }
        };

        const handleOpponentReconnected = () => {
            setOpponentDisconnected(null);
        };

        const handleGameEndedTimeout = () => {
            setOpponentDisconnected(null);
            router.push(`/lobby/${gameName}`);
        };

        const handleOpponentReturned = () => {
            setOpponentDisconnected(null);
        };

        socket.off('join_room_response');
        socket.off('game_state_update');
        socket.off('error');
        socket.off('opponent_disconnected');
        socket.off('opponent_reconnected');
        socket.off('opponent_returned');
        socket.off('game_ended_timeout');

        socket.on('join_room_response', handleJoinResponse);
        socket.on('game_state_update', handleGameState);
        socket.on('error', handleError);
        socket.on('opponent_disconnected', handleOpponentDisconnected);
        socket.on('opponent_reconnected', handleOpponentReconnected);
        socket.on('opponent_returned', handleOpponentReturned);
        socket.on('game_ended_timeout', handleGameEndedTimeout);

        joinRoom("");
        socket.emit('get_game_state', { roomId });

        return () => {
            socket.off('join_room_response', handleJoinResponse);
            socket.off('game_state_update', handleGameState);
            socket.off('error', handleError);
            socket.off('opponent_disconnected', handleOpponentDisconnected);
            socket.off('opponent_reconnected', handleOpponentReconnected);
            socket.off('opponent_returned', handleOpponentReturned);
            socket.off('game_ended_timeout', handleGameEndedTimeout);
        };
    }, [socket, roomId, gameName, myName, myId, searchParams, router, lang]);

    useEffect(() => {
        if (!opponentDisconnected) return;

        const interval = setInterval(() => {
            setOpponentDisconnected((prev) => {
                if (!prev || prev.timeLeft <= 1) return null;
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [opponentDisconnected?.name]);

    const handlePasswordSubmit = (password: string) => {
        setErrorMessage("");
        joinRoom(password);
    };

    const handleCloseModal = () => {
        router.push(`/lobby/${gameName}`);
    };

    const handleCardClick = (cardIndex: number) => {
        if (!gameState || gameStage !== 'playing') return;

        const mySeatedIndex = seats.findIndex(s => s && String(s.userId) === String(myId));
        if (mySeatedIndex === -1) return;

        setSelectedCards(prev => {
            if (prev.includes(cardIndex)) {
                return prev.filter(i => i !== cardIndex);
            }
            if (prev.length >= 3) {
                return prev;
            }
            return [...prev, cardIndex];
        });
    };

    const handleClaimSet = () => {
        if (!socket || selectedCards.length !== 3) return;

        socket.emit('player_move', {
            roomId,
            move: {
                action: 'claim_set',
                card_indices: selectedCards
            }
        });
        setSelectedCards([]);
    };

    const handleNoSet = () => {
        if (!socket) return;

        socket.emit('player_move', {
            roomId,
            move: {
                action: 'no_set'
            }
        });
    };

    const mySeatedIndex = seats.findIndex(s => s && String(s.userId) === String(myId));
    const isSeated = mySeatedIndex !== -1;

    if (connectionError) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center p-4">
                <div className="bg-[#1a120b]/90 p-8 rounded-xl border-2 border-red-600/50 text-center shadow-2xl backdrop-blur-md max-w-md w-full">
                    <h2 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">
                        {t(lang, "set.error.title")}
                    </h2>
                    <p className="text-gray-200 mb-6 font-medium">{connectionError}</p>
                    <a
                        href={`/lobby/${gameName}`}
                        className="inline-block w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm"
                    >
                        {t(lang, "set.back_to_lobby")}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen flex flex-col p-1 overflow-hidden text-amber-50">
            <div className="shrink-0 mb-1 pl-2 z-10">
                <ReturnArrow href={`/lobby/${gameName}`} text={t(lang, 'arrow')} onClick={leaveRoom} />
            </div>

            <PasswordModal
                isOpen={showPasswordModal}
                gameName={gameName}
                errorMessage={errorMessage}
                onSubmit={handlePasswordSubmit}
                onClose={handleCloseModal}
            />

            {gameStage === 'waiting_for_players' ? (
                <>
                    <SetWaitingRoom
                        maxPlayers={maxPlayers}
                        socket={socket}
                        roomId={roomId}
                        seats={seats}
                        myId={myId}
                        myName={myName}
                        hostId={hostId}
                    />

                    <GameChat
                        socket={socket}
                        roomId={roomId}
                        myId={myId}
                        myName={myName}
                        isBubble={true}
                        className="bottom-4 right-4 rounded-xl border border-amber-900/50 bg-[#1a120b]/95"
                    />
                </>
            ) : gameStage === 'playing' ? (
                <>
                    <div className="flex-1 flex flex-col items-center justify-start pt-4 px-4 overflow-y-auto">
                        <div className="flex justify-center gap-3 mb-4 flex-wrap">
                            {seats.filter(s => s).map((seat, idx) => seat && (
                                <div
                                    key={idx}
                                    className={`
                    px-4 py-2 rounded-lg bg-[#1a120b]/80 backdrop-blur-sm border
                    ${String(seat.userId) === String(myId)
                                            ? 'border-amber-500 ring-2 ring-amber-500/50'
                                            : 'border-[#353434]'
                                        }
                  `}
                                >
                                    <span className="font-semibold text-amber-100">{seat.name}</span>
                                    <span className="ml-2 text-amber-400 font-bold">{seat.score} {t(lang, "set.points")}</span>
                                </div>
                            ))}
                        </div>

                        {gameState?.msg && (
                            <div className="text-center mb-3 text-lg text-amber-300 font-bold animate-pulse">
                                {gameState.msg}
                            </div>
                        )}

                        <div className="text-center mb-3 text-sm text-amber-200/70">
                            {t(lang, "set.cards_remaining")}: {gameState?.deck_remaining || 0}
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 mb-4 justify-items-center max-w-4xl">
                            {gameState?.table_cards.map((card, idx) => (
                                <SetCard
                                    key={card?.id || `empty-${idx}`}
                                    card={card}
                                    selected={selectedCards.includes(idx)}
                                    onClick={() => handleCardClick(idx)}
                                    disabled={!isSeated}
                                />
                            ))}
                        </div>

                        {isSeated && (
                            <div className="flex justify-center gap-4 flex-wrap mt-2">
                                <button
                                    onClick={handleClaimSet}
                                    disabled={selectedCards.length !== 3}
                                    className={`
                    px-6 py-3 rounded-lg font-bold uppercase tracking-wide transition-all border-2
                    ${selectedCards.length === 3
                                            ? 'bg-green-700 hover:bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/50'
                                            : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                                        }
                  `}
                                >
                                    {t(lang, "set.claim_set")} ({selectedCards.length}/3)
                                </button>

                                <button
                                    onClick={handleNoSet}
                                    className="px-6 py-3 rounded-lg font-bold uppercase tracking-wide bg-amber-700 hover:bg-amber-600 text-white transition-colors border-2 border-amber-500"
                                >
                                    {t(lang, "set.no_set")}
                                </button>
                            </div>
                        )}
                    </div>

                    <GameChat
                        socket={socket}
                        roomId={roomId}
                        myId={myId}
                        myName={myName}
                        isBubble
                        height="28%"
                        className="
              w-[140px] md:w-[220px] lg:w-[300px]
              mr-1
              bg-[#000000]/30
              backdrop-blur-md
              border-l border-r border-[#353434]
              bottom-0 right-0
            "
                    />
                </>
            ) : gameStage === 'finished' ? (
                <>
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="max-w-lg w-full text-center">
                            <h1 className="text-4xl font-bold mb-6 text-amber-200">
                                {t(lang, "set.game_over")}
                            </h1>

                            {gameState?.winners && gameState.winners.length > 0 && (
                                <div className="mb-8">
                                    <p className="text-2xl text-amber-400 font-bold mb-2">
                                        {gameState.winners.length === 1
                                            ? t(lang, "set.winner")
                                            : t(lang, "set.draw")
                                        }
                                    </p>
                                    <p className="text-3xl font-extrabold text-white">
                                        {gameState.winners.join(', ')}
                                    </p>
                                </div>
                            )}

                            <div className="bg-[#1a120b]/80 rounded-xl p-6 mb-6 border border-amber-900/50">
                                <h2 className="text-xl font-semibold mb-4 text-amber-200">{t(lang, "set.final_scores")}</h2>
                                <div className="space-y-2">
                                    {seats
                                        .filter(s => s)
                                        .sort((a, b) => (b?.score || 0) - (a?.score || 0))
                                        .map((seat, idx) => seat && (
                                            <div
                                                key={idx}
                                                className={`
                          flex justify-between items-center p-3 rounded-lg
                          ${gameState?.winners?.includes(seat.name)
                                                        ? 'bg-amber-700/50 border border-amber-500'
                                                        : 'bg-black/30 border border-[#353434]'
                                                    }
                        `}
                                            >
                                                <span className="font-semibold">{seat.name}</span>
                                                <span className="text-amber-400 font-bold">{seat.score} {t(lang, "set.points")}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            <a
                                href={`/lobby/${gameName}`}
                                className="inline-block bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-amber-500"
                            >
                                {t(lang, "set.back_to_lobby")}
                            </a>
                        </div>
                    </div>

                    <GameChat
                        socket={socket}
                        roomId={roomId}
                        myId={myId}
                        myName={myName}
                        isBubble={true}
                        className="bottom-4 right-4 rounded-xl border border-amber-900/50 bg-[#1a120b]/95"
                    />
                </>
            ) : null}

            {opponentDisconnected && gameStage !== 'waiting_for_players' && (
                <OpponentDisconnectedBanner
                    name={opponentDisconnected.name}
                    timeLeft={opponentDisconnected.timeLeft}
                />
            )}
        </div>
    );
}

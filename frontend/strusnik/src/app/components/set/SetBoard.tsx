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
import { useNotification } from "@/app/context/NotificationsContext";
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';
import RoomUnavailableState from '@/app/components/common/RoomUnavailableState';
import MultiplayerShell from '@/app/components/multiplayer/MultiplayerShell';
import type { PlayerTileModel } from '@/app/components/multiplayer/types';

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

interface JoinRoomResponse {
    success?: boolean;
    room_data?: { host_id?: string; max_players?: number };
    error_code?: string;
    message?: string;
}

interface OpponentDisconnectPayload {
    playerName?: string;
    waitTime?: number;
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

const fillSetMessage = (lang: Parameters<typeof t>[0], key: string, values: Record<string, string>) => {
    return Object.entries(values).reduce(
        (message, [name, value]) => message.replace(`{${name}}`, value),
        t(lang, key),
    );
};

export default function SetBoard({ gameName, roomId, myId, myName }: SetBoardProps) {
    const { socket } = useSocket();
    const searchParams = useSearchParams();
    const router = useRouter();

    const autoJoinAttempted = useRef(false);
    const hasJoinedRoomRef = useRef(false);

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
    const { notify } = useNotification();
    const lastNotifiedMessageRef = useRef('');

    useEffect(() => {
        const message = gameState?.msg?.trim();
        if (!message || message === lastNotifiedMessageRef.current) return;

        lastNotifiedMessageRef.current = message;
        const normalized = message.toLowerCase();
        const nameMatch = message.match(/^(.*?)\s+(?:found a set|made a mistake)/i);
        const name = nameMatch?.[1] || gameState?.last_set_by || t(lang, 'set.you');

        if (gameState?.stage === 'finished' || normalized.includes('game over')) {
            if ((gameState?.winners?.length || 0) > 1) {
                notify(fillSetMessage(lang, 'set.notifications.draw', { names: gameState?.winners.join(', ') || '' }), 'info');
            } else {
                notify(fillSetMessage(lang, 'set.notifications.winner', { name: gameState?.winners?.[0] || gameState?.winner || name }), 'success');
            }
        } else if (normalized.includes('game started')) {
            notify(t(lang, 'set.notifications.started'), 'info');
        } else if (normalized.includes('found a set')) {
            notify(fillSetMessage(lang, 'set.notifications.found', { name }), 'success');
        } else if (normalized.includes('made a mistake - set')) {
            notify(t(lang, 'set.notifications.no_set_mistake'), 'warning');
        } else if (normalized.includes('made a mistake')) {
            notify(t(lang, 'set.notifications.mistake'), 'warning');
        } else if (normalized.includes('no set')) {
            notify(t(lang, 'set.notifications.no_set'), 'info');
        }
    }, [gameState?.last_set_by, gameState?.msg, gameState?.stage, gameState?.winner, gameState?.winners, lang, notify]);

    const joinRoom = (pwd: string = "") => {
        if (!socket) return;
        if (!roomId) return;

        socket.emit('join_room', {
            game_name: gameName,
            room_id: roomId,
            password: pwd,
            role: searchParams.get('role') === 'observer' ? 'observer' : 'player'
        });
    };

    const leaveRoom = () => {
        if (!socket || !roomId || !hasJoinedRoomRef.current) return;
        hasJoinedRoomRef.current = false;
        socket.emit('leave_room', { roomId });
    };

    useEffect(() => {
        if (!socket) return;

        if (!roomId) {
            return;
        }

        const handleJoinResponse = (response: JoinRoomResponse) => {
            if (response.success && response.room_data) {
                setHostId(response.room_data.host_id ?? null);
                if (response.room_data.max_players) {
                    setMaxPlayers(response.room_data.max_players);
                }

                setShowPasswordModal(false);
                setConnectionError(null);
                setErrorMessage("");
                hasJoinedRoomRef.current = true;

                const shouldAutoJoin = searchParams.get('autojoin');

                if (shouldAutoJoin && !autoJoinAttempted.current) {
                    autoJoinAttempted.current = true;

                    socket.emit('sit_down', {
                        roomId,
                        seatIndex: 0,
                        playerName: myName,
                        autoJoin: true
                    });

                    router.replace(`/games/${gameName}/${roomId}`, { scroll: false });
                }
            } else {
                if (response.error_code === 'PASSWORD_REQUIRED') {
                    setShowPasswordModal(true);
                    const msg = String(response.message || '').toLowerCase();
                    if (msg.includes('password') || msg.includes('haslo') || msg.includes('bledne') || msg.includes('bledne')) {
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

                const mySeatIdx = state.seats.findIndex((s) => s && s.userId === myId);
                if (mySeatIdx !== -1 && state.stage === 'playing') {
                    const opponentSeatIdx = mySeatIdx === 0 ? 1 : 0;
                    const opponentSeat = state.seats[opponentSeatIdx];
                    if (opponentSeat) {
                        if (opponentSeat.connected === true || opponentSeat.connected === undefined) {
                            setOpponentDisconnected(null);
                        } else if (opponentSeat.connected === false) {
                            setOpponentDisconnected((prev) => {
                                if (prev !== null) return prev;
                                return { name: opponentSeat.name || 'OPPONENT', timeLeft: 90 };
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

        const handleError = (err: unknown) => {
            if (err && typeof err === 'object' && Object.keys(err).length > 0 && JSON.stringify(err) !== '{}') {
                console.error("Socket error:", err);
                notify(t(lang, 'set.error.action_failed'), 'error');
            }
        };

        const handleOpponentDisconnected = (data: OpponentDisconnectPayload) => {
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

        socket.off('error', handleError);

        socket.on('join_room_response', handleJoinResponse);
        socket.on('game_state_update', handleGameState);
        socket.on('error', handleError);
        socket.on('opponent_disconnected', handleOpponentDisconnected);
        socket.on('opponent_reconnected', handleOpponentReconnected);
        socket.on('opponent_returned', handleOpponentReturned);
        socket.on('game_ended_timeout', handleGameEndedTimeout);

        joinRoom(searchParams.get('autojoin') ? searchParams.get('password') || '' : '');
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
    }, [socket, roomId, gameName, myName, myId, searchParams, router, lang, notify]);

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

    useEffect(() => {
        if (!socket || !roomId) return;

        const handleBeforeUnload = () => {
            if (hasJoinedRoomRef.current) {
                hasJoinedRoomRef.current = false;
                socket.emit('leave_room', { roomId });
            }
        };

        const handlePopState = () => {
            if (hasJoinedRoomRef.current) {
                hasJoinedRoomRef.current = false;
                socket.emit('leave_room', { roomId });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
            if (hasJoinedRoomRef.current) {
                socket.emit('leave_room', { roomId });
                hasJoinedRoomRef.current = false;
            }
        };
    }, [socket, roomId]);

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
    const finishedWinners = gameState?.winners ?? [];
    const setParticipants: PlayerTileModel[] = seats.flatMap((seat) => {
        if (!seat) return [];
        const isSelf = String(seat.userId) === String(myId);
        return [{
            id: String(seat.userId || seat.socketId),
            displayName: seat.name,
            avatarUrl: String(seat.userId).startsWith('guest_') ? null : `/api/profile/avatar/${encodeURIComponent(String(seat.userId))}`,
            isSelf,
            selfLabel: t(lang, 'set.you'),
            role: 'player' as const,
            connection: seat.connected === false ? 'disconnected' as const : 'connected' as const,
            activity: 'playing' as const,
            activityLabel: t(lang, 'multiplayer.status.playing'),
            metric: { label: t(lang, 'set.points'), value: String(seat.score ?? 0) },
            outcome: gameStage === 'finished'
                ? finishedWinners.length > 1
                    ? 'draw' as const
                    : finishedWinners.includes(seat.name)
                        ? 'won' as const
                        : 'lost' as const
                : undefined,
        }];
    });

    if (connectionError) {
        return (
            <RoomUnavailableState
                roomId={roomId}
                href={`/lobby/${gameName}`}
                backLabel={t(lang, "set.back_to_lobby")}
            />
        );
    }

    return (
        <div className="game-runtime-shell game-runtime-shell--set p-1 text-amber-50">
            <div className="shrink-0 mb-1 pl-2 z-10">
                <ReturnArrow href={`/lobby/${gameName}`} text={t(lang, 'arrow')} onClick={leaveRoom} confirmMessage={gameStage !== 'waiting_for_players' && seats.some((seat) => seat && String(seat.userId) === String(myId)) ? t(lang, 'common.leave_active_confirm') : undefined} />
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
                        isObserver={searchParams.get('role') === 'observer'}
                    />

                    <GameChat
                        socket={socket}
                        roomId={roomId}
                        myId={myId}
                        myName={myName}
                        isBubble={true}
                        bubbleClassName="waiting-chat-bubble"
                        className="waiting-chat-panel rounded-xl border border-amber-900/50 bg-app-surface/95"
                    />
                </>
            ) : gameStage === 'playing' ? (
                <>
                    <MultiplayerShell
                        stage={searchParams.get('role') === 'observer' ? 'observer' : opponentDisconnected ? 'disconnected' : 'active'}
                        participants={setParticipants}
                        participantTitle={t(lang, 'multiplayer.participants')}
                        participantLayout="grid"
                        className="multiplayer-active-shell multiplayer-active-shell--set"
                    >
                    <div className="game-runtime-game-region flex-1 flex flex-col items-center justify-start pt-4 px-4 overflow-y-auto">
                        <div className="set-game-meta">
                            {t(lang, "set.cards_remaining")}: {gameState?.deck_remaining || 0}
                        </div>

                        <div className="game-runtime-board-surface set-game-table grid grid-cols-4 gap-3 mb-4">
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
                                    className={`game-runtime-button
                    px-6 py-3 rounded-lg font-bold uppercase tracking-wide border-2
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
                                    className="game-runtime-button game-runtime-button--primary px-6 py-3 rounded-lg font-bold uppercase tracking-wide"
                                >
                                    {t(lang, "set.no_set")}
                                </button>
                            </div>
                        )}
                    </div>
                    </MultiplayerShell>

                    <GameChat
                        socket={socket}
                        roomId={roomId}
                        myId={myId}
                        myName={myName}
                        isBubble
                        variant="game"
                    />
                </>
            ) : gameStage === 'finished' ? (
                <>
                    <MultiplayerShell
                        stage="finished"
                        participants={setParticipants}
                        participantTitle={t(lang, 'multiplayer.participants')}
                        participantLayout="grid"
                        className="multiplayer-active-shell multiplayer-active-shell--set"
                    >
                    <div className="game-runtime-result-stage flex-1 flex flex-col items-center justify-center p-4">
                        <div className="game-runtime-result max-w-lg w-full text-center">
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

                            <div className="game-runtime-surface p-6 mb-6">
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
                                                        : 'bg-app-surface/70 border border-app-border'
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
                                className="game-runtime-link-button game-runtime-link-button--primary py-3 px-8 uppercase tracking-wide"
                            >
                                {t(lang, "set.back_to_lobby")}
                            </a>
                        </div>
                    </div>
                    </MultiplayerShell>

                    <GameChat
                        socket={socket}
                        roomId={roomId}
                        myId={myId}
                        myName={myName}
                        isBubble={true}
                        variant="game"
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

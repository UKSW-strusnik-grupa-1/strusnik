'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from "@/app/hooks/useSocket";
import { useSearchParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import WaitingRoom from './WaitingRoom';
import ActiveGame from './ActiveGame';
import PasswordModal from '../lobby/passwordModal';
import { GameChat } from '@/app/components/chat/GameChat';
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';
import RoomUnavailableState from '@/app/components/common/RoomUnavailableState';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface BattleshipsBoardProps {
    gameName: string;
    roomId: string;
    myId: string;
    myName: string;
}

interface BattleshipsSeat {
    socketId: string;
    userId: string;
    name: string;
    connected?: boolean;
    avatarUrl?: string | null;
    avatar_url?: string | null;
}

interface JoinRoomResponse {
    success?: boolean;
    room_data?: { host_id?: string; max_players?: number };
    error_code?: string;
    message?: string;
}

interface BattleshipsGameState {
    stage?: string;
    seats?: (BattleshipsSeat | null)[];
}

interface OpponentDisconnectPayload {
    playerName?: string;
    waitTime?: number;
}

export default function BattleshipsBoard({ gameName, roomId, myId, myName }: BattleshipsBoardProps) {
    const { socket } = useSocket();
    const { lang } = useLang();
    const searchParams = useSearchParams();
    const router = useRouter();

    const autoJoinAttempted = useRef(false);
    const hasJoinedRoomRef = useRef(false);

    const [gameStage, setGameStage] = useState<string>("waiting_for_players");
    const [seats, setSeats] = useState<(BattleshipsSeat | null)[]>([null, null]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [maxPlayers, setMaxPlayers] = useState<number>(2);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string; timeLeft: number } | null>(null);

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
                    if (response.message === 'Bledne haslo') {
                        setErrorMessage("Wrong password, try again.");
                    }
                } else {
                    setConnectionError(response.message || "Failed to join the room.");
                    setShowPasswordModal(false);
                }
            }
        };

        const handleGameState = (state: BattleshipsGameState) => {
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
        };

        const handleError = (err: unknown) => {
            if (err && typeof err === 'object' && Object.keys(err).length > 0 && JSON.stringify(err) !== '{}') {
                console.error("Socket error:", err);
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

        const handleOpponentReturned = () => {
            setOpponentDisconnected(null);
        };

        const handleGameEndedTimeout = () => {
            setOpponentDisconnected(null);
            router.push(`/lobby/${gameName}`);
        };

        const handleGameStageChanged = (data: { stage?: string }) => {
            if (data && data.stage) setGameStage(data.stage);
        };

        socket.off('game_stage_changed', handleGameStageChanged);
        socket.off('error', handleError);
        socket.on('join_room_response', handleJoinResponse);
        socket.on('game_state_update', handleGameState);
        socket.on('game_stage_changed', handleGameStageChanged);
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
            socket.off('game_stage_changed', handleGameStageChanged);
            socket.off('error', handleError);
            socket.off('opponent_disconnected', handleOpponentDisconnected);
            socket.off('opponent_reconnected', handleOpponentReconnected);
            socket.off('opponent_returned', handleOpponentReturned);
            socket.off('game_ended_timeout', handleGameEndedTimeout);
        };
    }, [socket, roomId, gameName, myName, myId, searchParams, router]);

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

    if (connectionError) {
        return (
            <RoomUnavailableState
                roomId={roomId}
                href={`/lobby/${gameName}`}
                backLabel={t(lang, 'battleships.back_to_lobby')}
            />
        );
    }

    return (
        <div className='game-runtime-shell game-runtime-shell--battleships p-1'>
            <div className="shrink-0 mb-1 pl-2">
                <ReturnArrow href={`/lobby/${gameName}`} text="WYJDZ" onClick={leaveRoom} confirmMessage={gameStage !== 'waiting_for_players' && seats.some((seat) => seat && String(seat.userId) === String(myId)) ? t(lang, 'common.leave_active_confirm') : undefined} />
            </div>

            <PasswordModal isOpen={showPasswordModal} gameName={gameName} errorMessage={errorMessage} onSubmit={handlePasswordSubmit} onClose={handleCloseModal} />

            {gameStage === "waiting_for_players" ? (
                <>
                    <WaitingRoom
                        socket={socket}
                        roomId={roomId}
                        seats={seats}
                        myId={myId}
                        myName={myName}
                        hostId={hostId}
                        maxPlayers={2}
                        isObserver={searchParams.get('role') === 'observer'}
                    />
                    <GameChat socket={socket} roomId={roomId} myId={myId} myName={myName} isBubble={true} bubbleClassName="waiting-chat-bubble" className="waiting-chat-panel rounded-xl border border-amber-900/50 bg-app-surface/95" />
                </>
            ) : (
                <>
                    <ActiveGame
                        socket={socket}
                        roomId={roomId}
                        seats={seats}
                        myId={myId}
                        gameStage={gameStage}
                        gameName={gameName}
                        onStageChange={(stage) => setGameStage(stage)}
                    />
                    <GameChat socket={socket} roomId={roomId} myId={myId} myName={myName} isBubble variant="game" />
                </>
            )}

            {opponentDisconnected && (
                <OpponentDisconnectedBanner
                    name={opponentDisconnected.name}
                    timeLeft={opponentDisconnected.timeLeft}
                />
            )}
        </div>
    );
}
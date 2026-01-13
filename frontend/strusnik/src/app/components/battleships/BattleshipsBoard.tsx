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
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface BattleshipsBoardProps {
    gameName: string;
    roomId: string;
    myId: string;
    myName: string;
}

export default function BattleshipsBoard({ gameName, roomId, myId, myName }: BattleshipsBoardProps) {
    const { socket } = useSocket();
    const { lang } = useLang();
    const searchParams = useSearchParams();
    const router = useRouter();

    const autoJoinAttempted = useRef(false);

    const [gameStage, setGameStage] = useState<string>("waiting_for_players");
    const [seats, setSeats] = useState<any[]>([null, null]);
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
            setConnectionError("Error: Missing room ID.");
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
                    if (response.message === 'Błędne hasło') {
                        setErrorMessage("Wrong password, try again.");
                    }
                } else {
                    setConnectionError(response.message || "Failed to join the room.");
                    setShowPasswordModal(false);
                }
            }
        };

        const handleGameState = (state: any) => {
            if (state.stage) setGameStage(state.stage);
            if (state.seats) {
                setSeats(state.seats);

                // Check opponent connection status and update disconnect banner
                const mySeatIdx = state.seats.findIndex((s: any) => s && s.userId === myId);
                if (mySeatIdx !== -1 && state.stage === 'playing') {
                    const opponentSeatIdx = mySeatIdx === 0 ? 1 : 0;
                    const opponentSeat = state.seats[opponentSeatIdx];
                    if (opponentSeat) {
                        if (opponentSeat.connected === true) {
                            setOpponentDisconnected(null);
                        } else if (opponentSeat.connected === false) {
                            // Set disconnect banner if not already showing
                            setOpponentDisconnected((prev) => {
                                if (prev !== null) return prev; // Keep existing countdown
                                return { name: opponentSeat.name || 'OPPONENT', timeLeft: 60 };
                            });
                        }
                    }
                }
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

        const handleOpponentReturned = () => {
            // Player is returning after leaving - clear banner and resume game
            setOpponentDisconnected(null);
        };

        const handleGameEndedTimeout = () => {
            setOpponentDisconnected(null);
            router.push(`/lobby/${gameName}`);
        };

        socket.off('join_room_response');
        socket.off('game_state_update');
        socket.off('game_stage_changed');
        socket.off('error');
        socket.off('opponent_disconnected');
        socket.off('opponent_reconnected');
        socket.off('opponent_returned');
        socket.off('game_ended_timeout');

        socket.on('join_room_response', handleJoinResponse);
        socket.on('game_state_update', handleGameState);
        socket.on('game_stage_changed', (data: any) => {
            if (data && data.stage) setGameStage(data.stage);
        });
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
    }, [socket, roomId, gameName, myName, myId, searchParams, router]);

    // Opponent disconnected countdown
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

    if (connectionError) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center p-4">

                <div className="bg-[#1a120b]/90 p-8 rounded-xl border-2 border-red-600/50 text-center shadow-2xl backdrop-blur-md max-w-md w-full">
                    <h2 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">Connection Error</h2>
                    <p className="text-gray-200 mb-6 font-medium">{connectionError}</p>
                    <p className="text-gray-500 text-xs mb-6 font-mono">Room ID: {roomId}</p>

                    <a href={`/lobby/${gameName}`} className="inline-block w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm">
                        {t(lang, 'battleships.back_to_lobby')}
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className='relative w-full h-screen flex flex-col p-1 overflow-hidden bg-[#1a120b]'>
            <div className="shrink-0 mb-1 pl-2">
                <ReturnArrow href={`/lobby/${gameName}`} text="WYJDZ" onClick={leaveRoom} />
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
                    />
                    <GameChat socket={socket} roomId={roomId} myId={myId} myName={myName} isBubble={true} className="bottom-4 right-4 rounded-xl border border-amber-900/50 bg-[#1a120b]/95" />
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
                    <GameChat socket={socket} roomId={roomId} myId={myId} myName={myName} isBubble height="28%" className="w-[300px] mr-1 bg-black/30 backdrop-blur-md bottom-0 right-0" />
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
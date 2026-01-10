'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from "@/app/hooks/useSocket";
import { useSearchParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import WaitingRoom from './WaitingRoom';
import Game from './Game';
import PasswordModal from '../lobby/passwordModal';
import { GameChat } from '@/app/components/chat/GameChat'; 

interface ThousandBoardProps {
    gameName: string;
    roomId: string;
    myId: string;
    myName: string;
}

export default function ThousandBoard({ gameName, roomId, myId, myName }: ThousandBoardProps) {
    const { socket } = useSocket();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const autoJoinAttempted = useRef(false);

    const [gameStage, setGameStage] = useState<string>("waiting_for_players");
    const [seats, setSeats] = useState<any[]>([null, null, null, null]);
    const [myHand, setMyHand] = useState<string[]>([]);
    const [hostId, setHostId] = useState<string | null>(null);
    const [maxPlayers, setMaxPlayers] = useState<number>(4);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const handleExitSignal = () => {
        if (socket) {
            socket.emit('leave_room', { roomId });
        }
    };

    const joinRoom = (pwd: string = "") => {
        if (!socket) return;
        if (!roomId) return;

        socket.emit('join_room', { 
            game_name: gameName, 
            room_id: roomId, 
            password: pwd 
        });
    };

    useEffect(() => {
        if (!socket) return;
        
        if (!roomId) {
            setConnectionError("Blad: Brak ID pokoju.");
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
                    if (response.message === 'BLEDNE HASLO') {
                        setErrorMessage("Bledne haslo, sprobuj ponownie.");
                    }
                } else {
                    setConnectionError(response.message || "Nie udalo sie dolaczyc do pokoju.");
                    setShowPasswordModal(false);
                }
            }
        };

        const handleGameState = (state: any) => {
            if (state.stage) setGameStage(state.stage);
            if (state.seats) setSeats(state.seats);
            if (state.my_hand) setMyHand(state.my_hand);
        };

        const handleError = (err: any) => {
            console.error("Socket error:", err);
        };

        socket.off('join_room_response');
        socket.off('game_state_update');
        socket.off('error');

        socket.on('join_room_response', handleJoinResponse);
        socket.on('game_state_update', handleGameState);
        socket.on('error', handleError);

        joinRoom(""); 
        socket.emit('get_game_state', { roomId });

        return () => {
            socket.off('join_room_response', handleJoinResponse);
            socket.off('game_state_update', handleGameState);
            socket.off('error', handleError);
        };
    }, [socket, roomId, gameName, myName, searchParams, router]); 

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
                    <h2 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">Blad polaczenia</h2>
                    <p className="text-gray-200 mb-6 font-medium">{connectionError}</p>
                    <p className="text-gray-500 text-xs mb-6 font-mono">ID Pokoju: {roomId}</p>
                    
                    <a href={`/lobby/${gameName}`} className="inline-block w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm">
                        WROC DO LOBBY
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className='relative w-full h-screen flex flex-col p-1 overflow-hidden'>
            
            <div className="shrink-0 mb-1 pl-2" onClickCapture={handleExitSignal}>
                <ReturnArrow href={`/lobby/${gameName}`} text="WYJDZ" />
            </div>

            <PasswordModal 
                isOpen={showPasswordModal}
                gameName={gameName}
                errorMessage={errorMessage}
                onSubmit={handlePasswordSubmit}
                onClose={handleCloseModal}
            />

            {gameStage === "waiting_for_players" ? (
                <>
                    <WaitingRoom 
                        socket={socket} 
                        roomId={roomId} 
                        seats={seats} 
                        myId={myId} 
                        myName={myName}
                        hostId={hostId}
                        maxPlayers={maxPlayers}
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
            ) : (
                <>
                    <Game 
                        socket={socket}
                        roomId={roomId}
                        seats={seats}
                        myId={myId}
                        initialHand={myHand}
                    />
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
            )}
        </div>
    );
}
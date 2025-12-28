'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from "@/app/hooks/useSocket";
import { useSearchParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import WaitingRoom from './WaitingRoom';
import ActiveGame from './ActiveGame';
import SearchInput from '@/app/components/lobby/searchInput';

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
    
    // --- BLOKADA AUTO-JOIN (Aby nie wysyłało się 2 razy) ---
    const autoJoinAttempted = useRef(false);

    // Stany gry
    const [gameStage, setGameStage] = useState<string>("waiting_for_players");
    const [seats, setSeats] = useState<any[]>([null, null, null, null]);
    const [myHand, setMyHand] = useState<string[]>([]);
    const [hostId, setHostId] = useState<string | null>(null);

    // Stany UI / Hasła / Błędów
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Funkcja wysyłająca żądanie dołączenia
    const joinRoom = (pwd: string = "") => {
        if (!socket) return;
        if (!roomId) return;

        console.log(`[ThousandBoard] Próba dołączenia do pokoju: ${roomId}, Hasło: ${pwd ? '***' : 'brak'}`);
        
        socket.emit('join_room', { 
            game_name: gameName, 
            room_id: roomId, 
            password: pwd 
        });
    };

    // USUNIĘTO: useEffect z return { socket.emit('leave_room') }
    // Powodował on natychmiastowe rozłączenie w React Strict Mode.

    useEffect(() => {
        if (!socket) return;
        
        if (!roomId) {
            setConnectionError("Blad: Brak identyfikatora pokoju.");
            return;
        }

        // --- HANDLERY ---

        const handleJoinResponse = (response: any) => {

            if (response.success && response.room_data) {
                setHostId(response.room_data.host_id);
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

    const handleSubmitPassword = () => {
        setErrorMessage("");
        joinRoom(passwordInput);
    };

    // Jeśli chcesz, aby ReturnArrow (Wstecz) poprawnie rozłączał,
    // możesz dodać handler onClick w ReturnArrow lub użyć handlera tutaj.
    // Ale w tej chwili bezpieczniej jest polegać na timeoucie (60s) przy przycisku wstecz,
    // niż ryzykować ponowne błędne rozłączenia.

    if (connectionError) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center p-4">
                <img alt="Tło" src="/main/background.png" className="fixed w-full h-full object-cover -z-10" />
                
                <div className="bg-[#1a120b]/90 p-8 rounded-xl border-2 border-red-600/50 text-center shadow-2xl backdrop-blur-md max-w-md w-full">
                    <h2 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">Blad polaczenia</h2>
                    <p className="text-gray-200 mb-6 font-medium">{connectionError}</p>
                    <p className="text-gray-500 text-xs mb-6 font-mono">ID Pokoju: {roomId}</p>
                    
                    <a href={`/lobby/${gameName}`} className="inline-block w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm">
                        Wróć do Lobby
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className='relative w-full h-screen flex flex-col p-1 overflow-hidden'>
            <img
                alt="Tło"
                src="/main/background.png"
                className="fixed w-full h-full object-cover -z-10 top-0 left-0"
            />
            
            <div className="shrink-0 mb-1 pl-2">
                {/* Tutaj ReturnArrow po prostu zmienia URL. 
                   Socket zostanie rozłączony przez 'leave_room' przy unmount NIE zostanie wysłany,
                   więc zadziała timeout 60s, ALBO (jeśli chcesz) możesz tu dodać onClick 
                   z socket.emit('leave_room').
                */}
                <ReturnArrow href={`/lobby/${gameName}`} text="Wyjdz" />
            </div>

            {showPasswordModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 animate-in fade-in duration-300">
                    <div className="shrink-0 mb-1 pl-2">
                        <ReturnArrow href={`/lobby/${gameName}`} text="Wyjdz" />
                    </div>
                    <div className="flex flex-col gap-5 bg-[#2b1d15] border-2 border-[#6b5645] p-8 rounded-xl w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-amber-50 uppercase tracking-wide mb-1">
                                Pokój prywatny
                            </h2>
                            <p className="text-gray-400 text-xs">Wymagane uwierzytelnienie</p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-amber-500/80 font-bold uppercase ml-1 tracking-wider">Haslo do pokoju</label>
                            <SearchInput 
                                text={passwordInput} 
                                setText={setPasswordInput} 
                                placeholder="Wpisz haslo..." 
                            />
                        </div>

                        {errorMessage && (
                            <div className="bg-red-900/30 border border-red-500/30 rounded p-2">
                                <p className="text-red-400 text-xs font-bold text-center animate-pulse">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={handleSubmitPassword}
                            className="relative group w-full h-12 mt-2 cursor-pointer overflow-hidden rounded-lg"
                        >
                            <div className="absolute inset-0 bg-amber-700 group-hover:bg-amber-600 transition-colors duration-300 shadow-lg"></div>
                            <span className="relative z-10 text-white font-bold uppercase tracking-wider flex items-center justify-center h-full">
                                Dolacz do gry
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {gameStage === "waiting_for_players" ? (
                <WaitingRoom 
                    socket={socket} 
                    roomId={roomId} 
                    seats={seats} 
                    myId={myId} 
                    myName={myName}
                    hostId={hostId}
                />
            ) : (
                <ActiveGame 
                    socket={socket}
                    roomId={roomId}
                    seats={seats}
                    myId={myId}
                    initialHand={myHand}
                />
            )}
        </div>
    );
}
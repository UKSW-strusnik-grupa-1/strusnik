'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from "@/app/hooks/useSocket";
import ReturnArrow from '@/app/components/lobby/returnArrow';
import WaitingRoom from './WaitingRoom';
import ActiveGame from './ActiveGame';

interface ThousandBoardProps {
    gameName: string;
    roomId: string;
    myId: string;
    myName: string;
}

export default function ThousandBoard({ gameName, roomId, myId, myName }: ThousandBoardProps) {
    const { socket } = useSocket();
    
    const [gameStage, setGameStage] = useState<string>("waiting_for_players");
    const [seats, setSeats] = useState<any[]>([null, null, null, null]);
    const [myHand, setMyHand] = useState<string[]>([]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('join_room', { game_name: gameName, room_id: roomId });
        socket.emit('get_game_state', { roomId });

        socket.on('game_state_update', (state: any) => {
            if (state.stage) setGameStage(state.stage);
            if (state.seats) setSeats(state.seats);
            if (state.my_hand) setMyHand(state.my_hand);
        });

        return () => {
            socket.off('game_state_update');
        };
    }, [socket, roomId, gameName]);

    return (
        <div className='relative w-full h-screen flex flex-col p-1 overflow-hidden'>
            <img
                alt="Tło"
                src="/main/background.png"
                className="fixed w-full h-full object-cover -z-10 top-0 left-0"
            />
            
            <div className="shrink-0 mb-1 pl-2">
                <ReturnArrow href={`/lobby/${gameName}`} text="Wyjdź" />
            </div>

            {gameStage === "waiting_for_players" ? (
                <WaitingRoom 
                    socket={socket} 
                    roomId={roomId} 
                    seats={seats} 
                    myId={myId} 
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
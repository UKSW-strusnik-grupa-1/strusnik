'use client';

import { UserIcon } from 'lucide-react';
import React from 'react';

interface WaitingRoomProps {
    socket: any;
    roomId: string;
    seats: any[];
    myId: string;
}

export default function WaitingRoom({ socket, roomId, seats, myId }: WaitingRoomProps) {

    const handleSit = (seatIndex: number) => {
        if (socket) socket.emit('sit_down', { roomId, seatIndex });
    };

    const handleStartGame = () => {
        if (socket) socket.emit('start_game', { roomId });
    };

    const getMySeatIndex = () => {
        const idx = seats.findIndex(s => s?.id === myId);
        return idx === -1 ? 0 : idx;
    };

    const getPlayerAtScreenPos = (offset: number) => {
        const myIdx = getMySeatIndex();
        const targetIdx = (myIdx + offset) % 4;
        return { data: seats[targetIdx], seatIndex: targetIdx };
    };

    const PlayerSlot = ({ offset }: { offset: number }) => {
        const { data, seatIndex } = getPlayerAtScreenPos(offset);
        const isTaken = data !== null;
        const isMe = data?.id === myId;

        if (isTaken) {
            return (
                <div className={`
                    flex flex-col items-center justify-center
                    w-[16vh] h-[16vh] rounded-full border-4 shadow-xl transition-all
                    ${isMe ? 'bg-amber-900/80 border-amber-500' : 'bg-black/60 border-[#353434]'}
                `}>
                    <UserIcon className="text-3xl mb-1"/>
                    <p className={`font-bold text-center leading-tight ${isMe ? 'text-amber-400' : 'text-gray-200'}`}>
                        {isMe ? 'TY' : data.name}
                    </p>
                    {isMe && <p className="text-[10px] text-green-400 uppercase font-bold mt-1">Gotowy</p>}
                </div>
            );
        }

        return (
            <button 
                onClick={() => handleSit(seatIndex)}
                className="group flex flex-col items-center justify-center w-[14vh] h-[14vh] rounded-full border-4 border-dashed border-gray-600 bg-black/20 hover:bg-amber-900/30 hover:border-amber-500/50 transition-all cursor-pointer"
            >
                <span className="text-2xl text-gray-500 group-hover:text-amber-200 transition-colors">+</span>
                <span className="text-xs uppercase font-bold text-gray-500 group-hover:text-amber-200 mt-1">Dolacz</span>
            </button>
        );
    };

    const readyPlayersCount = seats.filter(s => s !== null).length;
    const canStart = readyPlayersCount >= 2;

    return (
        <div className="flex-1 flex flex-col items-center justify-center w-full h-full relative">
            
            <div className="absolute inset-0 m-auto w-[40%] h-[30%] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center z-0">
                <h2 className="text-2xl font-bold text-amber-50 mb-2">Poczekalnia</h2>
                <p className="text-gray-300 mb-4">Oczekiwanie na graczy... ({readyPlayersCount}/4)</p>
                
                {canStart && (
                    <button 
                        onClick={handleStartGame}
                        className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-all transform hover:scale-105"
                    >
                        START GRY
                    </button>
                )}
            </div>

            <div className="absolute top-[10%] left-1/2 -translate-x-1/2">
                <PlayerSlot offset={2} />
            </div>

            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2">
                <PlayerSlot offset={0} />
            </div>

            <div className="absolute left-[5%] top-1/2 -translate-y-1/2">
                <PlayerSlot offset={3} />
            </div>

            <div className="absolute right-[5%] top-1/2 -translate-y-1/2">
                <PlayerSlot offset={1} />
            </div>

        </div>
    );
}
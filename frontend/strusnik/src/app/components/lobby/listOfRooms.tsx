"use client"

import { useSocket } from '@/app/hooks/useSocket'
import React, { useEffect, useState } from 'react'
import RoomTile from './roomTile';
import SearchInput from './searchInput';

interface ListOfRoomsProps {
    gameName: string;
}

export default function ListOfRooms({ gameName } : ListOfRoomsProps) {
    const { socket } = useSocket();
    const [rooms, setRooms] = useState<any[]>([]);

    useEffect(() => {
        if (!socket) return;
        if (!gameName) return; 

        const handleRoomsList = (response: any) => {
            if (response.rooms) {
                setRooms(response.rooms);
            }
        };

        socket.on("rooms_list", handleRoomsList);
        socket.emit("get_rooms", { game_name: gameName })

        return () => {
            socket.off("rooms_list", handleRoomsList);
        };
    }, [socket, gameName]);

    return (
        <div className="w-full h-full flex flex-col gap-4">
            
            <div className="shrink-0 pt-2 px-4">
                <SearchInput placeholder='Wyszukaj pokoj...'/>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pb-2 pl-4 pr-2">
                {rooms.length === 0 && (
                    <h1 className='font-bold text-center mt-4 text-gray-400'>Nie znaleziono zadnego pokoju.</h1>
                )}
                
                {rooms.map(room => (
                    <div key={room.id}>
                        <RoomTile
                            uuid={room.id} 
                            gameName={gameName}
                            roomName={room.room_name} 
                            players={room.players_count} 
                            maxPlayers={room.max_players}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
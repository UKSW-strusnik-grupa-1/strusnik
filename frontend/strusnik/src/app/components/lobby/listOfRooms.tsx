"use client"

import { useSocket } from '@/app/hooks/useSocket'
import React, { useEffect, useState } from 'react'
import RoomTile from './roomTile';
import SearchInput from './searchInput';
import RefreshButton from './refreshButton';
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

interface ListOfRoomsProps {
    gameName: string;
}

export default function ListOfRooms({ gameName }: ListOfRoomsProps) {

    const { socket } = useSocket();
    const [rooms, setRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const { lang } = useLang();

    const handleRefresh = () => {
        if (!socket) return;

        setIsLoading(true);
        socket.emit("get_rooms", { game_name: gameName });
    };

    useEffect(() => {
        if (!socket) return;
        if (!gameName) return;

        const handleRoomsList = (response: any) => {
            if (response.rooms) {
                setRooms(response.rooms);
                setTimeout(() => {
                    setIsLoading(false);
                }, 2000);
            }
        };

        socket.on("rooms_list", handleRoomsList);

        handleRefresh();

        return () => {
            socket.off("rooms_list", handleRoomsList);
        };
    }, [socket, gameName]);

    const filteredRooms = rooms.filter((room) =>
        room.room_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading && rooms.length === 0) {
        return (
            <div className="relative w-full h-full flex flex-col gap-3 sm:gap-4">
                <RefreshButton onClick={handleRefresh} isLoading={isLoading} />

                <div className="shrink-0 pt-2 px-2 sm:px-4">
                    <SearchInput
                        placeholder={t(lang, "rooms.search_placeholder")}
                        text={searchQuery}
                        setText={setSearchQuery}
                    />
                </div>
                <p className="text-center text-gray-400 font-bold text-sm sm:text-base">{t(lang, "loading")}</p>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full flex flex-col gap-3 sm:gap-4">

            <RefreshButton onClick={handleRefresh} isLoading={isLoading} />

            <div className="shrink-0 pt-2 px-2 sm:px-4">
                <SearchInput
                    placeholder={t(lang, "rooms.search_placeholder")}
                    text={searchQuery}
                    setText={setSearchQuery}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pb-2 pl-2 sm:pl-4 pr-1 sm:pr-2">
                {filteredRooms.length === 0 && !isLoading && (
                    <h1 className='font-bold text-center mt-4 text-gray-400 text-sm sm:text-base'>{t(lang, "rooms.lack")}</h1>
                )}

                {filteredRooms.map(room => (
                    <div key={room.id}>
                        <RoomTile
                            uuid={room.id}
                            gameName={gameName}
                            roomName={room.room_name}
                            players={room.players_count}
                            maxPlayers={room.max_players}
                            isPrivate={room.has_password}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
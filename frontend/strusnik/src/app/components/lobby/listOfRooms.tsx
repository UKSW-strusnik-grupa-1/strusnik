"use client";

import { SearchX } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSocket } from "@/app/hooks/useSocket";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import RefreshButton from "./refreshButton";
import RoomTile from "./roomTile";
import SearchInput from "./searchInput";

interface ListOfRoomsProps {
  gameName: string;
}

interface RoomSummary {
  id: string;
  room_name?: string;
  players_count: number;
  max_players: number;
  has_password?: boolean;
  observers_count?: number;
  max_observers?: number;
  observers_allowed?: boolean;
  map_id?: string;
  match_mode?: string;
  duration_min?: number;
}

interface RoomsPayload {
  rooms?: RoomSummary[];
}

function LoadingRooms({ label }: { label: string }) {
  return (
    <div className="lobby-loading-state" role="listitem">
      <div className="lobby-loading-rows" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className="sr-only" role="status">{label}</span>
    </div>
  );
}

export default function ListOfRooms({ gameName }: ListOfRoomsProps) {
  const { socket } = useSocket();
  const { lang } = useLang();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleRefresh = () => {
    if (!socket) return;

    setIsLoading(true);
    socket.emit("get_rooms", { game_name: gameName });
  };

  useEffect(() => {
    if (!socket || !gameName) return;

    const handleRoomsList = (response: RoomsPayload) => {
      if (Array.isArray(response.rooms)) {
        setRooms(response.rooms);
      }
      setIsLoading(false);
    };

    const handleSocketError = () => setIsLoading(false);
    socket.on("rooms_list", handleRoomsList);
    socket.on("error", handleSocketError);
    socket.emit("get_rooms", { game_name: gameName });

    return () => {
      socket.off("rooms_list", handleRoomsList);
      socket.off("error", handleSocketError);
    };
  }, [socket, gameName]);

  const filteredRooms = rooms.filter((room) =>
    String(room.room_name || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="lobby-rooms-panel">
      <header className="lobby-rooms-header">
        <div>
          <p className="lobby-section-kicker">{t(lang, "lobby.rooms_kicker")}</p>
          <h2>{t(lang, "lobby.rooms_title")}</h2>
          <p>{t(lang, "lobby.rooms_hint")}</p>
        </div>
        <RefreshButton onClick={handleRefresh} isLoading={isLoading} />
      </header>

      <div className="lobby-rooms-search">
        <SearchInput
          placeholder={t(lang, "rooms.search_placeholder")}
          text={searchQuery}
          setText={setSearchQuery}
        />
      </div>

      <div className="lobby-rooms-list" role="list" aria-busy={isLoading}>
        {isLoading && rooms.length === 0 ? (
          <LoadingRooms label={t(lang, "loading")} />
        ) : filteredRooms.length === 0 ? (
          <div className="lobby-empty-state" role="listitem">
            <SearchX size={24} strokeWidth={1.8} aria-hidden="true" />
            <p>{t(lang, "rooms.lack")}</p>
            <span>{t(lang, "lobby.rooms_empty_hint")}</span>
          </div>
        ) : (
          filteredRooms.map((room) => (
            <RoomTile
              key={room.id}
              uuid={room.id}
              gameName={gameName}
              roomName={room.room_name ?? ""}
              players={room.players_count}
              maxPlayers={room.max_players}
              isPrivate={room.has_password}
              observers={room.observers_count}
              maxObservers={room.max_observers}
              observersAllowed={room.observers_allowed}
              mapId={room.map_id}
              matchMode={room.match_mode}
              durationMin={room.duration_min}
            />
          ))
        )}
      </div>
    </div>
  );
}

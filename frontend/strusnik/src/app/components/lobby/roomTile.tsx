"use client";

import { ArrowUpRight, Eye, LockKeyhole, MapPinned, UsersRound } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

function normalizeGameName(name: string): string {
  const normalized: Record<string, string> = {
    chess: "Chess",
    stratego: "Stratego",
    tysiac: "Tysiac",
    battleships: "Battleships",
    set: "Set",
    haxball: "haxball",
  };

  return normalized[name.toLowerCase()] || name;
}

interface RoomTileProps {
  uuid: string;
  gameName: string;
  roomName: string;
  isPrivate?: boolean;
  players: number;
  maxPlayers: number;
  observers?: number;
  maxObservers?: number;
  observersAllowed?: boolean;
  mapId?: string;
  matchMode?: string;
  durationMin?: number;
}

export default function RoomTile({
  gameName,
  roomName,
  isPrivate = false,
  players,
  maxPlayers,
  uuid,
  observers = 0,
  maxObservers = 20,
  observersAllowed = true,
  mapId,
  matchMode,
  durationMin,
}: RoomTileProps) {
  const { lang } = useLang();
  const normalizedGameName = normalizeGameName(gameName);
  const isFull = players >= maxPlayers;

  return (
    <article className="room-tile" role="listitem">
      <div className="room-tile__identity">
        <span className="room-tile__status" aria-hidden="true" />
        <div className="room-tile__copy">
          <p className="room-tile__name" title={roomName}>{roomName}</p>
          <div className="room-tile__meta">
            {isPrivate && (
              <span className="room-tile__private">
                <LockKeyhole size={14} strokeWidth={2} aria-hidden="true" />
                <span className="sr-only">{t(lang, "rooms.private")}</span>
              </span>
            )}
            <span className="room-tile__players">
              <UsersRound size={14} strokeWidth={2} aria-hidden="true" />
              <span>{players}/{maxPlayers}</span>
              <span className="sr-only">{t(lang, "rooms.players")}</span>
            </span>
            <span className="room-tile__players room-tile__observers">
              <Eye size={14} strokeWidth={2} aria-hidden="true" />
              <span>{observers}/{maxObservers}</span>
              <span className="sr-only">{t(lang, "rooms.observers")}</span>
            </span>
            {mapId && gameName.toLowerCase() === "haxball" && (
              <span className="room-tile__map">
                <MapPinned size={14} strokeWidth={2} aria-hidden="true" />
                <span>{t(lang, `haxball.maps.${mapId.replaceAll('-', '_')}`)}</span>
                {matchMode && <span aria-hidden="true">· {matchMode}</span>}
                {durationMin && <span aria-hidden="true">· {durationMin} MIN</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="room-tile__actions">
        {isFull && !observersAllowed ? (
          <span className="room-tile__full" role="status">{t(lang, "rooms.full")}</span>
        ) : isFull ? (
          <Link
            href={`/games/${normalizedGameName}/${uuid}?role=observer`}
            className="room-tile__join"
            aria-label={`${t(lang, "rooms.observe")}: ${roomName}`}
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t(lang, "rooms.observe")}</span>
          </Link>
        ) : (
          <>
            <Link
              href={`/games/${normalizedGameName}/${uuid}?role=player`}
              className="room-tile__join"
              aria-label={`${t(lang, "rooms.join")}: ${roomName}`}
            >
              <span>{t(lang, "rooms.join")}</span>
              <ArrowUpRight size={17} strokeWidth={2} aria-hidden="true" />
            </Link>
            {observersAllowed && (
              <Link
                href={`/games/${normalizedGameName}/${uuid}?role=observer`}
                className="room-tile__observe"
                aria-label={`${t(lang, "rooms.observe")}: ${roomName}`}
              >
                <Eye size={16} strokeWidth={2} aria-hidden="true" />
                <span>{t(lang, "rooms.observe")}</span>
              </Link>
            )}
          </>
        )}
      </div>
    </article>
  );
}

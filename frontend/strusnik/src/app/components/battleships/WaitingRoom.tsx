'use client';

import OnlinePlayersList from '../lobby/onlinePlayersList';
import WaitingRoomLayout from '../lobby/WaitingRoomLayout';
import { useEffect } from 'react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import RoomObserverSettings from '../lobby/RoomObserverSettings';

interface Player {
    socketId: string;
    userId: string;
    name: string;
    score?: number;
    connected?: boolean;
}

interface WaitingSocket {
    id?: string;
    on: (event: string, handler: (payload: unknown) => void) => void;
    off: (event: string, handler: (payload: unknown) => void) => void;
    emit: (event: string, data: Record<string, unknown>) => void;
}

interface WaitingRoomProps {
    socket: WaitingSocket | null;
    roomId: string;
    seats: (Player | null)[];
    myId: string;
    myName: string;
    hostId: string | null;
    maxPlayers: number;
    isObserver?: boolean;
}

export default function WaitingRoom({ socket, roomId, seats, myId, myName, hostId, maxPlayers, isObserver = false }: WaitingRoomProps) {
    const { lang } = useLang();
    const readyPlayersCount = seats.filter(Boolean).length;
    const canStart = readyPlayersCount === maxPlayers && seats.filter(Boolean).every((seat) => seat?.connected !== false);
    const isHost = socket && hostId && socket.id === hostId;

    const handleSit = (seatIndex: number) => {
        socket?.emit('sit_down', { roomId, seatIndex, playerName: myName });
    };

    const handleStartGame = () => socket?.emit('start_game', { roomId });

    useEffect(() => {
        if (canStart && isHost && socket) {
            const timer = setTimeout(() => socket.emit('start_game', { roomId }), 500);
            return () => clearTimeout(timer);
        }
    }, [canStart, isHost, socket, roomId]);

    return (
        <>
            <OnlinePlayersList inviteMode currentRoomId={roomId} placement="top" />
            <WaitingRoomLayout
                seats={seats}
                myId={myId}
                maxPlayers={maxPlayers}
                title={t(lang, 'battleships.waiting_room_title')}
                eyebrow={t(lang, 'lobby.waiting_room')}
                status={<>{t(lang, 'battleships.waiting_for_players')} ({readyPlayersCount}/{maxPlayers})<br /><span className="waiting-room-status-detail">{maxPlayers === readyPlayersCount ? t(lang, 'battleships.room_full_message') : `${t(lang, 'battleships.min_required')} ${maxPlayers === 4 ? 3 : maxPlayers}`}</span></>}
                action={
                    <div className="waiting-room-action-stack">
                        {isHost ? (
                            <button type="button" onClick={handleStartGame} disabled={!canStart} className={`game-primary-button waiting-room-start-button ${!canStart ? 'cursor-not-allowed opacity-50' : ''}`}>
                                {t(lang, 'battleships.start_game')}
                            </button>
                        ) : <div className="waiting-room-waiting-message">{canStart ? t(lang, 'battleships.waiting_for_host') : t(lang, 'battleships.waiting_for_others')}</div>}
                        <RoomObserverSettings socket={socket} roomId={roomId} hostId={hostId} />
                    </div>
                }
                joinLabel={t(lang, 'lobby.join_seat')}
                emptySeatLabel={t(lang, 'lobby.empty_seat')}
                readyLabel={t(lang, 'lobby.ready')}
                youLabel={t(lang, 'multiplayer.you')}
                onSit={isObserver ? undefined : handleSit}
                loading={!socket}
            />
        </>
    );
}

'use client';

import OnlinePlayersList from '../lobby/onlinePlayersList';
import WaitingRoomLayout from '../lobby/WaitingRoomLayout';
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
  const minPlayers = maxPlayers === 4 ? 3 : maxPlayers;

  const handleSit = (seatIndex: number) => socket?.emit('sit_down', { roomId, seatIndex, playerName: myName });
  const handleStartGame = () => socket?.emit('start_game', { roomId });

  return (
    <>
      <OnlinePlayersList inviteMode currentRoomId={roomId} placement="top" />
      <WaitingRoomLayout
        seats={seats}
        myId={myId}
        maxPlayers={maxPlayers}
        title={t(lang, 'thousand.waiting_room.title')}
        eyebrow={t(lang, 'lobby.waiting_room')}
        status={<>{t(lang, 'thousand.waiting_room.waiting')} ({readyPlayersCount}/{maxPlayers})<br /><span className="waiting-room-status-detail">{maxPlayers === readyPlayersCount ? t(lang, 'thousand.waiting_room.room_full') : `${t(lang, 'thousand.waiting_room.min_required')} ${minPlayers}`}</span></>}
        action={
          <div className="waiting-room-action-stack">
            {isHost ? (
              <button type="button" onClick={handleStartGame} disabled={!canStart} className={`game-primary-button waiting-room-start-button ${!canStart ? 'cursor-not-allowed opacity-50' : ''}`}>
                {t(lang, 'thousand.waiting_room.start_game')}
              </button>
            ) : <div className="waiting-room-waiting-message">{canStart ? t(lang, 'thousand.waiting_room.waiting_host') : t(lang, 'thousand.waiting_room.waiting_players')}</div>}
            <RoomObserverSettings socket={socket} roomId={roomId} hostId={hostId} />
          </div>
        }
        joinLabel={t(lang, 'rooms.join')}
        emptySeatLabel={t(lang, 'lobby.empty_seat')}
        readyLabel={t(lang, 'thousand.waiting_room.ready')}
        youLabel={t(lang, 'thousand.you')}
        onSit={isObserver ? undefined : handleSit}
        loading={!socket}
      />
    </>
  );
}

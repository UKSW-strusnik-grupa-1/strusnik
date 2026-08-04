'use client';

import { useMemo, type ReactNode } from 'react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import MultiplayerShell from '@/app/components/multiplayer/MultiplayerShell';
import type { PlayerTileModel } from '@/app/components/multiplayer/types';

export interface WaitingRoomPlayer {
  userId: string;
  name: string;
  socketId?: string;
  avatarUrl?: string | null;
  connected?: boolean;
}

interface WaitingRoomLayoutProps {
  seats: (WaitingRoomPlayer | null)[];
  myId: string;
  maxPlayers: number;
  title: string;
  eyebrow?: string;
  status: ReactNode;
  action: ReactNode;
  joinLabel: string;
  emptySeatLabel: string;
  readyLabel: string;
  youLabel: string;
  onSit?: (seatIndex: number) => void;
  loading?: boolean;
}

function avatarUrlForPlayer(player: WaitingRoomPlayer) {
  if (player.avatarUrl) return player.avatarUrl;
  if (String(player.userId).startsWith('guest_')) return null;
  return `/api/profile/avatar/${encodeURIComponent(String(player.userId))}`;
}

export default function WaitingRoomLayout({
  seats,
  myId,
  maxPlayers,
  title,
  status,
  action,
  joinLabel,
  emptySeatLabel,
  readyLabel,
  youLabel,
  onSit,
  loading = false,
}: WaitingRoomLayoutProps) {
  const { lang } = useLang();
  const seatIndexes = useMemo(() => Array.from({ length: maxPlayers }, (_, index) => index), [maxPlayers]);
  const participants = useMemo<PlayerTileModel[]>(
    () => seats.flatMap((player, seatIndex) => {
      if (!player) return [];
      return [{
        id: String(player.userId || player.socketId || `seat-${seatIndex}`),
        displayName: player.name,
        avatarUrl: avatarUrlForPlayer(player),
        isSelf: String(player.userId) === String(myId),
        selfLabel: youLabel,
        role: 'player',
        connection: player.connected === false ? 'disconnected' : 'connected',
        activity: 'ready',
        activityLabel: readyLabel,
      }];
    }),
    [myId, readyLabel, seats, youLabel],
  );
  const emptySeatIndexes = seatIndexes.filter((seatIndex) => !seats[seatIndex]);

  return (
    <main id="main-content" className="waiting-room-shell multiplayer-lobby-page">
      <MultiplayerShell
        stage="lobby"
        title={title}
        status={status}
        participants={participants}
        participantTitle={t(lang, 'multiplayer.participants')}
        participantLayout={maxPlayers > 2 ? 'grid' : 'stack'}
        emptySeatIndexes={emptySeatIndexes}
        emptySeatLabel={emptySeatLabel}
        joinLabel={joinLabel}
        onJoinSeat={onSit}
        className="multiplayer-shell--lobby"
        contentClassName="multiplayer-shell__content--lobby"
        actions={<div className="waiting-room-actions">{action}</div>}
        loadingParticipants={loading}
      >
        <div className="multiplayer-lobby-arena" aria-label={t(lang, 'multiplayer.lobby_arena')}>
          <p>{t(lang, 'multiplayer.lobby_instruction')}</p>
        </div>
      </MultiplayerShell>
    </main>
  );
}

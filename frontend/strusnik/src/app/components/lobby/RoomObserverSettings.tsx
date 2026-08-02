'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface RoomPresenceEvent {
  roomId?: string;
  observersAllowed?: boolean;
}

interface RoomObserverSettingsProps {
  socket: { id?: string; on: (event: string, handler: (payload: unknown) => void) => void; off: (event: string, handler: (payload: unknown) => void) => void; emit: (event: string, data: Record<string, unknown>) => void } | null;
  roomId: string;
  hostId: string | null;
}

export default function RoomObserverSettings({ socket, roomId, hostId }: RoomObserverSettingsProps) {
  const { lang } = useLang();
  const [allowed, setAllowed] = useState(true);
  const isHost = Boolean(socket?.id && hostId && socket.id === hostId);

  useEffect(() => {
    if (!socket) return;
    const handlePresence = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const presence = payload as RoomPresenceEvent;
      if (presence.roomId === roomId && typeof presence.observersAllowed === 'boolean') {
        setAllowed(presence.observersAllowed);
      }
    };
    socket.on('room_presence_update', handlePresence);
    return () => socket.off('room_presence_update', handlePresence);
  }, [roomId, socket]);

  if (!isHost) return null;

  return (
    <label className="room-observer-setting">
      <input
        type="checkbox"
        checked={allowed}
        onChange={(event) => {
          const next = event.target.checked;
          setAllowed(next);
          socket?.emit('update_room_settings', { roomId, observersAllowed: next });
        }}
      />
      <span className="room-observer-setting__box" aria-hidden="true"><Eye size={14} strokeWidth={2} /></span>
      <span>{t(lang, 'create_room.toggle_observers')}</span>
    </label>
  );
}

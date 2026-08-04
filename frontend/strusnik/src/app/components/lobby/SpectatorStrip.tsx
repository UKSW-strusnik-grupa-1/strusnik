'use client';

import ObserverStrip from '@/app/components/multiplayer/ObserverStrip';
import type { ObserverModel } from '@/app/components/multiplayer/types';

export interface RoomObserver {
  userId: string;
  name: string;
  hasAvatar?: boolean;
  connected?: boolean;
  isSelf?: boolean;
}

interface SpectatorStripProps {
  observers: RoomObserver[];
  maxObservers: number;
}

function avatarUrlForObserver(observer: RoomObserver) {
  if (!observer.hasAvatar || String(observer.userId).startsWith('guest_')) return null;
  return `/api/profile/avatar/${encodeURIComponent(String(observer.userId))}`;
}

export default function SpectatorStrip({ observers, maxObservers }: SpectatorStripProps) {
  const models: ObserverModel[] = observers.map((observer) => ({
    id: String(observer.userId),
    displayName: observer.name,
    avatarUrl: avatarUrlForObserver(observer),
    isSelf: observer.isSelf,
    connection: observer.connected === false ? 'disconnected' : 'connected',
  }));

  return <ObserverStrip observers={models} maxObservers={maxObservers} collapsible={models.length > 4} />;
}

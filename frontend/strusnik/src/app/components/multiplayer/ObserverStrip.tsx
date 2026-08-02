'use client';

import { Eye, LoaderCircle, WifiOff } from 'lucide-react';
import ProfileAvatar from '@/app/components/profile/ProfileAvatar';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import type { ObserverModel } from './types';

interface ObserverStripProps {
  observers: ObserverModel[];
  maxObservers?: number;
  collapsible?: boolean;
}

export default function ObserverStrip({ observers, maxObservers, collapsible = false }: ObserverStripProps) {
  const { lang } = useLang();
  if (observers.length === 0) return null;

  const label = `${t(lang, 'multiplayer.observers')} (${observers.length}${maxObservers ? `/${maxObservers}` : ''})`;
  const content = (
    <div className="observer-strip__content">
      {observers.map((observer) => (
        <div className="observer-strip__item" key={observer.id} title={observer.displayName}>
          <ProfileAvatar avatarUrl={observer.avatarUrl} displayName={observer.displayName} />
          <span className="observer-strip__name"><bdi>{observer.isSelf ? t(lang, 'multiplayer.you') : observer.displayName}</bdi></span>
          <span className="observer-strip__connection">
            {observer.connection === 'reconnecting' ? <LoaderCircle size={13} aria-hidden="true" /> : observer.connection === 'connected' ? <Eye size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
            <span>{t(lang, observer.connection === 'connected' ? 'multiplayer.status.connected' : observer.connection === 'reconnecting' ? 'multiplayer.status.reconnecting' : 'multiplayer.status.disconnected')}</span>
          </span>
        </div>
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <details className="observer-strip observer-strip--collapsible">
        <summary>
          <Eye size={16} aria-hidden="true" />
          <span>{label}</span>
        </summary>
        {content}
      </details>
    );
  }

  return (
    <section className="observer-strip" aria-label={label}>
      <header className="observer-strip__header">
        <Eye size={16} aria-hidden="true" />
        <span>{label}</span>
      </header>
      {content}
    </section>
  );
}

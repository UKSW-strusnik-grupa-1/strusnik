'use client';

import { DoorClosed, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import MultiplayerShell from '@/app/components/multiplayer/MultiplayerShell';

interface RoomUnavailableStateProps {
  roomId: string;
  href: string;
  backLabel: string;
}

export default function RoomUnavailableState({ roomId, href, backLabel }: RoomUnavailableStateProps) {
  const { lang } = useLang();

  return (
    <main className="game-runtime-shell game-runtime-result-stage game-room-unavailable-shell" id="main-content">
      <MultiplayerShell
        stage="error"
        title={t(lang, 'common.room_unavailable.title')}
        status={t(lang, 'notifications.error')}
        className="multiplayer-state-shell"
      >
      <section
        className="game-room-unavailable-card"
        role="alert"
        aria-label={t(lang, 'common.room_unavailable.title')}
        aria-describedby="room-unavailable-description"
      >
        <div className="game-room-unavailable__icon" aria-hidden="true">
          <DoorClosed size={28} strokeWidth={1.8} />
        </div>

        <div className="game-room-unavailable__copy">
          <p id="room-unavailable-description">
            {t(lang, 'common.room_unavailable.description')}
          </p>
        </div>

        <div className="game-room-unavailable__room">
          <span>{t(lang, 'common.room_unavailable.room_id')}</span>
          <code>{roomId}</code>
        </div>

        <Link href={href} className="game-primary-button game-room-unavailable__back">
          <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
      </section>
      </MultiplayerShell>
    </main>
  );
}

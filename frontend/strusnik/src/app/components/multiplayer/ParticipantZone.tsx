'use client';

import { ArrowRight, Plus } from 'lucide-react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import ObserverStrip from './ObserverStrip';
import PlayerTile from './PlayerTile';
import type { MultiplayerStage, ObserverModel, PlayerTileModel } from './types';

interface ParticipantZoneProps {
  participants: PlayerTileModel[];
  title?: string;
  variant?: MultiplayerStage;
  layout?: 'rail' | 'grid' | 'stack';
  emptySeatIndexes?: number[];
  emptySeatLabel?: string;
  joinLabel?: string;
  onJoinSeat?: (seatIndex: number) => void;
  observers?: ObserverModel[];
  maxObservers?: number;
  observerCollapsible?: boolean;
  className?: string;
  loading?: boolean;
}

export default function ParticipantZone({
  participants,
  title,
  variant = 'active',
  layout = 'rail',
  emptySeatIndexes = [],
  emptySeatLabel,
  joinLabel,
  onJoinSeat,
  observers = [],
  maxObservers,
  observerCollapsible = false,
  className = '',
  loading = false,
}: ParticipantZoneProps) {
  const { lang } = useLang();
  const resolvedTitle = title || t(lang, 'multiplayer.participants');
  const participantCount = participants.length + emptySeatIndexes.length;
  const hasRailOverflow = participantCount > 1;
  const isLargeGroup = participantCount > 8;

  return (
    <section className={`participant-zone participant-zone--${layout} participant-zone--${variant}${isLargeGroup ? ' participant-zone--large' : ''} ${className}`.trim()} aria-label={resolvedTitle}>
      <header className="participant-zone__header">
        <h2>{resolvedTitle}</h2>
        <span className="participant-zone__count" aria-label={`${participants.length} ${t(lang, 'multiplayer.participants').toLowerCase()}`}>
          {participants.length}
        </span>
      </header>

      <div className="participant-zone__rail-wrap">
        <div className="participant-zone__list" role="list">
          {loading
            ? Array.from({ length: Math.max(2, participants.length || 2) }, (_, index) => (
              <div key={`loading-${index}`} className="player-tile player-tile--loading" role="listitem" aria-hidden="true">
                <span className="player-tile__skeleton-avatar" />
                <span className="player-tile__skeleton-copy" />
              </div>
            ))
            : participants.map((participant) => (
              <div key={participant.id} role="listitem">
                <PlayerTile model={participant} variant={variant} />
              </div>
            ))}

          {!loading && emptySeatIndexes.map((seatIndex) => (
            <div key={`empty-${seatIndex}`} role="listitem">
              <button
                type="button"
                className="participant-zone__empty-seat"
                onClick={() => onJoinSeat?.(seatIndex)}
                disabled={!onJoinSeat}
                aria-label={`${emptySeatLabel || t(lang, 'multiplayer.empty_seat')} ${seatIndex + 1}, ${joinLabel || t(lang, 'rooms.join')}`}
              >
                <span className="participant-zone__empty-icon" aria-hidden="true"><Plus size={18} /></span>
                <span>
                  <strong>{emptySeatLabel || t(lang, 'multiplayer.empty_seat')} {seatIndex + 1}</strong>
                  <small>{joinLabel || t(lang, 'rooms.join')}</small>
                </span>
              </button>
            </div>
          ))}
        </div>
        {hasRailOverflow && (
          <span className="participant-zone__scroll-cue" aria-hidden="true">
            <ArrowRight size={16} />
          </span>
        )}
      </div>

      <ObserverStrip observers={observers} maxObservers={maxObservers} collapsible={observerCollapsible} />
    </section>
  );
}

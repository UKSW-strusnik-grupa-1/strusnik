'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, LoaderCircle, RefreshCw, WifiOff } from 'lucide-react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import ParticipantZone from './ParticipantZone';
import ActionZone from './ActionZone';
import type { MultiplayerStage, ObserverModel, PlayerTileModel } from './types';

interface MultiplayerShellProps {
  stage: MultiplayerStage;
  title?: string;
  context?: ReactNode;
  status?: ReactNode;
  participants?: PlayerTileModel[];
  participantTitle?: string;
  participantLayout?: 'rail' | 'grid' | 'stack';
  emptySeatIndexes?: number[];
  emptySeatLabel?: string;
  joinLabel?: string;
  onJoinSeat?: (seatIndex: number) => void;
  observers?: ObserverModel[];
  maxObservers?: number;
  observerCollapsible?: boolean;
  actions?: ReactNode;
  aside?: ReactNode;
  chat?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  loadingParticipants?: boolean;
}

export default function MultiplayerShell({
  stage,
  title,
  context,
  status,
  participants,
  participantTitle,
  participantLayout = 'rail',
  emptySeatIndexes,
  emptySeatLabel,
  joinLabel,
  onJoinSeat,
  observers,
  maxObservers,
  observerCollapsible,
  actions,
  aside,
  chat,
  children,
  className = '',
  contentClassName = '',
  loadingParticipants = false,
}: MultiplayerShellProps) {
  const titleId = useId();
  const hasParticipants = participants !== undefined;
  const hasAside = Boolean(aside);
  const resolvedContentClassName = [
    'multiplayer-shell__content',
    !hasParticipants && !hasAside ? 'multiplayer-shell__content--solo' : '',
    contentClassName,
  ].filter(Boolean).join(' ');

  return (
    <div className={`multiplayer-shell multiplayer-shell--${stage} ${className}`.trim()} data-multiplayer-stage={stage}>
      {(title || context || status) && (
        <header className="multiplayer-shell__header">
          <div className="multiplayer-shell__context">
            {context}
            {title && <h1 id={titleId}>{title}</h1>}
          </div>
          {status && <div className="multiplayer-shell__status" role="status" aria-live="polite">{status}</div>}
        </header>
      )}

      <div className={resolvedContentClassName}>
        {hasParticipants && (
          <ParticipantZone
            participants={participants}
            title={participantTitle}
            variant={stage}
            layout={participantLayout}
            emptySeatIndexes={emptySeatIndexes}
            emptySeatLabel={emptySeatLabel}
            joinLabel={joinLabel}
            onJoinSeat={onJoinSeat}
            observers={observers}
            maxObservers={maxObservers}
            observerCollapsible={observerCollapsible}
            loading={loadingParticipants}
          />
        )}

        <section className="multiplayer-shell__arena" aria-labelledby={title ? titleId : undefined}>
          {children}
          {actions && <ActionZone className="multiplayer-shell__actions">{actions}</ActionZone>}
        </section>

        {aside && <aside className="multiplayer-shell__aside">{aside}</aside>}
      </div>

      {chat && <div className="multiplayer-shell__chat">{chat}</div>}
    </div>
  );
}

interface MultiplayerStateViewProps {
  stage: Exclude<MultiplayerStage, 'lobby' | 'active' | 'observer'>;
  title?: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

export function MultiplayerStateView({ stage, title, message, action, className = '' }: MultiplayerStateViewProps) {
  const { lang } = useLang();
  const copy = {
    loading: { title: t(lang, 'multiplayer.state.loading_title'), message: t(lang, 'multiplayer.state.loading_message'), Icon: LoaderCircle },
    empty: { title: t(lang, 'multiplayer.state.empty_title'), message: t(lang, 'multiplayer.state.empty_message'), Icon: CircleDashed },
    error: { title: t(lang, 'multiplayer.state.error_title'), message: t(lang, 'multiplayer.state.error_message'), Icon: AlertTriangle },
    reconnecting: { title: t(lang, 'multiplayer.state.reconnecting_title'), message: t(lang, 'multiplayer.state.reconnecting_message'), Icon: RefreshCw },
    disconnected: { title: t(lang, 'multiplayer.state.disconnected_title'), message: t(lang, 'multiplayer.state.disconnected_message'), Icon: WifiOff },
    finished: { title: t(lang, 'multiplayer.state.finished_title'), message: t(lang, 'multiplayer.state.finished_message'), Icon: CheckCircle2 },
  }[stage];
  const Icon = copy.Icon;

  return (
    <div className={`multiplayer-state-view multiplayer-state-view--${stage} ${className}`.trim()} data-multiplayer-stage={stage} role={stage === 'error' ? 'alert' : 'status'} aria-live="polite">
      <Icon className="multiplayer-state-view__icon" size={28} aria-hidden="true" />
      <h1>{title || copy.title}</h1>
      <p>{message || copy.message}</p>
      {action && <div className="multiplayer-state-view__action">{action}</div>}
    </div>
  );
}

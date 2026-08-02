'use client';

import { MoreHorizontal } from 'lucide-react';
import ProfileAvatar from '@/app/components/profile/ProfileAvatar';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import ParticipantStatus from './ParticipantStatus';
import type { MultiplayerStage, PlayerTileAction, PlayerTileModel } from './types';

interface PlayerTileProps {
  model: PlayerTileModel;
  variant?: MultiplayerStage;
  actions?: PlayerTileAction[];
  compact?: boolean;
  className?: string;
}

export default function PlayerTile({ model, variant = 'active', actions = [], compact = false, className = '' }: PlayerTileProps) {
  const { lang } = useLang();
  const displayName = model.isSelf && model.selfLabel ? model.selfLabel : model.displayName;
  const roleLabel = model.role === 'observer'
    ? t(lang, 'multiplayer.role.observer')
    : model.team?.label || t(lang, 'multiplayer.role.player');
  const accessibleName = `${model.displayName}${model.isSelf ? `, ${t(lang, 'multiplayer.you')}` : ''}`;
  const visibleActions = actions.filter((action) => action.label.trim());

  return (
    <article
      className={`player-tile player-tile--${variant}${compact ? ' player-tile--compact' : ''}${model.isSelf ? ' is-self' : ''}${model.connection !== 'connected' ? ' is-unavailable' : ''} ${className}`.trim()}
      aria-label={accessibleName}
      title={model.displayName}
    >
      <div className="player-tile__identity">
        <ProfileAvatar avatarUrl={model.avatarUrl} displayName={model.displayName} />
        <div className="player-tile__copy">
          <strong className="player-tile__name"><bdi>{displayName}</bdi></strong>
          <span className="player-tile__role">{roleLabel}</span>
        </div>
        {model.isSelf && <span className="player-tile__self">{t(lang, 'multiplayer.you')}</span>}
      </div>

      <ParticipantStatus model={model} />

      {model.metric && (
        <div className="player-tile__metric">
          <span>{model.metric.label}</span>
          <strong>{model.metric.value}</strong>
        </div>
      )}

      {visibleActions.length > 0 && (
        <div className="player-tile__actions" aria-label={t(lang, 'multiplayer.actions_label')}>
          {visibleActions.length === 1 ? visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                className={`player-tile__action${action.destructive ? ' is-destructive' : ''}`}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.label}
              >
                {Icon && <Icon size={15} strokeWidth={2} aria-hidden="true" />}
                <span>{action.label}</span>
              </button>
            );
          }) : (
            <details className="player-tile__menu">
              <summary aria-label={t(lang, 'multiplayer.more_actions')}>
                <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
              </summary>
              <div className="player-tile__menu-list">
                {visibleActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={action.destructive ? 'is-destructive' : undefined}
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </article>
  );
}

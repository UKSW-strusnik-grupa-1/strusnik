'use client';

import { Check, CircleDot, Eye, Flag, LoaderCircle, Wifi, WifiOff } from 'lucide-react';
import type { PlayerTileModel } from './types';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface ParticipantStatusProps {
  model: PlayerTileModel;
}

function statusFor(model: PlayerTileModel, lang: Parameters<typeof t>[0]) {
  if (model.connection === 'reconnecting') {
    return { label: t(lang, 'multiplayer.status.reconnecting'), Icon: LoaderCircle, tone: 'reconnecting' };
  }
  if (model.connection === 'disconnected') {
    return { label: t(lang, 'multiplayer.status.disconnected'), Icon: WifiOff, tone: 'disconnected' };
  }
  if (model.role === 'observer') {
    return { label: t(lang, 'multiplayer.status.observer'), Icon: Eye, tone: 'observer' };
  }
  if (model.participation === 'eliminated' || model.outcome === 'eliminated') {
    return { label: t(lang, 'multiplayer.status.eliminated'), Icon: Flag, tone: 'eliminated' };
  }
  if (model.outcome) {
    const outcomeKey = `multiplayer.outcome.${model.outcome}`;
    return { label: t(lang, outcomeKey), Icon: model.outcome === 'won' ? Check : CircleDot, tone: model.outcome };
  }
  if (model.activityLabel) {
    return { label: model.activityLabel, Icon: model.activity === 'active' ? CircleDot : Check, tone: model.activity };
  }
  switch (model.activity) {
    case 'active':
      return { label: t(lang, 'multiplayer.status.active'), Icon: CircleDot, tone: 'active' };
    case 'playing':
      return { label: t(lang, 'multiplayer.status.playing'), Icon: CircleDot, tone: 'playing' };
    case 'ready':
      return { label: t(lang, 'multiplayer.status.ready'), Icon: Check, tone: 'ready' };
    case 'not_ready':
      return { label: t(lang, 'multiplayer.status.not_ready'), Icon: CircleDot, tone: 'not_ready' };
    default:
      return { label: t(lang, 'multiplayer.status.waiting'), Icon: CircleDot, tone: 'waiting' };
  }
}

export default function ParticipantStatus({ model }: ParticipantStatusProps) {
  const { lang } = useLang();
  const { label, Icon, tone } = statusFor(model, lang);
  const ConnectionIcon = model.connection === 'connected' ? Wifi : WifiOff;
  const connectionLabel = t(lang, `multiplayer.status.${model.connection}`);

  return (
    <span className={`participant-status participant-status--${tone}`}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
      <span className="sr-only">{t(lang, 'multiplayer.status.connection_prefix')} {connectionLabel}</span>
      <ConnectionIcon size={12} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

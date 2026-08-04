import type { LucideIcon } from 'lucide-react';

export type ParticipantConnection = 'connected' | 'reconnecting' | 'disconnected';
export type ParticipantActivity = 'active' | 'playing' | 'ready' | 'not_ready' | 'waiting';
export type ParticipantOutcome = 'won' | 'lost' | 'draw' | 'eliminated' | 'finished';
export type MultiplayerStage =
  | 'lobby'
  | 'active'
  | 'observer'
  | 'loading'
  | 'empty'
  | 'error'
  | 'reconnecting'
  | 'disconnected'
  | 'finished';

export interface PlayerTileMetric {
  label: string;
  value: string;
}

export interface PlayerTileTeam {
  id: string;
  label: string;
}

export interface PlayerTileAction {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: LucideIcon;
}

/**
 * Normalized presentation data. Game adapters must build this model before it
 * reaches PlayerTile; the tile never reads a socket or game specific object.
 */
export interface PlayerTileModel {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  isSelf: boolean;
  role: 'player' | 'observer';
  team?: PlayerTileTeam;
  connection: ParticipantConnection;
  activity: ParticipantActivity;
  activityLabel?: string;
  participation?: 'eliminated';
  metric?: PlayerTileMetric;
  outcome?: ParticipantOutcome;
  selfLabel?: string;
}

export interface ObserverModel {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  isSelf?: boolean;
  connection: ParticipantConnection;
}

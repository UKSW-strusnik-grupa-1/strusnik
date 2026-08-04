"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Volume2, VolumeX, Zap } from "lucide-react";
import type { Socket } from "socket.io-client";
import HaxballCanvas from "@/app/components/haxball/HaxballCanvas";
import HaxballTouchControls from "@/app/components/haxball/HaxballTouchControls";
import ProfileAvatar from "@/app/components/profile/ProfileAvatar";
import PlayerTile from "@/app/components/multiplayer/PlayerTile";
import MultiplayerShell from "@/app/components/multiplayer/MultiplayerShell";
import type { PlayerTileModel } from "@/app/components/multiplayer/types";
import { GameChat } from "@/app/components/chat/GameChat";
import type { HaxballState, HaxballTeam } from "@/app/games/haxball/constants";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

interface HaxballMatchProps {
  socket: Socket | null;
  roomId: string;
  state: HaxballState;
  userId: string;
  userName: string;
  isHost: boolean;
  isObserver: boolean;
  onRematch: () => void;
  onBack: () => void;
  setMovement: (x: number, y: number) => void;
  triggerKick: () => void;
}

function formatClock(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function playerAvatar(userId: string) {
  return String(userId).startsWith("guest_") ? null : `/api/profile/avatar/${encodeURIComponent(String(userId))}`;
}

function readPreference(key: "haxball-sound-enabled" | "haxball-effects-enabled") {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) !== "false";
  } catch {
    return true;
  }
}

const subscribeToToolsSlot = () => () => {};
const getToolsSlot = () => document.getElementById("haxball-tools-slot");
const getServerToolsSlot = () => null;

export default function HaxballMatch({
  socket,
  roomId,
  state,
  userId,
  userName,
  isHost,
  isObserver,
  onRematch,
  onBack,
  setMovement,
  triggerKick,
}: HaxballMatchProps) {
  const { lang } = useLang();
  const [soundEnabled, setSoundEnabled] = useState(() => readPreference("haxball-sound-enabled"));
  const [effectsEnabled, setEffectsEnabled] = useState(() => readPreference("haxball-effects-enabled"));
  const previousGoalCount = useRef(state.goals.length);
  const previousEventId = useRef(state.last_event?.id ?? 0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const goalFlash = effectsEnabled && state.last_event?.type === "goal";

  const playTone = useCallback((frequency: number, duration = 0.24) => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume().catch(() => undefined);

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start();
      oscillator.stop(context.currentTime + duration + 0.02);
    } catch {
      // Audio is a progressive enhancement.
    }
  }, []);

  useEffect(() => () => {
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const mySeat = state.seats.find((seat) => seat && String(seat.userId) === String(userId));
  const clock = state.stage === "overtime" ? state.overtime_remaining_ms ?? 0 : state.remaining_ms;
  const countdown = state.countdown_ms === null ? null : Math.max(1, Math.ceil(state.countdown_ms / 1000));
  const result = state.result;
  const myTeam = mySeat?.team ?? null;
  const toolsHost = useSyncExternalStore(subscribeToToolsSlot, getToolsSlot, getServerToolsSlot);
  const tools = (
    <div className="haxball-match-tools">
      <button
        type="button"
        className="haxball-tool-button"
        aria-pressed={soundEnabled}
        aria-label={t(lang, soundEnabled ? "haxball.sound_off" : "haxball.sound_on")}
        onClick={() => setSoundEnabled((value) => !value)}
      >
        {soundEnabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="haxball-tool-button"
        aria-pressed={effectsEnabled}
        aria-label={t(lang, effectsEnabled ? "haxball.effects_off" : "haxball.effects_on")}
        onClick={() => setEffectsEnabled((value) => !value)}
      >
        <Zap size={17} aria-hidden="true" />
      </button>
    </div>
  );
  const resultTitle = !result?.winner_team
    ? t(lang, "haxball.draw")
    : result.winner_team === myTeam || isObserver
      ? result.winner_team === myTeam ? t(lang, "haxball.win") : t(lang, "haxball.game_over")
      : t(lang, "haxball.loss");

  useEffect(() => {
    try {
      window.localStorage.setItem("haxball-sound-enabled", String(soundEnabled));
      window.localStorage.setItem("haxball-effects-enabled", String(effectsEnabled));
    } catch {
      // Local preferences are optional.
    }
  }, [effectsEnabled, soundEnabled]);

  useEffect(() => {
    if (state.goals.length <= previousGoalCount.current) return;
    previousGoalCount.current = state.goals.length;
    if (soundEnabled) playTone(420, 0.32);
  }, [playTone, soundEnabled, state.goals.length]);

  useEffect(() => {
    const event = state.last_event;
    if (!event || event.id <= previousEventId.current) return;
    previousEventId.current = event.id;
    if (!soundEnabled || event.type === "goal" || event.type === "touch") return;
    playTone(event.type === "kick" ? 220 : event.type === "bounce" ? 150 : 180, event.type === "kick" ? 0.12 : 0.08);
  }, [playTone, soundEnabled, state.last_event]);

  const renderTeamPlayers = (team: HaxballTeam) => state.seats
    .filter((seat): seat is NonNullable<typeof seat> => Boolean(seat?.team === team))
    .map((player) => {
      const model: PlayerTileModel = {
        id: String(player.userId),
        displayName: player.name,
        avatarUrl: playerAvatar(player.userId),
        isSelf: String(player.userId) === String(userId),
        selfLabel: t(lang, 'multiplayer.you'),
        role: 'player',
        team: { id: team, label: team === 'red' ? t(lang, 'haxball.team_red') : t(lang, 'haxball.team_blue') },
        connection: player.connected ? 'connected' : 'disconnected',
        activity: state.stage === 'finished' ? 'waiting' : 'playing',
        activityLabel: state.stage === 'finished' ? t(lang, 'multiplayer.outcome.finished') : t(lang, 'multiplayer.status.playing'),
        metric: { label: t(lang, 'haxball.goals'), value: String(player.goals) },
      };
      return <PlayerTile key={player.userId} model={model} variant={isObserver ? 'observer' : state.stage === 'finished' ? 'finished' : 'active'} compact className={`haxball-live-player haxball-live-player--${team}`} />;
    });

  const resultReason = result?.reason.startsWith("forfeit")
    ? t(lang, "haxball.result_reason_forfeit")
    : result?.reason === "golden_goal"
      ? t(lang, "haxball.result_reason_golden_goal")
      : result?.reason === "overtime_draw"
        ? t(lang, "haxball.result_reason_overtime_draw")
        : t(lang, "haxball.result_reason_time");

  const chatId = userId || socket?.id || "guest";

  return (
    <MultiplayerShell
      stage={isObserver ? 'observer' : state.stage === 'finished' ? 'finished' : 'active'}
      className="multiplayer-active-shell multiplayer-active-shell--haxball"
      contentClassName="multiplayer-shell__content--haxball"
    >
    <section className={`haxball-match-shell${goalFlash && effectsEnabled ? " is-goal-flash" : ""}`} aria-label={t(lang, 'games.haxball')}>
      <div className="haxball-landscape-notice" role="status">
        <span aria-hidden="true">↻</span>
        <strong>{t(lang, "haxball.rotate_title")}</strong>
        <span>{t(lang, "haxball.rotate_hint")}</span>
      </div>

      <header className="haxball-match-hud">
        <div className="haxball-match-team-score haxball-match-team-score--red">
          <span>{t(lang, "haxball.team_red")}</span>
          <strong>{state.score.red}</strong>
        </div>
        <div className="haxball-match-clock" aria-live="polite">
          <span>{state.stage === "overtime" ? t(lang, "haxball.golden_goal") : t(lang, "haxball.time")}</span>
          <strong>{formatClock(clock)}</strong>
        </div>
        <div className="haxball-match-team-score haxball-match-team-score--blue">
          <strong>{state.score.blue}</strong>
          <span>{t(lang, "haxball.team_blue")}</span>
        </div>
        {toolsHost ? createPortal(tools, toolsHost) : null}
      </header>

      <section className="haxball-match-main" aria-label={t(lang, "games.haxball")}>
        <aside className="haxball-live-sidebar haxball-live-sidebar--red" aria-label={t(lang, "haxball.team_red")}>
          {renderTeamPlayers("red")}
        </aside>
        <div className="haxball-arena-stage">
          <HaxballCanvas state={state} userId={userId} label={`${t(lang, "games.haxball")}, ${t(lang, "haxball.score")}: ${state.score.red} : ${state.score.blue}`} />
          {countdown !== null && state.stage !== "finished" && (
            <div className="haxball-countdown" role="status" aria-live="assertive">
              <span>{state.stage === "overtime" ? t(lang, "haxball.golden_goal") : t(lang, "haxball.countdown")}</span>
              <strong>{state.stage === "overtime" ? "✦" : countdown}</strong>
            </div>
          )}
          {state.last_goal && state.stage !== "finished" && (
            <div className="haxball-goal-callout" role="status">
              <strong>{t(lang, "haxball.goal_by").replace("{name}", state.last_goal.scorer || t(lang, "user.guest"))}</strong>
              {state.last_goal.assist && <span>{t(lang, "haxball.assist_by").replace("{name}", state.last_goal.assist)}</span>}
            </div>
          )}
          {isObserver && <div className="haxball-observer-badge">{t(lang, "haxball.spectating")}</div>}
          {!isObserver && <HaxballTouchControls onMovement={setMovement} onKick={triggerKick} />}
        </div>
        <aside className="haxball-live-sidebar haxball-live-sidebar--blue" aria-label={t(lang, "haxball.team_blue")}>
          {renderTeamPlayers("blue")}
        </aside>
      </section>

      {state.stage === "finished" && result && (
        <div className="haxball-result-overlay">
          <section className="haxball-result-card" aria-labelledby="haxball-result-title">
            <p className="haxball-eyebrow">{t(lang, "haxball.game_over")}</p>
            <h1 id="haxball-result-title">{resultTitle}</h1>
            <div className="haxball-result-score"><span>{result.score.red}</span><b>:</b><span>{result.score.blue}</span></div>
            <p className="haxball-result-reason">{resultReason}</p>
            <div className="haxball-result-players" role="list" aria-label={t(lang, "haxball.players")}>
              {result.players.map((player) => (
                <div key={player.userId} className="haxball-result-player" role="listitem">
                  <ProfileAvatar avatarUrl={playerAvatar(player.userId)} displayName={player.name} />
                  <span>{player.name}</span>
                  <strong>{player.goals} / {player.assists}</strong>
                </div>
              ))}
            </div>
            <div className="haxball-result-actions">
              {isHost && <button type="button" className="game-primary-button" onClick={onRematch}>{t(lang, "haxball.rematch")}</button>}
              <button type="button" className="game-secondary-button" onClick={onBack}>{t(lang, "haxball.back_to_lobby")}</button>
            </div>
          </section>
        </div>
      )}

      <GameChat socket={socket} roomId={roomId} myId={chatId} myName={userName} isBubble variant="game" />
    </section>
    </MultiplayerShell>
  );
}

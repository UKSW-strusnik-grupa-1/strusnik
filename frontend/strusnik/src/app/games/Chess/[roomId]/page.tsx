'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Handshake, Play, Plus } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import PasswordModal from '@/app/components/lobby/passwordModal';
import { useSocket } from '@/app/hooks/useSocket';
import { useUser } from '@/app/hooks/useUser';
import ChessBoard from '@/app/components/chess/ChessBoard';
import { GameChat } from '@/app/components/chat/GameChat';
import { useChess } from '@/app/hooks/useChess';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';
import RoomObserverSettings from '@/app/components/lobby/RoomObserverSettings';
import MultiplayerShell from '@/app/components/multiplayer/MultiplayerShell';
import PlayerTile from '@/app/components/multiplayer/PlayerTile';
import type { PlayerTileModel } from '@/app/components/multiplayer/types';

const CHESS_BOARD_RATIO = 2048 / 1993;

function formatClock(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return '00:00';
  const clamped = Math.max(0, Math.floor(ms));
  const totalSec = Math.floor(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}

function getSeatName(seat: unknown, fallback: string) {
  if (!seat || typeof seat !== 'object') return fallback;
  const name = (seat as { name?: unknown }).name;
  return typeof name === 'string' && name.trim() ? name : fallback;
}

function getSeatAvatarUrl(seat: unknown, currentUserId: string | null, currentAvatarUrl?: string | null) {
  if (!seat || typeof seat !== 'object') return null;

  const record = seat as { userId?: unknown; avatarUrl?: unknown; avatar_url?: unknown };
  const seatUserId = record.userId;
  const savedAvatar = record.avatarUrl ?? record.avatar_url;

  if (typeof savedAvatar === 'string' && savedAvatar.trim()) return savedAvatar;
  if (!seatUserId || String(seatUserId).startsWith('guest_')) return null;
  if (currentUserId && String(seatUserId) === String(currentUserId)) return currentAvatarUrl ?? null;

  return `/api/profile/avatar/${encodeURIComponent(String(seatUserId))}`;
}

export default function ChessRoomPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;
  const searchParams = useSearchParams();
  const roomRole = searchParams.get('role') === 'observer' ? 'observer' : 'player';

  const { socket, isConnected } = useSocket();
  const { userInfo } = useUser();
  const { lang } = useLang();

  const myUserId = userInfo?.userId !== undefined && userInfo?.userId !== null ? String(userInfo.userId) : null;
  const myUsername = userInfo?.nickname ?? null;

  const chess = useChess({
    socket,
    roomId,
    userId: myUserId,
    username: myUsername,
    role: roomRole,
    onKickedToLobby: () => router.push('/lobby/chess'),
  });

  const chessShellRef = useRef<HTMLElement>(null);
  const chessLayoutRef = useRef<HTMLDivElement>(null);
  const chessBoardColumnRef = useRef<HTMLElement>(null);
  const chessBoardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 640, height: 623 });

  useEffect(() => {
    const shell = chessShellRef.current;
    const layout = chessLayoutRef.current;
    const column = chessBoardColumnRef.current;
    if (!shell || !layout || !column) return;

    const updateBoardSize = () => {
      const shellRect = shell.getBoundingClientRect();
      const boardRect = chessBoardRef.current?.getBoundingClientRect();
      const scale = shell.clientHeight > 0 ? shellRect.height / shell.clientHeight : 1;
      const columnWidth = column.clientWidth || 640;
      const boardTop = boardRect?.top ?? column.getBoundingClientRect().top;
      const paddingBottom = Number.parseFloat(getComputedStyle(shell).paddingBottom) * scale;
      const availableHeight = shellRect.bottom - boardTop - paddingBottom;
      const availableHeightInLayoutUnits = scale > 0 ? availableHeight / scale : availableHeight;
      const heightLimitedWidth = availableHeightInLayoutUnits > 0
        ? availableHeightInLayoutUnits / CHESS_BOARD_RATIO
        : columnWidth;
      const nextWidth = Math.floor(Math.max(200, Math.min(640, columnWidth, heightLimitedWidth)));

      setBoardSize((current) => current.width === nextWidth
        ? current
        : { width: nextWidth, height: Math.round(nextWidth / CHESS_BOARD_RATIO) });
    };

    updateBoardSize();
    const observer = new ResizeObserver(updateBoardSize);
    observer.observe(shell);
    observer.observe(layout);
    observer.observe(column);
    return () => observer.disconnect();
  }, [chess.gameEnded, chess.isGameStarted]);

  const isObserver = chess.isObserver;
  const topSeat = isObserver
    ? chess.seats[0]
    : chess.myColor === 'b'
      ? chess.seats[0]
      : chess.seats[1];
  const bottomSeat = isObserver
    ? chess.seats[1]
    : chess.myColor === 'b'
      ? chess.seats[1]
      : chess.seats[0];
  const topTimeMs = isObserver ? chess.whiteTimeMs : chess.opponentTimeMs;
  const bottomTimeMs = isObserver ? chess.blackTimeMs : chess.myTimeMs;
  const isOpponentTurn = chess.isGameStarted && !chess.isObserver && !chess.isMyTurn;
  const chessDisplaySeatIndexes = chess.myColor === 'b' ? [0, 1] : [1, 0];
  const chessSeatModels: PlayerTileModel[] = [
    { seat: topSeat, color: isObserver ? 'w' : chess.myColor === 'b' ? 'w' : 'b', time: topTimeMs, active: isOpponentTurn },
    { seat: bottomSeat, color: isObserver ? 'b' : chess.myColor === 'b' ? 'b' : 'w', time: bottomTimeMs, active: chess.isMyTurn },
  ].map(({ seat, color, time, active }, index) => {
    const player = seat && typeof seat === 'object' ? seat as { userId?: unknown; socketId?: unknown; connected?: boolean; avatarUrl?: string | null; avatar_url?: string | null } : null;
    const isSelf = Boolean(player?.userId && String(player.userId) === String(myUserId));
    const outcome = !chess.gameEnded
      ? undefined
      : isObserver
        ? 'finished' as const
        : chess.endTitle === t(lang, 'chess.end.draw')
          ? 'draw' as const
          : chess.endTitle === t(lang, 'chess.end.win')
            ? isSelf ? 'won' as const : 'lost' as const
            : isSelf ? 'lost' as const : 'won' as const;
    return {
      id: String(player?.userId ?? player?.socketId ?? `chess-seat-${index}`),
      displayName: getSeatName(seat, t(lang, 'multiplayer.empty_seat')),
      avatarUrl: getSeatAvatarUrl(seat, myUserId, userInfo?.avatarUrl),
      isSelf,
      selfLabel: t(lang, 'chess.you'),
      role: 'player' as const,
      team: { id: color, label: t(lang, color === 'w' ? 'rooms.chess_color.white' : 'rooms.chess_color.black') },
      connection: player?.connected === false ? 'disconnected' as const : 'connected' as const,
      activity: active ? 'active' as const : chess.isGameStarted ? 'playing' as const : 'waiting' as const,
      activityLabel: active ? t(lang, 'chess.hint.active') : chess.isGameStarted ? t(lang, 'chess.hint.waiting_opponent') : t(lang, 'chess.hint.waiting_opponent'),
      metric: { label: t(lang, 'chess.clock'), value: formatClock(time) },
      outcome,
    };
  });

  const bottomLeftLabel = useMemo(() => {
    if (chess.drawUiState === 'offered_to_me') return t(lang, 'chess.accept');
    if (chess.drawUiState === 'offered_by_me') return t(lang, 'chess.proposed');
    return t(lang, 'chess.draw');
  }, [chess.drawUiState, lang]);

  const bottomRightLabel = useMemo(() => {
    if (chess.drawUiState === 'offered_to_me') return t(lang, 'chess.decline');
    return t(lang, 'chess.surrender');
  }, [chess.drawUiState, lang]);

  const chessIsHost = Boolean(socket?.id && chess.hostId && socket.id === chess.hostId);
  const chessCanStart = chess.seats.every((seat) => seat && seat.connected !== false);

  const handleBottomLeft = () => {
    if (!chess.isGameStarted || chess.isObserver) return;
    if (chess.drawUiState === 'offered_to_me') chess.acceptDraw();
    else if (chess.drawUiState === 'none') chess.proposeDraw();
  };

  const handleBottomRight = () => {
    if (!chess.isGameStarted || chess.isObserver) return;
    if (chess.drawUiState === 'offered_to_me') chess.declineDraw();
    else chess.resign();
  };

  const showToast = (!socket || !isConnected) || !!chess.joinError;
  const toastText = !socket || !isConnected ? t(lang, 'chess.loading') : chess.joinError;
  const chatUserId = myUserId ?? socket?.id ?? 'guest';
  const chatUserName = myUsername ?? t(lang, 'multiplayer.role.player');
  const chessPlayerVariant = chess.gameEnded
    ? 'finished'
    : isObserver
      ? 'observer'
      : chess.isGameStarted
        ? 'active'
        : 'lobby';
  const isChessWaiting = !chess.isGameStarted && !chess.gameEnded;
  const waitingSeatModels = chessSeatModels.map((model) => ({
    ...model,
    activity: 'waiting' as const,
    activityLabel: t(lang, 'chess.hint.waiting_opponent'),
    metric: undefined,
  }));

  const renderChessPlayerSlot = (model: PlayerTileModel, displayIndex: number, compact = true) => {
    const seatIndex = chessDisplaySeatIndexes[displayIndex];
    const teamLabel = model.team?.label || t(lang, 'multiplayer.role.player');

    if (!model.id.startsWith('chess-seat-')) {
      return <PlayerTile model={model} variant={chessPlayerVariant} compact={compact} className="chess-player-slot__tile" />;
    }

    return (
      <button
        type="button"
        className="participant-zone__empty-seat chess-player-slot__empty"
        disabled={isObserver || !socket}
        onClick={() => socket?.emit('sit_down', { roomId, seatIndex, playerName: myUsername ?? t(lang, 'user.guest') })}
        aria-label={`${teamLabel}, ${t(lang, 'multiplayer.empty_seat')}, ${t(lang, 'rooms.join')}`}
      >
        <span className="participant-zone__empty-icon" aria-hidden="true"><Plus size={18} /></span>
        <span>
          <strong>{t(lang, 'multiplayer.empty_seat')}</strong>
          <small>{teamLabel} · {t(lang, 'rooms.join')}</small>
        </span>
      </button>
    );
  };

  return (
    <main ref={chessShellRef} id="main-content" className="game-runtime-shell game-runtime-shell--chess chess-room-shell">
      <div className="chess-room-backdrop" aria-hidden="true" />

      <ReturnArrow
        href="/lobby/chess"
        text={t(lang, 'arrow')}
        onClick={() => chess.leaveRoom()}
        confirmMessage={chess.isGameStarted && !chess.gameEnded ? t(lang, 'common.leave_active_confirm') : undefined}
      />

      <PasswordModal
        isOpen={chess.passwordModalOpen}
        gameName="chess"
        errorMessage={chess.passwordModalMessage}
        onSubmit={(pwd) => chess.submitJoinPassword(pwd)}
        onClose={() => chess.closePasswordModal()}
      />

      <MultiplayerShell
        stage={chess.gameEnded ? 'finished' : !socket ? 'loading' : !isConnected ? 'reconnecting' : chess.opponentDisconnected ? 'disconnected' : chess.isObserver ? 'observer' : chess.isGameStarted ? 'active' : 'lobby'}
        title={isChessWaiting ? t(lang, 'games.chess') : undefined}
        status={isChessWaiting ? (chess.isObserver ? t(lang, 'multiplayer.status.observer') : !socket ? t(lang, 'chess.loading') : !isConnected ? t(lang, 'common.waiting_reconnect') : chess.waitingHint) : undefined}
        className={`multiplayer-active-shell multiplayer-active-shell--chess${isChessWaiting ? ' multiplayer-active-shell--chess-waiting' : ''}`}
      >
        {isChessWaiting ? (
          <section className="chess-waiting-room" aria-label={t(lang, 'multiplayer.lobby_arena')}>
            <div className="chess-waiting-room__players" role="list" aria-label={t(lang, 'multiplayer.participants')}>
              <div className="chess-waiting-room__slot chess-player-slot chess-player-slot--top" role="listitem">
                {renderChessPlayerSlot(waitingSeatModels[0], 0, false)}
              </div>
              <div className="chess-waiting-room__slot chess-player-slot chess-player-slot--bottom" role="listitem">
                {renderChessPlayerSlot(waitingSeatModels[1], 1, false)}
              </div>
            </div>

            <div className="chess-waiting-room__message">
              <p>{t(lang, 'multiplayer.lobby_instruction')}</p>
              <strong>{chess.waitingHint}</strong>
            </div>

            <div className="chess-waiting-room__controls">
              {chessIsHost ? (
                <button
                  type="button"
                  disabled={!chessCanStart}
                  onClick={() => socket?.emit('start_game', { roomId })}
                  className="chess-side-action chess-side-action--primary"
                >
                  <Play size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{t(lang, 'chess.hint.start_game')}</span>
                </button>
              ) : (
                <div className="chess-side-waiting-message">{t(lang, 'chess.hint.waiting_host')}</div>
              )}

              <RoomObserverSettings socket={socket} roomId={roomId ?? ''} hostId={chess.hostId} />
            </div>
          </section>
        ) : (
          <div ref={chessLayoutRef} className="chess-room-layout chess-room-layout--active">
            <aside className="chess-active-player-rail" aria-label={t(lang, 'multiplayer.participants')}>
              <div role="list">
                <div className="chess-active-player-rail__slot" role="listitem">
                  {renderChessPlayerSlot(chessSeatModels[0], 0)}
                </div>
                <div className="chess-active-player-rail__slot" role="listitem">
                  {renderChessPlayerSlot(chessSeatModels[1], 1)}
                </div>
              </div>
            </aside>

            <section
              ref={chessBoardColumnRef}
              className="chess-board-column chess-board-column--active"
              aria-label={t(lang, 'games.chess')}
              style={{ width: `min(100%, ${boardSize.width}px)` }}
            >
              <div ref={chessBoardRef} className="game-runtime-chess-board-holder chess-board-holder relative">
                <ChessBoard
                  width={boardSize.width}
                  height={boardSize.height}
                  fen={chess.fen}
                  myColor={chess.myColor}
                  isGameStarted={chess.isGameStarted}
                  isMyTurn={chess.isMyTurn}
                  legalMovesBySquare={chess.legalMovesBySquare}
                  onMove={(from, to, promotion) => chess.makeMove(from, to, promotion)}
                />

                {chess.gameEnded && (
                  <div className="chess-result-overlay">
                    <div className="chess-result-card" role="dialog" aria-labelledby="chess-result-title" aria-describedby="chess-result-subtitle">
                      <p className="chess-result-kicker">{t(lang, 'chess.end.game_over')}</p>
                      <h2 id="chess-result-title">{chess.endTitle}</h2>
                      <p id="chess-result-subtitle">{chess.endSubtitle}</p>
                      <button type="button" onClick={() => router.push('/lobby/chess')} className="chess-side-action chess-side-action--primary">
                        {t(lang, 'chess.back')}
                      </button>
                    </div>
                  </div>
                )}

                {chess.opponentDisconnected && !chess.gameEnded && (
                  <OpponentDisconnectedBanner
                    name={chess.opponentDisconnected.name}
                    timeLeft={chess.opponentDisconnected.timeLeft}
                  />
                )}
              </div>
            </section>

            <aside className="chess-side-panel" aria-label={t(lang, 'games.chess')}>
              {chess.isGameStarted && !chess.gameEnded && !chess.isObserver ? (
                <div className="chess-side-controls">
                  <button
                    type="button"
                    onClick={handleBottomLeft}
                    disabled={chess.bottomButtonsLocked || chess.drawUiState === 'offered_by_me'}
                    className="chess-side-action"
                  >
                    <Handshake size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{bottomLeftLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBottomRight}
                    disabled={chess.bottomButtonsLocked}
                    className="chess-side-action chess-side-action--danger"
                  >
                    <Flag size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{bottomRightLabel}</span>
                  </button>
                </div>
              ) : null}
            </aside>
          </div>
        )}
      </MultiplayerShell>

      <GameChat
        socket={socket}
        roomId={roomId ?? ''}
        myId={chatUserId}
        myName={chatUserName}
        isBubble
        variant="game"
      />

      {showToast && (
        <div className="chess-connection-toast" role="status" aria-live="polite">
          {toastText}
        </div>
      )}
    </main>
  );
}

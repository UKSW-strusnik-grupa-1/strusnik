'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useLang, type Lang } from '@/app/lang';
import type { Socket } from 'socket.io-client';
import { t } from '@/app/i18n';

type Color = 'w' | 'b';

interface ChessSeat {
  userId?: string;
  socketId?: string;
  name?: string;
  connected?: boolean;
  avatarUrl?: string | null;
  avatar_url?: string | null;
}

type Seats = [ChessSeat | null, ChessSeat | null];

interface ChessResult {
  reason?: unknown;
  status?: unknown;
  winner?: Color | null;
}

interface JoinResponse {
  success?: boolean;
  role?: 'player' | 'observer';
  room_data?: { host_id?: string; time_control_min?: number; time_min?: number };
  error_code?: string;
  message?: string;
}

interface ChessGameState {
  stage?: string;
  seats?: (ChessSeat | null)[];
  fen?: string;
  turn?: string;
  timeControlMin?: number;
  clocks?: { w?: number | null; b?: number | null };
  draw?: { offeredBy?: Color | null };
  draw_offer_by?: Color | null;
  ended?: boolean;
  result?: ChessResult | null;
  lastClientMoveId?: string;
}

interface ChessSocketError {
  msg?: unknown;
}

interface OpponentDisconnectPayload {
  playerName?: string;
  waitTime?: number;
}

type DrawUiState = 'none' | 'offered_by_me' | 'offered_to_me';

type UseChessArgs = {
  socket: Socket | null;
  roomId: string | undefined;
  userId: string | null;
  username: string | null;
  role?: 'player' | 'observer';
  onKickedToLobby?: (msg?: string) => void;
};

function normalizeStage(stage: string | undefined): 'waiting' | 'active' | 'ended' {
  const s = String(stage || '').toLowerCase();
  if (s.includes('active')) return 'active';
  if (s.includes('ended')) return 'ended';
  return 'waiting';
}

function defaultInitialMsFromRoom(roomTimeMin: number | null): number {
  const m = roomTimeMin ?? 10;
  return Math.max(1, m) * 60 * 1000;
}

function computeMyColorFromSeats(seats: Seats, userId: string | null): Color | null {
  if (!userId) return null;
  const s0 = seats?.[0];
  const s1 = seats?.[1];
  if (s0 && String(s0.userId) === String(userId)) return 'w';
  if (s1 && String(s1.userId) === String(userId)) return 'b';
  return null;
}

function deriveEndText(
  lang: Lang,
  myColor: Color | null,
  result: ChessResult | null
): { title: string; subtitle: string } {
  if (!result) return { title: t(lang, 'chess.end.game_over'), subtitle: '' };

  const reason = String(result.reason || result.status || '').toLowerCase();
  const winner = (result.winner as Color | null) ?? null;

  if (result.status === 'draw' || reason.includes('draw') || reason.includes('remis')) {
    return { title: t(lang, 'chess.end.draw'), subtitle: t(lang, 'chess.end.agreement') };
  }
  if (reason.includes('stalemate')) return { title: t(lang, 'chess.end.draw'), subtitle: t(lang, 'chess.end.stalemate') };
  if (reason.includes('insufficient')) {
    return { title: t(lang, 'chess.end.draw'), subtitle: t(lang, 'chess.end.insufficient_material') };
  }

  if (reason.includes('timeout')) {
    if (!winner || !myColor) return { title: t(lang, 'chess.end.game_over'), subtitle: t(lang, 'chess.end.time') };
    return winner === myColor
      ? { title: t(lang, 'chess.end.win'), subtitle: t(lang, 'chess.end.opponent_time_out') }
      : { title: t(lang, 'chess.end.lose'), subtitle: t(lang, 'chess.end.you_time_out') };
  }

  if (reason.includes('resign')) {
    if (!winner || !myColor) return { title: t(lang, 'chess.end.game_over'), subtitle: t(lang, 'chess.end.resignation') };
    return winner === myColor
      ? { title: t(lang, 'chess.end.win'), subtitle: t(lang, 'chess.end.opponent_resigned') }
      : { title: t(lang, 'chess.end.lose'), subtitle: t(lang, 'chess.end.you_resigned') };
  }

  if (reason.includes('checkmate') || reason.includes('mat')) {
    if (!winner || !myColor) return { title: t(lang, 'chess.end.checkmate'), subtitle: t(lang, 'chess.end.game_over') };
    return winner === myColor
      ? { title: t(lang, 'chess.end.win'), subtitle: t(lang, 'chess.end.mate') }
      : { title: t(lang, 'chess.end.lose'), subtitle: t(lang, 'chess.end.mate') };
  }

  return { title: t(lang, 'chess.end.game_over'), subtitle: String(result.reason || result.status || '') };
}

export function useChess({ socket, roomId, userId, username, role = 'player', onKickedToLobby }: UseChessArgs) {
  const { lang } = useLang();
  const gameName = 'chess';

  const [hostId, setHostId] = useState<string | null>(null);
  const [seats, setSeats] = useState<Seats>([null, null]);
  const [stage, setStage] = useState<'waiting' | 'active' | 'ended'>('waiting');

  const [fen, setFen] = useState<string>('start');
  const [turn, setTurn] = useState<Color>('w');

  const [roomTimeMin, setRoomTimeMin] = useState<number | null>(10);
  const [whiteTimeMs, setWhiteTimeMs] = useState<number | null>(null);
  const [blackTimeMs, setBlackTimeMs] = useState<number | null>(null);

  const [drawUiState, setDrawUiState] = useState<DrawUiState>('none');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordModalMessage, setPasswordModalMessage] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isObserver, setIsObserver] = useState(role === 'observer');

  const [gameEnded, setGameEnded] = useState(false);
  const [endTitle, setEndTitle] = useState(t(lang, 'chess.end.game_over'));
  const [endSubtitle, setEndSubtitle] = useState('');

  const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string; timeLeft: number } | null>(null);

  const pendingMoveRef = useRef<{ prevFen: string; clientMoveId: string } | null>(null);
  const hasJoinedRoomRef = useRef<boolean>(false);

  const lastTickRef = useRef<number>(0);

  const myColor: Color | null = useMemo(() => computeMyColorFromSeats(seats, userId), [seats, userId]);

  const isGameStarted = stage === 'active';
  const isMyTurn = isGameStarted && !!myColor && turn === myColor && !gameEnded;

  const opponentTimeMs = useMemo(() => {
    if (!myColor) return null;
    return myColor === 'w' ? blackTimeMs : whiteTimeMs;
  }, [myColor, whiteTimeMs, blackTimeMs]);

  const myTimeMs = useMemo(() => {
    if (!myColor) return null;
    return myColor === 'w' ? whiteTimeMs : blackTimeMs;
  }, [myColor, whiteTimeMs, blackTimeMs]);

  const bottomButtonsLocked = useMemo(() => {
    return !!joinError || stage === 'ended';
  }, [joinError, stage]);

  const legalMovesBySquare: Record<string, string[]> = useMemo(() => {
    try {
      const chess = fen === 'start' ? new Chess() : new Chess(fen);

      const moves = chess.moves({ verbose: true });

      const map: Record<string, string[]> = {};
      for (const m of moves) {
        const from = String(m.from);
        const to = String(m.to);

        if (!map[from]) map[from] = [];
        if (!map[from].includes(to)) map[from].push(to);
      }

      return map;
    } catch {
      return {};
    }
  }, [fen]);

  const emitJoin = (pwd?: string) => {
    if (!socket || !roomId) return;
    setJoinError(null);
    socket.emit('join_room', {
      game_name: gameName,
      room_id: roomId,
      password: pwd || undefined,
      userToken: userId ?? undefined,
      role,
    });
  };

  const submitJoinPassword = (pwd: string) => {
    setPasswordModalOpen(false);
    emitJoin(pwd);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
  };

  const makeMove = (from: string, to: string, promotion?: string) => {
    if (!socket || !roomId) return;
    if (!isMyTurn) return;

    const clientMoveId = String(Date.now()) + '_' + Math.random().toString(16).slice(2);

    try {
      const chess = fen === 'start' ? new Chess() : new Chess(fen);
      const prevFen = chess.fen();

      const move: { from: string; to: string; promotion?: string } = { from, to };
      if (promotion) move.promotion = promotion;

      const res = chess.move(move);
      if (!res) return;

      pendingMoveRef.current = { prevFen, clientMoveId };
      setFen(chess.fen());
      setTurn(chess.turn() === 'b' ? 'b' : 'w');

      socket.emit('player_move', {
        roomId,
        move: { type: 'move', from, to, promotion, clientMoveId },
      });
    } catch {

    }
  };

  const proposeDraw = () => {
    if (!socket || !roomId) return;
    socket.emit('player_move', { roomId, move: { type: 'draw_offer' } });
  };

  const acceptDraw = () => {
    if (!socket || !roomId) return;
    socket.emit('player_move', { roomId, move: { type: 'draw_accept' } });
  };

  const declineDraw = () => {
    if (!socket || !roomId) return;
    socket.emit('player_move', { roomId, move: { type: 'draw_decline' } });
  };

  const resign = () => {
    if (!socket || !roomId) return;
    socket.emit('player_move', { roomId, move: { type: 'resign' } });
  };

  const leaveRoom = () => {
    if (!socket || !roomId || !hasJoinedRoomRef.current) return;
    hasJoinedRoomRef.current = false;
    socket.emit('leave_room', { roomId });
  };

  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    const onJoinResponse = (payload: JoinResponse) => {
      if (!payload) return;
      if (payload.success) {
        const rd = payload.room_data || {};
        setHostId(rd.host_id ?? null);
        setIsObserver(payload.role === 'observer');
        hasJoinedRoomRef.current = true;

        const tMin = rd.time_control_min ?? rd.time_min;
        if (tMin !== undefined && tMin !== null) {
          const m = Number(tMin);
          if (!Number.isNaN(m)) setRoomTimeMin(m);
        }

        setPasswordModalOpen(false);
        setPasswordModalMessage('');
        setJoinError(null);
        return;
      }

      const code = String(payload.error_code || '');
      const msg = String(payload.message || t(lang, 'chess.error.connection'));

      if (code === 'PASSWORD_REQUIRED') {
        setPasswordModalOpen(true);
        setPasswordModalMessage(msg);
        return;
      }

      setJoinError(msg);

      const lower = msg.toLowerCase();
      if (lower.includes('nie istnieje') || lower.includes('usuniety')) {
        onKickedToLobby?.(msg);
      }
    };

    const onGameState = (state: ChessGameState) => {
      if (!state) return;

      if (state.stage) setStage(normalizeStage(state.stage));

      let nextSeats: Seats = seats;
      if (Array.isArray(state.seats)) {
        nextSeats = [state.seats[0] ?? null, state.seats[1] ?? null];
        setSeats(nextSeats);
      }

      if (state.fen) setFen(state.fen === 'start' ? 'start' : String(state.fen));
      if (state.turn) setTurn(String(state.turn) === 'b' ? 'b' : 'w');

      if (state.timeControlMin !== undefined && state.timeControlMin !== null) {
        const m = Number(state.timeControlMin);
        if (!Number.isNaN(m)) setRoomTimeMin(m);
      }

      if (state.clocks) {
        const w = state.clocks.w;
        const b = state.clocks.b;
        setWhiteTimeMs(w === null || w === undefined ? null : Number(w));
        setBlackTimeMs(b === null || b === undefined ? null : Number(b));
      }

      const localMyColor = computeMyColorFromSeats(nextSeats, userId);

      const offeredBy = state.draw?.offeredBy ?? state.draw_offer_by ?? null;
      if (!offeredBy) setDrawUiState('none');
      else if (localMyColor && offeredBy === localMyColor) setDrawUiState('offered_by_me');
      else setDrawUiState('offered_to_me');


      if (nextSeats && localMyColor && normalizeStage(state.stage) === 'active') {
        const opponentSeatIdx = localMyColor === 'w' ? 1 : 0;
        const opponentSeat = nextSeats[opponentSeatIdx];
        if (opponentSeat) {
          if (opponentSeat.connected === true || opponentSeat.connected === undefined) {
            setOpponentDisconnected(null);
          } else if (opponentSeat.connected === false) {
            setOpponentDisconnected((prev) => {
              if (prev !== null) return prev;
              return { name: opponentSeat.name || 'OPPONENT', timeLeft: 60 };
            });
          }
        }
      }

      if (state.ended || state.stage === 'ended') {
        setGameEnded(true);
        const txt = deriveEndText(lang, localMyColor, state.result ?? null);
        setEndTitle(txt.title);
        setEndSubtitle(txt.subtitle);
      } else {
        setGameEnded(false);
      }

      if (pendingMoveRef.current && state.lastClientMoveId) {
        if (String(state.lastClientMoveId) === String(pendingMoveRef.current.clientMoveId)) {
          pendingMoveRef.current = null;
        }
      }
    };

    const onError = (payload: ChessSocketError) => {
      const msg = String(payload?.msg || t(lang, 'chess.error.generic'));
      if (pendingMoveRef.current) {
        setFen(pendingMoveRef.current.prevFen);
        pendingMoveRef.current = null;
        socket.emit('sync_state', { roomId });
      }
      console.error('chess socket error:', msg);
    };

    const onOpponentDisconnected = (data: OpponentDisconnectPayload) => {
      if (data.playerName) {
        setOpponentDisconnected({ name: data.playerName, timeLeft: data.waitTime || 90 });
      }
    };

    const onOpponentReconnected = () => {
      setOpponentDisconnected(null);
    };

    const onOpponentReturned = () => {

      setOpponentDisconnected(null);
    };

    const onGameEndedTimeout = () => {
      setOpponentDisconnected(null);
      onKickedToLobby?.('Przeciwnik opuscil gre');
    };

    socket.off('join_room_response', onJoinResponse);
    socket.off('game_state_update', onGameState);
    socket.off('error', onError);
    socket.off('opponent_disconnected', onOpponentDisconnected);
    socket.off('opponent_reconnected', onOpponentReconnected);
    socket.off('opponent_returned', onOpponentReturned);
    socket.off('game_ended_timeout', onGameEndedTimeout);

    socket.on('join_room_response', onJoinResponse);
    socket.on('game_state_update', onGameState);
    socket.on('error', onError);
    socket.on('opponent_disconnected', onOpponentDisconnected);
    socket.on('opponent_reconnected', onOpponentReconnected);
    socket.on('opponent_returned', onOpponentReturned);
    socket.on('game_ended_timeout', onGameEndedTimeout);

    const autoJoin = new URLSearchParams(window.location.search).get('autojoin');
    const password = new URLSearchParams(window.location.search).get('password') || undefined;
    const joinTimer = window.setTimeout(() => emitJoin(autoJoin ? password : undefined), 0);
    lastTickRef.current = Date.now();

    return () => {
      window.clearTimeout(joinTimer);
      socket.off('join_room_response', onJoinResponse);
      socket.off('game_state_update', onGameState);
      socket.off('error', onError);
      socket.off('opponent_disconnected', onOpponentDisconnected);
      socket.off('opponent_reconnected', onOpponentReconnected);
      socket.off('opponent_returned', onOpponentReturned);
      socket.off('game_ended_timeout', onGameEndedTimeout);
    };
  }, [socket, roomId, userId, lang, role]);

  useEffect(() => {
    if (stage !== 'active') return;
    const initMs = defaultInitialMsFromRoom(roomTimeMin);
    const timer = window.setTimeout(() => {
      if (whiteTimeMs === null) setWhiteTimeMs(initMs);
      if (blackTimeMs === null) setBlackTimeMs(initMs);
    }, 0);
    lastTickRef.current = Date.now();
    return () => window.clearTimeout(timer);
  }, [stage, roomTimeMin, whiteTimeMs, blackTimeMs]);

  useEffect(() => {
    if (stage !== 'active') return;
    if (gameEnded) return;
    if (opponentDisconnected) return;
    if (!roomTimeMin) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const last = lastTickRef.current || now;
      const dt = Math.max(0, now - last);
      lastTickRef.current = now;

      if (whiteTimeMs === null || blackTimeMs === null) return;

      if (turn === 'w') setWhiteTimeMs((v) => (v === null ? v : Math.max(0, v - dt)));
      else setBlackTimeMs((v) => (v === null ? v : Math.max(0, v - dt)));
    }, 250);

    return () => window.clearInterval(interval);
  }, [stage, gameEnded, opponentDisconnected, roomTimeMin, turn, whiteTimeMs, blackTimeMs]);


  useEffect(() => {
    if (!opponentDisconnected) return;

    const interval = setInterval(() => {
      setOpponentDisconnected((prev) => {
        if (!prev || prev.timeLeft <= 1) return null;
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [opponentDisconnected?.name]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleBeforeUnload = () => {
      if (hasJoinedRoomRef.current) {
        hasJoinedRoomRef.current = false;
        socket.emit('leave_room', { roomId });
      }
    };

    const handlePopState = () => {
      if (hasJoinedRoomRef.current) {
        hasJoinedRoomRef.current = false;
        socket.emit('leave_room', { roomId });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      if (hasJoinedRoomRef.current) {
        socket.emit('leave_room', { roomId });
        hasJoinedRoomRef.current = false;
      }
    };
  }, [socket, roomId]);

  const waitingHint = useMemo(() => {
    if (stage === 'ended') return t(lang, 'chess.hint.ended');
    if (stage === 'active') return t(lang, 'chess.hint.active');
    const bothSeated = !!seats?.[0] && !!seats?.[1];
    if (!bothSeated) return t(lang, 'chess.hint.waiting_opponent');
    return t(lang, 'chess.hint.starting');
  }, [stage, seats, lang]);

  return {
    fen,
    myColor,
    isMyTurn,
    isGameStarted,
    stage,

    legalMovesBySquare,

    myTimeMs,
    opponentTimeMs,
    whiteTimeMs,
    blackTimeMs,

    drawUiState,
    bottomButtonsLocked,
    isObserver,
    hostId,
    seats,

    waitingHint,

    passwordModalOpen,
    passwordModalMessage,
    joinError,

    gameEnded,
    endTitle,
    endSubtitle,

    opponentDisconnected,

    submitJoinPassword,
    closePasswordModal,

    makeMove,

    proposeDraw,
    acceptDraw,
    declineDraw,

    resign,
    leaveRoom,
  };
}
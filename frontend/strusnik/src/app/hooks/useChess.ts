'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

type Color = 'w' | 'b';
type Seats = [any | null, any | null];

type DrawUiState = 'none' | 'offered_by_me' | 'offered_to_me';

type UseChessArgs = {
  socket: any;
  roomId: string | undefined;
  userId: string | null;
  username: string | null;
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
  const s0 = seats?.[0] as any;
  const s1 = seats?.[1] as any;
  if (s0 && String(s0.userId) === String(userId)) return 'w';
  if (s1 && String(s1.userId) === String(userId)) return 'b';
  return null;
}

function deriveEndText(
  lang: any,
  myColor: Color | null,
  result: any
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

export function useChess({ socket, roomId, userId, username, onKickedToLobby }: UseChessArgs) {
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

  const [gameEnded, setGameEnded] = useState(false);
  const [endTitle, setEndTitle] = useState(t(lang, 'chess.end.game_over'));
  const [endSubtitle, setEndSubtitle] = useState('');

  const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string; timeLeft: number } | null>(null);

  const pendingMoveRef = useRef<{ prevFen: string; clientMoveId: string } | null>(null);

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

      const moves = chess.moves({ verbose: true }) as any[];

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

      const move: any = { from, to };
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
    if (!socket || !roomId) return;
    socket.emit('leave_room', { roomId });
  };

  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    const onJoinResponse = (payload: any) => {
      if (!payload) return;
      if (payload.success) {
        const rd = payload.room_data || {};
        setHostId(rd.host_id ?? null);

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

    const onGameState = (state: any) => {
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
          if (opponentSeat.connected === true) {

            setOpponentDisconnected(null);
          } else if (opponentSeat.connected === false) {

            setOpponentDisconnected((prev) => {
              if (prev !== null) return prev;
              return { name: opponentSeat.name || 'OPPONENT', timeLeft: 90 };
            });
          }
        }
      }

      if (state.ended || state.stage === 'ended') {
        setGameEnded(true);
        const txt = deriveEndText(lang, localMyColor, state.result);
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

    const onError = (payload: any) => {
      const msg = String(payload?.msg || t(lang, 'chess.error.generic'));
      if (pendingMoveRef.current) {
        setFen(pendingMoveRef.current.prevFen);
        pendingMoveRef.current = null;
        socket.emit('sync_state', { roomId });
      }
      console.error('chess socket error:', msg);
    };

    const onOpponentDisconnected = (data: any) => {
      if (data.playerName) {
        setOpponentDisconnected({ name: data.playerName, timeLeft: data.waitTime || 90 });
      }
    };

    const onOpponentReconnected = (_data: any) => {
      setOpponentDisconnected(null);
    };

    const onOpponentReturned = (_data: any) => {

      setOpponentDisconnected(null);
    };

    const onGameEndedTimeout = () => {
      setOpponentDisconnected(null);
      onKickedToLobby?.('Przeciwnik opuścił grę');
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

    emitJoin('');
    lastTickRef.current = Date.now();

    return () => {
      socket.off('join_room_response', onJoinResponse);
      socket.off('game_state_update', onGameState);
      socket.off('error', onError);
      socket.off('opponent_disconnected', onOpponentDisconnected);
      socket.off('opponent_reconnected', onOpponentReconnected);
      socket.off('opponent_returned', onOpponentReturned);
      socket.off('game_ended_timeout', onGameEndedTimeout);
    };
  }, [socket, roomId, userId, lang]);

  useEffect(() => {
    if (stage !== 'active') return;
    const initMs = defaultInitialMsFromRoom(roomTimeMin);
    if (whiteTimeMs === null) setWhiteTimeMs(initMs);
    if (blackTimeMs === null) setBlackTimeMs(initMs);
    lastTickRef.current = Date.now();
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

    drawUiState,
    bottomButtonsLocked,

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
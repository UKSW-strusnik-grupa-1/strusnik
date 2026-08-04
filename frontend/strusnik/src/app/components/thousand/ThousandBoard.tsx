'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from "@/app/hooks/useSocket";
import { useSearchParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import WaitingRoom from './WaitingRoom';
import Game from './Game';
import PasswordModal from '../lobby/passwordModal';
import { GameChat } from '@/app/components/chat/GameChat';
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';
import RoomUnavailableState from '@/app/components/common/RoomUnavailableState';
import GameRulesBubble from './GameRulesBubble';
import MultiplayerShell from '@/app/components/multiplayer/MultiplayerShell';

interface ThousandBoardProps {
  gameName: string;
  roomId: string;
  myId: string;
  myName: string;
}

interface ThousandSeat {
  socketId: string;
  userId: string;
  name: string;
  score: number;
  connected?: boolean;
  avatarUrl?: string | null;
  avatar_url?: string | null;
}

interface ThousandGameState {
  stage?: string;
  seats?: (ThousandSeat | null)[];
  my_hand?: string[];
}

interface JoinRoomResponse {
  success?: boolean;
  room_data?: { host_id?: string; max_players?: number };
  error_code?: string;
  message?: string;
}

interface OpponentDisconnectPayload {
  playerName?: string;
  waitTime?: number;
}

export default function ThousandBoard({ gameName, roomId, myId, myName }: ThousandBoardProps) {
  const { socket } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();

  const autoJoinAttempted = useRef(false);
  const hasJoinedRoomRef = useRef(false);

  const [gameStage, setGameStage] = useState<string>("waiting_for_players");
  const [seats, setSeats] = useState<(ThousandSeat | null)[]>([null, null, null, null]);
  const [myHand, setMyHand] = useState<string[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string; timeLeft: number } | null>(null);

  const { lang } = useLang();

  const joinRoom = (pwd: string = "") => {
    if (!socket) return;
    if (!roomId) return;

    socket.emit('join_room', {
      game_name: gameName,
      room_id: roomId,
      password: pwd,
      role: searchParams.get('role') === 'observer' ? 'observer' : 'player'
    });
  };

  const leaveRoom = () => {
    if (!socket || !roomId || !hasJoinedRoomRef.current) return;
    hasJoinedRoomRef.current = false;
    socket.emit('leave_room', { roomId });
  };

  useEffect(() => {
    if (!socket) return;

    if (!roomId) {
      return;
    }

    const handleJoinResponse = (response: JoinRoomResponse) => {
      if (response.success && response.room_data) {
        setHostId(response.room_data.host_id ?? null);
        if (response.room_data.max_players) {
          setMaxPlayers(response.room_data.max_players);
        }

        setShowPasswordModal(false);
        setConnectionError(null);
        setErrorMessage("");
        hasJoinedRoomRef.current = true;

        const shouldAutoJoin = searchParams.get('autojoin');

        if (shouldAutoJoin && !autoJoinAttempted.current) {
          autoJoinAttempted.current = true;

          socket.emit('sit_down', {
            roomId,
            seatIndex: 0,
            playerName: myName,
            autoJoin: true
          });

          router.replace(`/games/${gameName}/${roomId}`, { scroll: false });
        }
      } else {
        if (response.error_code === 'PASSWORD_REQUIRED') {
          setShowPasswordModal(true);
          if (response.message === 'BLEDNE HASLO') {
            setErrorMessage(t(lang, "thousand.board.error.wrong_password"));
          }
        } else {
          setConnectionError(response.message || t(lang, "thousand.board.error.could_not_join"));
          setShowPasswordModal(false);
        }
      }
    };

    const handleGameState = (state: ThousandGameState) => {
      if (state.stage) setGameStage(state.stage);
      if (state.seats) {
        setSeats(state.seats);

        const mySeatIdx = state.seats.findIndex((s) => s && s.userId === myId);
        if (mySeatIdx !== -1 && state.stage === 'playing') {
          const opponentSeatIdx = mySeatIdx === 0 ? 1 : 0;
          const opponentSeat = state.seats[opponentSeatIdx];
          if (opponentSeat) {
            if (opponentSeat.connected === true || opponentSeat.connected === undefined) {
              setOpponentDisconnected(null);
            } else if (opponentSeat.connected === false) {
              setOpponentDisconnected((prev) => {
                if (prev !== null) return prev;
                return { name: opponentSeat.name || 'OPPONENT', timeLeft: 90 };
              });
            }
          }
        }
      }
      if (state.my_hand) setMyHand(state.my_hand);
    };

    const handleError = (err: unknown) => {
      if (err && typeof err === 'object' && Object.keys(err).length > 0 && JSON.stringify(err) !== '{}') {
        console.error(t(lang, "thousand.board.log.socket_error"), err);
      }
    };

    const handleOpponentDisconnected = (data: OpponentDisconnectPayload) => {
      if (data.playerName) {
        setOpponentDisconnected({ name: data.playerName, timeLeft: data.waitTime || 90 });
      }
    };

    const handleOpponentReconnected = () => {
      setOpponentDisconnected(null);
    };

    const handleOpponentReturned = () => {
      setOpponentDisconnected(null);
    };

    const handleGameEndedTimeout = () => {
      setOpponentDisconnected(null);
      router.push(`/lobby/${gameName}`);
    };

    socket.off('error', handleError);

    socket.on('join_room_response', handleJoinResponse);
    socket.on('game_state_update', handleGameState);
    socket.on('error', handleError);
    socket.on('opponent_disconnected', handleOpponentDisconnected);
    socket.on('opponent_reconnected', handleOpponentReconnected);
    socket.on('opponent_returned', handleOpponentReturned);
    socket.on('game_ended_timeout', handleGameEndedTimeout);

    joinRoom(searchParams.get('autojoin') ? searchParams.get('password') || '' : '');
    socket.emit('get_game_state', { roomId });

    return () => {
      socket.off('join_room_response', handleJoinResponse);
      socket.off('game_state_update', handleGameState);
      socket.off('error', handleError);
      socket.off('opponent_disconnected', handleOpponentDisconnected);
      socket.off('opponent_reconnected', handleOpponentReconnected);
      socket.off('opponent_returned', handleOpponentReturned);
      socket.off('game_ended_timeout', handleGameEndedTimeout);
    };
  }, [socket, roomId, gameName, myName, myId, searchParams, router, lang]);

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

  const handlePasswordSubmit = (password: string) => {
    setErrorMessage("");
    joinRoom(password);
  };

  const handleCloseModal = () => {
    router.push(`/lobby/${gameName}`);
  };

  if (connectionError) {
    return (
      <RoomUnavailableState
        roomId={roomId}
        href={`/lobby/${gameName}`}
        backLabel={t(lang, "thousand.board.back_to_lobby")}
      />
    );
  }

  return (
    <div className="game-runtime-shell game-runtime-shell--thousand p-1">
      <div className="shrink-0 mb-1 pl-2">
        <ReturnArrow href={`/lobby/${gameName}`} text={t(lang, "arrow")} onClick={leaveRoom} confirmMessage={gameStage !== 'waiting_for_players' && seats.some((seat) => seat && String(seat.userId) === String(myId)) ? t(lang, 'common.leave_active_confirm') : undefined} />
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        gameName={gameName}
        errorMessage={errorMessage}
        onSubmit={handlePasswordSubmit}
        onClose={handleCloseModal}
      />

      {gameStage === "waiting_for_players" ? (
        <>
          <WaitingRoom
            socket={socket}
            roomId={roomId}
            seats={seats}
            myId={myId}
            myName={myName}
            hostId={hostId}
            maxPlayers={maxPlayers}
            isObserver={searchParams.get('role') === 'observer'}
          />
          <GameRulesBubble roomId={roomId} placement="left" />
          <GameChat
            socket={socket}
            roomId={roomId}
            myId={myId}
            myName={myName}
            isBubble={true}
            bubbleClassName="waiting-chat-bubble"
            className="waiting-chat-panel rounded-xl border border-amber-900/50 bg-app-surface/95"
          />
        </>
      ) : (
        <>
          <MultiplayerShell
            stage={searchParams.get('role') === 'observer' ? 'observer' : gameStage === 'finished' ? 'finished' : opponentDisconnected ? 'disconnected' : 'active'}
            className="multiplayer-active-shell multiplayer-active-shell--thousand"
          >
            <Game socket={socket} roomId={roomId} seats={seats} myId={myId} initialHand={myHand} />
          </MultiplayerShell>
          <GameRulesBubble roomId={roomId} />
          <GameChat
            socket={socket}
            roomId={roomId}
            myId={myId}
            myName={myName}
            isBubble
            variant="game"
          />
        </>
      )}

      {opponentDisconnected && gameStage !== "waiting_for_players" && (
        <OpponentDisconnectedBanner
          name={opponentDisconnected.name}
          timeLeft={opponentDisconnected.timeLeft}
        />
      )}
    </div>
  );
}
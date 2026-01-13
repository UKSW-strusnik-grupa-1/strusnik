'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/app/hooks/useSocket';
import { useSearchParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import WaitingRoom from './WaitingRoom';
import PasswordModal from '../lobby/passwordModal';
import { GameChat } from '@/app/components/chat/GameChat';
import Game from './Game';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';

interface StrategoBoardProps {
  gameName: string;
  roomId: string;
  myId: string;
  myName: string;
}

export default function StrategoBoard({ gameName, roomId, myId, myName }: StrategoBoardProps) {
  const { socket } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();

  const autoJoinAttempted = useRef(false);
  const hasJoinedRoomRef = useRef(false);

  const [gameStage, setGameStage] = useState<string>('waiting_for_players');
  const [seats, setSeats] = useState<any[]>([null, null]);
  const [gameState, setGameState] = useState<any>(null);
  const [hostId, setHostId] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string; timeLeft: number } | null>(null);

  const { lang } = useLang();

  const joinRoom = (pwd: string = '') => {
    if (!socket) return;
    if (!roomId) return;

    socket.emit('join_room', {
      game_name: gameName,
      room_id: roomId,
      password: pwd,
    });
  };

  const leaveRoom = () => {
    if (!socket || !roomId) return;
    socket.emit('leave_room', { roomId });
  };

  useEffect(() => {
    if (!socket) return;

    if (!roomId) {
      setConnectionError(t(lang, 'stratego.board.error.no_room_id'));
      return;
    }

    const handleJoinResponse = (response: any) => {
      if (response.success && response.room_data) {
        setHostId(response.room_data.host_id);
        setShowPasswordModal(false);
        setConnectionError(null);
        setErrorMessage('');
        hasJoinedRoomRef.current = true;

        const shouldAutoJoin = searchParams.get('autojoin');

        if (shouldAutoJoin && !autoJoinAttempted.current) {
          autoJoinAttempted.current = true;
          socket.emit('sit_down', {
            roomId,
            seatIndex: 0,
            playerName: myName,
          });
        }
      } else {
        if (response.error_code === 'PASSWORD_REQUIRED') {
          setShowPasswordModal(true);

          const msg = String(response.message || '');
          const lower = msg.toLowerCase();

          if (msg.includes('password') || msg.includes('haslo') || msg.includes('błędne') || msg.includes('bledne')) {
            setErrorMessage(t(lang, 'stratego.board.error.wrong_password'));
          }
        } else {
          setConnectionError(response.message || t(lang, 'stratego.board.error.could_not_join'));
          setShowPasswordModal(false);
        }
      }
    };

    const handleGameState = (state: any) => {
      if (state.stage) setGameStage(state.stage);
      if (state.seats) {
        setSeats(state.seats);

        const mySeatIdx = state.seats.findIndex((s: any) => s && s.userId === myId);
        if (mySeatIdx !== -1 && (state.stage === 'playing' || state.stage === 'setup')) {
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
      setGameState(state);
    };

    const handleError = (err: any) => {
      if (err && typeof err === 'object' && Object.keys(err).length > 0 && JSON.stringify(err) !== '{}') {
        console.error(t(lang, 'stratego.board.log.socket_error'), err);
      }
    };

    const handleOpponentDisconnected = (data: any) => {
      console.log('[STRATEGO] opponent_disconnected received:', data);
      if (data.playerName) {
        setOpponentDisconnected({ name: data.playerName, timeLeft: data.waitTime || 90 });
      }
    };

    const handleOpponentReconnected = () => {
      console.log('[STRATEGO] opponent_reconnected received');
      setOpponentDisconnected(null);
    };

    const handleOpponentReturned = () => {
      console.log('[STRATEGO] opponent_returned received');
      setOpponentDisconnected(null);
    };

    const handleGameEndedTimeout = () => {
      setOpponentDisconnected(null);
      router.push(`/lobby/${gameName}`);
    };

    socket.off('join_room_response');
    socket.off('game_state_update');
    socket.off('error');
    socket.off('opponent_disconnected');
    socket.off('opponent_reconnected');
    socket.off('opponent_returned');
    socket.off('game_ended_timeout');

    socket.on('join_room_response', handleJoinResponse);
    socket.on('game_state_update', handleGameState);
    socket.on('error', handleError);
    socket.on('opponent_disconnected', handleOpponentDisconnected);
    socket.on('opponent_reconnected', handleOpponentReconnected);
    socket.on('opponent_returned', handleOpponentReturned);
    socket.on('game_ended_timeout', handleGameEndedTimeout);

    joinRoom('');
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
        socket.emit('leave_room', { roomId });
      }
    };

    const handlePopState = () => {
      if (hasJoinedRoomRef.current) {
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
    setErrorMessage('');
    joinRoom(password);
  };

  const handleCloseModal = () => {
    router.push(`/lobby/${gameName}`);
  };

  if (connectionError) {
    return (
      <div className="relative w-full h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-[#1a120b]/90 p-8 rounded-xl border-2 border-red-600/50 text-center shadow-2xl backdrop-blur-md max-w-md w-full">
          <h2 className="text-2xl text-red-500 font-bold mb-4 uppercase tracking-widest">
            {t(lang, 'stratego.board.error.title')}
          </h2>

          <p className="text-gray-200 mb-6 font-medium">{connectionError}</p>

          <a
            href={`/lobby/${gameName}`}
            className="inline-block w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm"
          >
            {t(lang, 'stratego.board.back_to_lobby')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen flex flex-col p-1 overflow-hidden text-amber-50">
      <div className="shrink-0 mb-1 pl-2 z-10">
        <ReturnArrow href={`/lobby/${gameName}`} text={t(lang, 'arrow')} onClick={leaveRoom} />
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        gameName={gameName}
        errorMessage={errorMessage}
        onSubmit={handlePasswordSubmit}
        onClose={handleCloseModal}
      />

      {gameStage === 'waiting_for_players' ? (
        <>
          <WaitingRoom
            maxPlayers={2}
            socket={socket}
            roomId={roomId}
            seats={seats}
            myId={myId}
            myName={myName}
            hostId={hostId}
          />

          <GameChat
            socket={socket}
            roomId={roomId}
            myId={myId}
            myName={myName}
            isBubble={true}
            className="bottom-4 right-4 rounded-xl border border-amber-900/50 bg-[#1a120b]/95"
          />
        </>
      ) : (
        <>
          <Game socket={socket} roomId={roomId} gameState={gameState} myId={myId} opponentDisconnected={!!opponentDisconnected} />

          <GameChat
            socket={socket}
            roomId={roomId}
            myId={myId}
            myName={myName}
            isBubble
            height="28%"
            className="
              w-[140px] md:w-[220px] lg:w-[300px]
              mr-1
              bg-[#000000]/30
              backdrop-blur-md
              border-l border-r border-[#353434]
              bottom-0 right-0
            "
          />
        </>
      )}

      {opponentDisconnected && gameStage !== 'waiting_for_players' && (
        <OpponentDisconnectedBanner
          name={opponentDisconnected.name}
          timeLeft={opponentDisconnected.timeLeft}
        />
      )}
    </div>
  );
}
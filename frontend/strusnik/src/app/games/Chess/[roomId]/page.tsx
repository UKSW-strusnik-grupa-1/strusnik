'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReturnArrow from '@/app/components/lobby/returnArrow';
import PasswordModal from '@/app/components/lobby/passwordModal';
import { useSocket } from '@/app/hooks/useSocket';
import { useUser } from '@/app/hooks/useUser';
import ChessBoard from '@/app/components/chess/ChessBoard';
import { useChess } from '@/app/hooks/useChess';
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';

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

export default function ChessRoomPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;

  const { socket, isConnected } = useSocket();
  const { userInfo } = useUser();

  const myUserId = userInfo?.userId !== undefined && userInfo?.userId !== null ? String(userInfo.userId) : null;
  const myUsername = userInfo?.nickname ?? null;

  const { lang } = useLang();

  const chess = useChess({
    socket,
    roomId,
    userId: myUserId,
    username: myUsername,
    onKickedToLobby: () => router.push('/lobby/chess'),
  });

  const topLeftLabel = useMemo(() => {
    return `${t(lang, "chess.enemy")}: ${formatClock(chess.opponentTimeMs)}`;
  }, [chess.opponentTimeMs]);

  const topRightLabel = useMemo(() => {
    return `${t(lang, "chess.you")}: ${formatClock(chess.myTimeMs)}`;
  }, [chess.myTimeMs]);

  const bottomLeftLabel = useMemo(() => {
    if (chess.drawUiState === 'offered_to_me') return t(lang, "chess.accept");
    if (chess.drawUiState === 'offered_by_me') return t(lang, "chess.proposed");
    return t(lang, "chess.draw");
  }, [chess.drawUiState]);

  const bottomRightLabel = useMemo(() => {
    if (chess.drawUiState === 'offered_to_me') return t(lang, "chess.decline");
    if (chess.drawUiState === 'offered_by_me') return t(lang, "chess.surrender");
    return t(lang, "chess.surrender");
  }, [chess.drawUiState]);

  const handleBottomLeft = () => {
    if (!chess.isGameStarted) return;
    if (chess.drawUiState === 'offered_to_me') chess.acceptDraw();
    else if (chess.drawUiState === 'none') chess.proposeDraw();
  };

  const handleBottomRight = () => {
    if (!chess.isGameStarted) return;
    if (chess.drawUiState === 'offered_to_me') chess.declineDraw();
    else chess.resign();
  };

  const showToast = (!socket || !isConnected) || !!chess.joinError;
  const toastText = !socket || !isConnected ? t(lang, "chess.loading") : chess.joinError;

  return (
    <div className="relative w-full min-h-screen overflow-hidden flex items-center justify-center">

      <div className="absolute inset-0 bg-black/35" />

      <div className="absolute w-full h-screen flex flex-col overflow-visible">
        <ReturnArrow href="/lobby/chess" text={t(lang, "arrow")} onClick={() => chess.leaveRoom()} />
      </div>

      <PasswordModal
        isOpen={chess.passwordModalOpen}
        gameName="chess"
        errorMessage={chess.passwordModalMessage}
        onSubmit={(pwd) => chess.submitJoinPassword(pwd)}
        onClose={() => chess.closePasswordModal()}
      />

      <div className="relative z-10 flex flex-col items-center gap-4 px-4 py-10">
        <div className="w-[640px] flex items-center justify-between">
          <div className="relative w-[310px] h-[64px] select-none pointer-events-none">
            <img
              src="/main/button.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-amber-50 font-extrabold uppercase tracking-wide drop-shadow-md text-sm">
                {topLeftLabel}
              </p>
            </div>
          </div>

          <div className="relative w-[310px] h-[64px] select-none pointer-events-none">
            <img
              src="/main/button.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-amber-50 font-extrabold uppercase tracking-wide drop-shadow-md text-sm">
                {topRightLabel}
              </p>
            </div>
          </div>
        </div>

        {!chess.isGameStarted && !chess.gameEnded ? (
          <div className="text-center text-amber-50/90 font-extrabold uppercase tracking-wide text-xs">
            {chess.waitingHint}
          </div>
        ) : null}

        <div className="relative w-[640px] h-[623px]">
          <ChessBoard
            width={640}
            height={623}
            fen={chess.fen}
            myColor={chess.myColor}
            isGameStarted={chess.isGameStarted}
            isMyTurn={chess.isMyTurn}
            legalMovesBySquare={chess.legalMovesBySquare}
            onMove={(from, to, promotion) => chess.makeMove(from, to, promotion)}
          />

          {chess.gameEnded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[520px] bg-black/75 border border-[#353434] rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                <h2 className="text-center text-amber-50 font-extrabold uppercase tracking-wide text-lg">
                  {chess.endTitle}
                </h2>
                <p className="mt-2 text-center text-gray-200">{chess.endSubtitle}</p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button onClick={() => router.push('/lobby/chess')} className="relative w-[260px] h-[64px] group">
                    <img
                      src="/main/button.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      draggable={false}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-amber-50 font-extrabold uppercase tracking-wide drop-shadow-md">{t(lang, "chess.back")}</p>
                    </div>
                  </button>
                </div>
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

        <div className="w-[640px] flex items-center justify-between">
          <button
            onClick={handleBottomLeft}
            disabled={!chess.isGameStarted || chess.bottomButtonsLocked || chess.drawUiState === 'offered_by_me'}
            className={`relative w-[310px] h-[64px] group ${!chess.isGameStarted || chess.bottomButtonsLocked
              ? 'opacity-60 cursor-not-allowed'
              : chess.drawUiState === 'offered_by_me'
                ? 'opacity-80 cursor-default'
                : 'cursor-pointer'
              }`}
          >
            <img
              src="/main/button.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-amber-50 font-extrabold uppercase tracking-wide drop-shadow-md text-sm text-center px-3">
                {bottomLeftLabel}
              </p>
            </div>
          </button>

          <button
            onClick={handleBottomRight}
            disabled={!chess.isGameStarted || chess.bottomButtonsLocked}
            className={`relative w-[310px] h-[64px] group ${!chess.isGameStarted || chess.bottomButtonsLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
          >
            <img
              src="/main/button.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-amber-50 font-extrabold uppercase tracking-wide drop-shadow-md text-sm text-center px-3">
                {bottomRightLabel}
              </p>
            </div>
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="px-4 py-2 rounded-xl bg-black/65 border border-white/10 text-amber-50 font-extrabold uppercase tracking-wide text-xs">
            {toastText}
          </div>
        </div>
      )}
    </div>
  );
}

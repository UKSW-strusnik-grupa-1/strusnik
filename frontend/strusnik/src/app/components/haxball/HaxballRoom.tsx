"use client";

import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/app/hooks/useSocket";
import { useUser } from "@/app/hooks/useUser";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import { useHaxball } from "@/app/hooks/useHaxball";
import ReturnArrow from "@/app/components/lobby/returnArrow";
import PasswordModal from "@/app/components/lobby/passwordModal";
import HaxballWaitingRoom from "@/app/components/haxball/HaxballWaitingRoom";
import HaxballMatch from "@/app/components/haxball/HaxballMatch";
import RoomUnavailableState from "@/app/components/common/RoomUnavailableState";
import MultiplayerShell, { MultiplayerStateView } from "@/app/components/multiplayer/MultiplayerShell";

export default function HaxballRoom() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useLang();
  const { socket, roomPresence } = useSocket();
  const { userInfo } = useUser();
  const roomId = String(params?.roomId || "");
  const userId = String(userInfo?.userId ?? "");
  const userName = userInfo?.nickname || t(lang, "user.guest");
  const role = searchParams.get("role") === "observer" ? "observer" : "player";
  const initialPassword = searchParams.get("password") || undefined;

  const haxball = useHaxball({ socket, roomId, userId, role, initialPassword });
  const hostId = roomPresence?.hostId ?? haxball.hostId;
  const isHost = Boolean(
    (socket?.id && hostId && String(socket.id) === String(hostId)) ||
    (roomPresence?.hostUserId && String(roomPresence.hostUserId) === userId),
  );
  const isWaiting = haxball.gameState?.stage === "waiting_for_players";
  const isFinished = haxball.gameState?.stage === "finished";

  const backToLobby = () => {
    haxball.leaveRoom();
    router.push("/lobby/Haxball");
  };

  const pageState = useMemo(() => {
    if (haxball.joinError && !haxball.gameState && !haxball.passwordModalOpen) return "error";
    if (!haxball.gameState) return "loading";
    return "ready";
  }, [haxball.gameState, haxball.joinError, haxball.passwordModalOpen]);

  if (pageState === "error") {
    return (
      <RoomUnavailableState
        roomId={roomId}
        href="/lobby/Haxball"
        backLabel={t(lang, "haxball.back_to_lobby")}
      />
    );
  }

  return (
    <main id="main-content" className={isWaiting ? "haxball-page-shell" : "haxball-runtime-page"}>
      {(pageState === "loading" || isWaiting || isFinished || haxball.gameState) && (
        <ReturnArrow
          href="/lobby/Haxball"
          text={t(lang, "arrow")}
          onClick={haxball.leaveRoom}
          confirmMessage={!isWaiting && !isFinished ? t(lang, "common.leave_active_confirm") : undefined}
        />
      )}

      <PasswordModal
        isOpen={haxball.passwordModalOpen}
        gameName="Haxball"
        errorMessage={haxball.passwordMessage}
        onSubmit={haxball.emitJoin}
        onClose={haxball.closePasswordModal}
      />

      {pageState === "loading" && (
        <MultiplayerShell
          stage="loading"
          className="multiplayer-state-shell"
        >
          <MultiplayerStateView stage="loading" title={t(lang, "haxball.connection")} />
        </MultiplayerShell>
      )}

      {haxball.gameState && isWaiting && (
        <HaxballWaitingRoom
          socket={socket}
          roomId={roomId}
          state={haxball.gameState}
          userId={userId}
          hostId={hostId}
          isHost={isHost}
          isObserver={haxball.isObserver}
          onChooseTeam={haxball.chooseTeam}
          onReady={haxball.setReady}
          onStart={haxball.startGame}
          onMapChange={(mapId) => haxball.updateSettings({ map_id: mapId })}
          onDurationChange={(duration) => haxball.updateSettings({ duration_min: duration })}
        />
      )}

      {haxball.gameState && !isWaiting && (
        <HaxballMatch
          socket={socket}
          roomId={roomId}
          state={haxball.gameState}
          userId={userId}
          userName={userName}
          isHost={isHost}
          isObserver={haxball.isObserver}
          onRematch={haxball.prepareRematch}
          onBack={backToLobby}
          setMovement={haxball.setMovement}
          triggerKick={haxball.triggerKick}
        />
      )}
    </main>
  );
}

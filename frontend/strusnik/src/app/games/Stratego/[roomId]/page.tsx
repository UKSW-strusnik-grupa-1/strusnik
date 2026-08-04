"use client";

import { useParams } from "next/navigation";
import StrategoBoard from "@/app/components/stratego/StrategoBoard";
import { useUser } from "@/app/hooks/useUser";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import { MultiplayerStateView } from "@/app/components/multiplayer/MultiplayerShell";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const { userInfo } = useUser();
  const { lang } = useLang();

  if (!params?.roomId) {
    return (
      <main id="main-content" className="game-runtime-shell game-runtime-result-stage">
        <MultiplayerStateView stage="loading" title={t(lang, "loading.params")} />
      </main>
    );
  }

  return (
    <StrategoBoard
      gameName={"Stratego"}
      roomId={params.roomId}
      myId={(userInfo?.userId)?.toString() || ""}
      myName={userInfo?.nickname || t(lang, "user.guest")}
    />
  );
}
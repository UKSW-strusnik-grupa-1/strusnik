"use client";

import { useParams } from "next/navigation";
import HaxballRoom from "@/app/components/haxball/HaxballRoom";
import { MultiplayerStateView } from "@/app/components/multiplayer/MultiplayerShell";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

export default function HaxballRoomPage() {
  const params = useParams<{ roomId: string }>();
  const { lang } = useLang();

  if (!params?.roomId) {
    return (
      <main id="main-content" className="game-runtime-shell game-runtime-result-stage">
        <MultiplayerStateView stage="loading" title={t(lang, 'loading')} />
      </main>
    );
  }

  return <HaxballRoom />;
}

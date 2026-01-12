"use client";

import { useParams } from "next/navigation";
import BattleshipsBoard from "@/app/components/battleships/BattleshipsBoard";
import { useUser } from "@/app/hooks/useUser";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const { userInfo } = useUser();
  const { lang } = useLang();

  if (!params?.roomId) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#1a120b] text-amber-50">
        <h1 className="text-xl animate-pulse">
          {t(lang, "loading.params")}
        </h1>
      </div>
    );
  }

  return (
    <BattleshipsBoard
      gameName="Battleships"
      roomId={params.roomId}
      myId={(userInfo?.userId)?.toString() || ""}
      myName={userInfo?.nickname || t(lang, "user.guest")}
    />
  );
}

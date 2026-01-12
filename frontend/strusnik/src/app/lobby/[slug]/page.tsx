'use client';

import ListOfRooms from "@/app/components/lobby/listOfRooms";
import OnlinePlayersList from "@/app/components/lobby/onlinePlayersList";
import ReturnArrow from "@/app/components/lobby/returnArrow";
import Link from "next/link";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import { useParams } from "next/navigation";
import { useSocket } from "@/app/hooks/useSocket";
import ActiveGameBanner from "@/app/components/lobby/ActiveGameBanner";

export default function LobbyPage() {
  const { lang } = useLang();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "chess";
  const { activeGame, setActiveGame } = useSocket();

  return (
    <div>
      <OnlinePlayersList collapsible />

      <ReturnArrow href="/multiplayer" />

      <div className="relative w-full h-screen flex items-center justify-center flex-col">
        {/* Show banner if user has an active game */}
        {activeGame && (
          <ActiveGameBanner
            gameName={activeGame.gameName}
            roomId={activeGame.roomId}
            roomName={activeGame.roomName}
            onDismiss={() => setActiveGame(null)}
          />
        )}

        <div className="relative">
          <div className="w-[650px] h-[430px] rounded-lg flex flex-col items-center justify-start">
            <ListOfRooms gameName={slug} />
          </div>
        </div>

        <div className="relative mt-5 group">
          <Link href={`/lobby/${slug}/createRoom`}>
            <img
              alt={t(lang, "lobby.create_room_button_bg_alt")}
              src="/main/button.png"
              className="object-cover -z-10 w-[175px] items-center transition-all group-hover:brightness-110"
            />

            <p className="absolute inset-0 flex items-center justify-center text-white font-bold cursor-pointer transition-all group-hover:scale-105 text-center">
              {t(lang, "rooms.create")}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export const dynamicParams = true;
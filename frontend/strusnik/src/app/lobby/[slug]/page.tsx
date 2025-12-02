import ReturnArrow from "@/app/components/lobby/returnArrow";
import RoomTile from "@/app/components/lobby/roomTile";
import SearchInput from "@/app/components/lobby/searchInput";
import { Games } from "@/app/constants/games"
import Link from "next/link";

export async function generateStaticParams() {
    const games = Games["multiplayer"].map(game => ({slug: game}));
    return games;
}
 
export default async function LobbyPage({params}: {params: Promise<{ slug: string }>}) {
  const { slug } = await params
  return (
    <div>
        <ReturnArrow href="/multiplayer"/>
        
        <div className="relative w-full h-screen flex items-center justify-center flex-col">
            <img
                alt="Tło"
                src="/main/background.png"
                className="absolute w-full h-full object-cover -z-10"
            />

            <SearchInput placeholder="Szukaj gry..." />

            <div className="relative">
                <div className="w-[650px] h-[430px] rounded-lg flex flex-col gap-2 items-center justify-start overflow-y-auto px-4 custom-scrollbar">
                    <RoomTile roomName="Stratego #001" isPrivate={true}/>
                    <RoomTile roomName="Stratego #001"/>
                    <RoomTile roomName="Stratego #001"/>
                    <RoomTile roomName="Stratego #001"/>
                    <RoomTile roomName="Stratego #001"/>
                    <RoomTile roomName="Stratego #001"/>
                    <RoomTile roomName="Stratego #001"/>
                    <RoomTile roomName="Stratego #001"/>
                    <RoomTile roomName="Stratego #001"/>
                </div>
            </div>

            <div className="relative mt-5 group">
                <img
                    alt="Tło"
                    src="/main/button.png"
                    className="object-cover -z-10 w-[175px] items-center transition-all group-hover:brightness-110"
                />
                
                <p className="absolute inset-0 flex items-center justify-center text-white font-bold cursor-pointer transition-all group-hover:scale-105 text-center">
                    Stwórz pokój
                </p>
            </div>

        </div>
    </div>
  );
}

export const dynamicParams = false;
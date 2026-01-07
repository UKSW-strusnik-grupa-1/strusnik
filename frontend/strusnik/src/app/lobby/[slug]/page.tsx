import ListOfRooms from "@/app/components/lobby/listOfRooms";
import OnlinePlayersList from "@/app/components/lobby/onlinePlayersList";
import ReturnArrow from "@/app/components/lobby/returnArrow";
import { Games } from "@/app/constants/games"
import Link from "next/link";

export async function generateStaticParams() {
    const games = Games["multiplayer"].map(game => ({ slug: game }));
    return games;
}

export default async function LobbyPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    return (
        <div>
            <OnlinePlayersList collapsible/> 

            <ReturnArrow href="/multiplayer" />

            <div className="relative w-full h-screen flex items-center justify-center flex-col">

                <div className="relative">
                    <div className="w-[650px] h-[430px] rounded-lg flex flex-col items-center justify-start"> 
                        <ListOfRooms gameName={slug} />
                    </div>
                </div>

                <div className="relative mt-5 group">
                    <Link href={`/lobby/${slug}/createRoom`}>
                        <img
                            alt="Tlo"
                            src="/main/button.png"
                            className="object-cover -z-10 w-[175px] items-center transition-all group-hover:brightness-110"
                        />

                        <p className="absolute inset-0 flex items-center justify-center text-white font-bold cursor-pointer transition-all group-hover:scale-105 text-center">
                            STWORZ POKOJ
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export const dynamicParams = false;
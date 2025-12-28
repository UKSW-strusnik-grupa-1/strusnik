'use client';

import { useEffect, useState } from "react";
import ReturnArrow from "@/app/components/lobby/returnArrow";
import SearchInput from "@/app/components/lobby/searchInput";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/app/hooks/useSocket";
import { useUser } from "@/app/hooks/useUser";

export default function CreateRoomPage() {
    const router = useRouter()
    const params = useParams<{slug: string}>();
    const gameName = params.slug;

    const [roomName, setRoomName] = useState<string>("")
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);
    const [password, setPassword] = useState<string>("")

    const { socket, isConnected } = useSocket();
    const { userInfo } = useUser();

    useEffect(() => {
        if (!socket) return;

        const handleRoomCreated = (data: any) => {
            // ZMIANA: Dodano parametr ?autojoin=true
            router.push(`/games/${gameName}/${data.room_id}?autojoin=true`); 
        };

        socket.on('room_created', handleRoomCreated);
        socket.on('error', (err) => alert(err.msg)); 

        return () => {
            socket.off('room_created', handleRoomCreated);
            socket.off('error');
        };
    }, [socket, router, gameName]);

    const createRoom = () => {
        console.log("Próba utworzenia pokoju...");

        if (!socket) {
            console.error("Błąd: Brak połączenia z socketem!");
            return;
        }

        const roomData = {
            "game_name": gameName,
            "room_name": roomName || `Pokój gracza`,
            "max_players": maxPlayers,
            "password": isPasswordEnabled ? password : null,
            "userToken": userInfo?.userId
        };

        socket.emit("create_room", roomData);
    }
    
    const playerOptions = [2, 3, 4];

    return (
        <div className='relative w-full min-h-screen flex items-center justify-center p-4 overflow-y-auto'>
            <ReturnArrow href={`/lobby/${gameName}`} text="Powrót do listy pokojów"/>

            <img
                alt="Tło"
                src="/main/background.png"
                className="fixed w-full h-full object-cover -z-10"
            />

            <div className="z-10 flex flex-col gap-8 w-full max-w-md my-10">

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold uppercase tracking-wide ml-1 text-gray-200">
                        Nazwa pokoju
                    </label>
                    <SearchInput text={roomName} setText={setRoomName} placeholder="Podaj nazwe pokoju..."/>
                </div>

                <div className="flex flex-col gap-3">
                    <label className="text-sm font-bold uppercase tracking-wide ml-1 text-gray-200">
                        Ilosc graczy
                    </label>
                    <div className="flex flex-row justify-evenly gap-3 flex-wrap">
                        {playerOptions.map((num) => (
                            <button
                                key={num}
                                onClick={() => setMaxPlayers(num)}
                                className={`
                                    rounded-xl font-bold text-xl p-4 min-w-[60px] transition-all duration-300 flex-1 cursor-pointer border
                                    ${maxPlayers === num
                                        ? "bg-[#2b1d15]/90 border-[#6b5645] text-amber-50 scale-105 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                        : "bg-[#000000]/40 border-[#353434] text-gray-400 hover:bg-[#000000]/60"
                                    }
                                `}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => setIsPasswordEnabled(!isPasswordEnabled)}
                        className={`
                            w-full py-4 px-5 rounded-xl font-bold text-left transition-all duration-300 border flex items-center justify-between group
                            ${isPasswordEnabled
                                ? "bg-[#2b1d15]/90 border-[#6b5645] text-amber-50"
                                : "bg-[#000000]/40 border-[#353434] text-gray-400 hover:bg-[#000000]/60"
                            }
                        `}
                    >
                        <span className="uppercase tracking-wide text-sm">Haslo do pokoju</span>
                        
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-300 cursor-pointer
                            ${isPasswordEnabled 
                                ? 'border-[#6b5645] bg-[#4a3728]' 
                                : 'border-[#353434] bg-transparent'
                            }`}>
                            {isPasswordEnabled && <span className="text-sm font-bold">✓</span>}
                        </div>
                    </button>

                    <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isPasswordEnabled ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <SearchInput text={password} setText={setPassword} placeholder="Podaj haslo do pokoju..." />
                    </div>
                </div>

                <button 
                    className="relative group flex justify-center items-center w-full h-[60px] bg-transparent border-none cursor-pointer disabled:opacity-50" 
                    onClick={createRoom}
                    disabled={!socket}
                >
                    <img
                        alt="Przycisk"
                        src="/main/button.png"
                        className="absolute object-fill w-full h-full -z-10 transition-all duration-300 group-hover:brightness-110 group-hover:scale-105 drop-shadow-xl rounded-lg"
                    />

                    <p className="z-10 text-amber-50 font-bold text-lg transition-all duration-300 group-hover:scale-105">
                        {!socket ? "Laczenie..." : "Stwórz pokój"}
                    </p>
                </button>

            </div>
        </div>  
    )
}
import { UserIcon } from "lucide-react";
import OnlinePlayersList from "../lobby/onlinePlayersList";

interface Player {
    socketId: string;
    userId: string;
    name: string;
    score?: number;
}

interface WaitingRoomProps {
    socket: any;
    roomId: string;
    seats: (Player | null)[];
    myId: string;
    myName: string;
    hostId: string | null;
    maxPlayers: number;
}

export default function WaitingRoom({ socket, roomId, seats, myId, myName, hostId, maxPlayers }: WaitingRoomProps) {

    const handleSit = (seatIndex: number) => {
        if (socket) socket.emit('sit_down', { roomId, seatIndex, playerName: myName });
    };

    const handleStartGame = () => {
        if (socket) socket.emit('start_game', { roomId });
    };

    const getMySeatIndex = () => {
        const idx = seats.findIndex(s => s && String(s.userId) === String(myId));
        return idx === -1 ? 0 : idx;
    };

    const getPlayerAtScreenPos = (offset: number) => {
        const myIdx = getMySeatIndex();
        const targetIdx = (myIdx + offset) % maxPlayers;
        return { data: seats[targetIdx], seatIndex: targetIdx };
    };

    const PlayerSlot = ({ offset, positionClass }: { offset: number, positionClass: string }) => {
        const { data, seatIndex } = getPlayerAtScreenPos(offset);
        const isTaken = data !== null;
        const isMe = data && String(data.userId) === String(myId);

        if (seatIndex >= maxPlayers) return null;

        if (isTaken) {
            return (
                <div className={`absolute ${positionClass} flex flex-col items-center justify-center
                    w-[16vh] h-[16vh] rounded-full border-4 shadow-xl transition-all
                    ${isMe ? 'bg-amber-900/80 border-amber-500' : 'bg-black/60 border-[#353434]'}
                `}>
                    <UserIcon className="text-3xl mb-1"/>
                    <p className={`font-bold text-center leading-tight ${isMe ? 'text-amber-400' : 'text-gray-200'}`}>
                        {isMe ? 'TY' : data.name}
                    </p>
                    {isMe && <p className="text-[10px] text-green-400 uppercase font-bold mt-1">Gotowy</p>}
                </div>
            );
        }

        return (
            <button 
                onClick={() => handleSit(seatIndex)}
                className={`absolute ${positionClass} group flex flex-col items-center justify-center w-[14vh] h-[14vh] rounded-full border-4 border-dashed border-gray-600 bg-black/20 hover:bg-amber-900/30 hover:border-amber-500/50 transition-all cursor-pointer`}
            >
                <span className="text-2xl text-gray-500 group-hover:text-amber-200 transition-colors">+</span>
                <span className="text-xs uppercase font-bold text-gray-500 group-hover:text-amber-200 mt-1">Dolacz</span>
            </button>
        );
    };

    const getLayout = () => {
        const bottom = "bottom-[10%] left-1/2 -translate-x-1/2";
        const top = "top-[10%] left-1/2 -translate-x-1/2";
        const left = "left-[5%] top-1/2 -translate-y-1/2";
        const right = "right-[5%] top-1/2 -translate-y-1/2";
        const topLeft = "left-[15%] top-[15%]";
        const topRight = "right-[15%] top-[15%]";

        switch (maxPlayers) {
            case 2:
                return [
                    { offset: 0, pos: bottom },
                    { offset: 1, pos: top }
                ];
            case 3:
                return [
                    { offset: 0, pos: bottom },
                    { offset: 1, pos: topRight },
                    { offset: 2, pos: topLeft }
                ];
            case 4:
            default:
                return [
                    { offset: 0, pos: bottom },
                    { offset: 1, pos: right },
                    { offset: 2, pos: top },
                    { offset: 3, pos: left }
                ];
        }
    };

    const layout = getLayout();
    const readyPlayersCount = seats.filter(s => s !== null).length;
    const canStart = readyPlayersCount === maxPlayers || (maxPlayers === 4 && readyPlayersCount >= 3); 
    const isHost = socket && hostId && socket.id === hostId;

    return (
        <div className="flex-1 flex flex-col items-center justify-center w-full h-full relative">
            
            <OnlinePlayersList 
                inviteMode={true} 
                currentRoomId={roomId} 
                collapsible={true}
            />

            <div className="absolute inset-0 m-auto w-[40%] h-[30%] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center z-0">
                <h2 className="text-2xl font-bold text-amber-50 mb-2">Poczekalnia</h2>
                <p className="text-gray-300 mb-4">
                    Oczekiwanie na graczy... ({readyPlayersCount}/{maxPlayers})
                    <br/>
                    <span className="text-xs text-gray-500">
                        {maxPlayers === readyPlayersCount ? "Pokoj pelny" : `Wymagane min. ${maxPlayers === 4 ? 3 : maxPlayers}`}
                    </span>
                </p>
                
                {isHost ? (
                    <button 
                        onClick={handleStartGame}
                        disabled={!canStart}
                        className={`
                            font-bold py-2 px-6 rounded-full shadow-lg transition-all transform 
                            ${canStart 
                                ? 'bg-green-700 hover:bg-green-600 text-white hover:scale-105 cursor-pointer' 
                                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'}
                        `}
                    >
                        START GRY
                    </button>
                ) : (
                    <div className="text-green-500/80 text-sm font-mono animate-pulse">
                        {canStart ? "Oczekiwanie na hosta..." : "Oczekiwnie na reszte graczy..."}
                    </div>
                )}
            </div>

            {layout.map((slot) => (
                <PlayerSlot 
                    key={slot.offset} 
                    offset={slot.offset} 
                    positionClass={slot.pos} 
                />
            ))}

        </div>
    );
}
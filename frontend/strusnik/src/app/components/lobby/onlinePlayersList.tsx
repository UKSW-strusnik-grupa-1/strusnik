"use client"

import { useEffect, useState } from "react";
import { UserPlus, Check, Users, X } from "lucide-react";
import { useSocket } from "@/app/hooks/useSocket";
import { useUser } from "@/app/hooks/useUser";

interface OnlinePlayer {
    userId: string;
    username: string;
    status: 'available' | 'in_lobby' | 'in_game';
}

interface OnlinePlayersListProps {
    inviteMode?: boolean;
    currentRoomId?: string;
    collapsible?: boolean;
}

export default function OnlinePlayersList({ inviteMode = false, currentRoomId, collapsible = false }: OnlinePlayersListProps) {
    const { socket, isConnected } = useSocket();
    const { userInfo } = useUser();

    const [players, setPlayers] = useState<OnlinePlayer[]>([]);
    const [invitedPlayers, setInvitedPlayers] = useState<Set<string>>(new Set());
    
    const [isOpen, setIsOpen] = useState(!collapsible);

    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit("get_online_players");

        socket.on("online_players_update", (data: OnlinePlayer[]) => {
            setPlayers(data);
        });

        return () => {
            socket.off("online_players_update");
        };
    }, [socket, isConnected]);

    const handleInvite = (targetUserId: string) => {
        if (!socket) return;
        console.log("WYSYLAM ZAPROSZENIE DO:", targetUserId);
        socket.emit('send_invite', { targetUserId });

        setInvitedPlayers(prev => new Set(prev).add(targetUserId));
        setTimeout(() => {
            setInvitedPlayers(prev => {
                const next = new Set(prev);
                next.delete(targetUserId);
                return next;
            });
        }, 5000);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_game': return "bg-red-500 shadow-red-500/50";
            case 'in_lobby': return "bg-yellow-400 shadow-yellow-400/50";
            case 'available': 
            default: return "bg-green-400 shadow-green-400/50";
        }
    };

    if (!userInfo) return null;

    if (collapsible && !isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="absolute top-4 right-4 z-50 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 group cursor-pointer"
                title="pokaz graczy online"
            >
                <Users className="text-white" size={24} />
                <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-black">
                    {players.length}
                </span>
            </button>
        );
    }

    const positionClasses = collapsible 
        ? "top-4 right-4 h-[60vh]" 
        : "top-1/2 -translate-y-1/2 left-4 xl:left-10 h-[50vh] xl:h-[65vh]";

    return (
        <div className={`
            absolute z-50 flex flex-col 
            w-64 xl:w-72 
            bg-black/80 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl p-4
            transition-all duration-300 animate-in fade-in zoom-in-95
            ${positionClasses}
        `}>
            <div className="flex items-center justify-between border-b border-white/20 pb-2 mb-2">
                <h3 className="text-lg font-bold text-white flex gap-2 items-center">
                    {inviteMode ? "zapros graczy" : "online"} 
                    <span className="text-sm font-normal text-gray-400">({players.length})</span>
                </h3>
                
                {collapsible && (
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={20} className="text-gray-400 hover:text-white" />
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {players.length === 0 ? (
                    <p className="text-gray-400 text-center text-sm italic mt-10">-</p>
                ) : (
                    players.map((player) => {
                        const isMe = String(player.userId) === String(userInfo.userId);
                        const canInvite = inviteMode && !isMe && player.status === 'available';
                        const wasInvited = invitedPlayers.has(player.userId);

                        return (
                            <div 
                                key={player.userId} 
                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                                    isMe 
                                        ? "bg-blue-600/30 border border-blue-400/30" 
                                        : "hover:bg-white/10"
                                }`}
                            >
                                <div 
                                    className={`shrink-0 w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${getStatusColor(player.status)}`} 
                                />
                                
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-medium truncate text-sm text-gray-200">
                                        {player.username}
                                    </span>
                                </div>
                                
                                {isMe && (
                                    <span className="text-xs text-blue-200 ml-auto whitespace-nowrap">(Ty)</span>
                                )}

                                {canInvite && (
                                    <button 
                                        onClick={() => handleInvite(player.userId)}
                                        disabled={wasInvited}
                                        className={`ml-auto p-1.5 rounded-full transition-all cursor-pointer ${
                                            wasInvited 
                                                ? "bg-green-500/20 text-green-400 cursor-default" 
                                                : "bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white"
                                        }`}
                                        title="zapros"
                                    >
                                        {wasInvited ? <Check size={16} /> : <UserPlus size={16} />}
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
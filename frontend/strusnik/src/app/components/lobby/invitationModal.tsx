"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/app/hooks/useSocket";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

interface InvitationData {
    hostName: string;
    gameName: string;
    roomId: string;
    password?: string;
}

export default function InvitationModal() {

    const { socket } = useSocket();
    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const router = useRouter();
    const { lang } = useLang();

    useEffect(() => {
        if (!socket) return;

        const handleIncoming = (data: InvitationData) => {
            setInvitation(data);
        };

        socket.on("incoming_invite", handleIncoming);

        return () => {
            socket.off("incoming_invite", handleIncoming);
        };
    }, [socket]);

    const handleAccept = () => {
        if (!invitation) return;
        
        const targetUrl = `/games/${invitation.gameName}/${invitation.roomId}?autojoin=true`;
        
        router.push(targetUrl);
        
        setInvitation(null);
    };

    const handleDecline = () => {
        setInvitation(null);
    };

    if (!invitation) return null;

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="
                relative 
                w-full max-w-sm 
                bg-[#2b1d15] 
                border-2 border-[#403832] 
                rounded-xl 
                shadow-[0_0_20px_rgba(0,0,0,0.8),inset_1px_1px_2px_rgba(255,255,255,0.05)]
                p-6 
                text-center 
                overflow-hidden
            ">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-[#826c5e] to-transparent opacity-50" />
                
                <h3 className="text-xl font-bold text-[#eaddcf] mb-6 drop-shadow-md">
                    {t(lang, "invitation.notification")}
                </h3>
                
                <div className="
                    py-4 px-4 mb-6 
                    bg-[#231710] 
                    rounded-lg 
                    border border-[#403832]/50
                    shadow-[inset_2px_2px_5px_rgba(0,0,0,0.7)]
                ">
                    <p className="text-[#eaddcf] font-bold text-lg mb-4 truncate">
                        {invitation.hostName}
                    </p>
                    
                    <p className="text-[#8b735b] text-sm mb-1">
                        {t(lang, "invitation.contents")}
                    </p>
                    <p className="text-amber-500/90 font-bold text-xl drop-shadow-sm">
                        {invitation.gameName}
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={handleDecline}
                        className="
                            flex-1
                            cursor-pointer 
                            py-3 px-4 
                            rounded-lg 
                            bg-[#3f1d1d] 
                            text-red-200/80
                            font-bold 
                            border-2 border-[#5c2b2b]
                            shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]
                            transition-all duration-200
                            hover:bg-[#5c2b2b] 
                            hover:text-red-100
                            hover:border-red-500/30
                            hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.7),0_0_10px_rgba(220,38,38,0.2)]
                            active:scale-95
                        "
                    >
                        {t(lang, "invitation.decline")}
                    </button>

                    <button 
                        onClick={handleAccept}
                        className="
                            flex-1
                            cursor-pointer 
                            py-3 px-4 
                            rounded-lg 
                            bg-[#1d3f23] 
                            text-green-200/80
                            font-bold 
                            border-2 border-[#2b5c33]
                            shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]
                            transition-all duration-200
                            hover:bg-[#2b5c33] 
                            hover:text-green-100
                            hover:border-green-500/30
                            hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.7),0_0_10px_rgba(34,197,94,0.2)]
                            active:scale-95
                        "
                    >
                        {t(lang, "invitation.accept")}
                    </button>
                </div>
            </div>
        </div>
    );
}
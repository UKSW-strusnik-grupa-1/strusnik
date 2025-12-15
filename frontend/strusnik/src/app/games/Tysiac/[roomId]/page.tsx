"use client"

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSocket } from '@/app/hooks/useSocket';
import ThousandBoard from '@/app/components/thousand/ThousandBoard';

export default function RoomPage() {
    const params = useParams<{ roomId: string }>();
    const router = useRouter();
    const { socket } = useSocket();
    
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        if (!socket) return;
        if (!params) return;

        const handleJoinResponse = (response: any) => {
            if (response.success) {
                setIsVerified(true);
            } else {
                alert("Ten pokój nie istnieje!"); 
                router.replace(`/lobby/Tysiac`); 
            }
        };

        socket.on('join_room_response', handleJoinResponse);

        socket.emit('join_room', {
            game_name: "Tysiac",
            room_id: params.roomId
        });

        return () => {
            socket.off('join_room_response', handleJoinResponse);
        };
    }, [socket, params, router]);

    if (!isVerified) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-[#1a120b] text-amber-50">
                <h1 className="text-2xl font-bold animate-pulse">Łączenie z pokojem...</h1>
            </div>
        );
    }

    return (
        <ThousandBoard
            gameName={"Tysiac"} 
            roomId={params.roomId} 
            myId={socket?.id || ""}
            myName={"Gracz"}
        />
    )
}
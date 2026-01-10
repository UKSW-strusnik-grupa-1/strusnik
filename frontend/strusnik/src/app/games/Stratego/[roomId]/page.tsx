"use client"

import { useParams } from 'next/navigation';
import StrategoBoard from '@/app/components/stratego/StrategoBoard';
import { useUser } from '@/app/hooks/useUser';

export default function RoomPage() {
    const params = useParams<{ roomId: string }>();
    const { userInfo } = useUser();

    if (!params?.roomId) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-[#1a120b] text-amber-50">
                <h1 className="text-xl animate-pulse">LADOWANIE PARAMETROW...</h1>
            </div>
        );
    }

    return (
        <StrategoBoard
            gameName={"Stratego"} 
            roomId={params.roomId} 
            myId={(userInfo?.userId)?.toString() || ""} 
            myName={userInfo?.nickname || "Gość"}
        />
    )
}
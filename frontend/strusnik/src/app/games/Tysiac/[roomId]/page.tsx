"use client"

import { useParams } from 'next/navigation';
import ThousandBoard from '@/app/components/thousand/ThousandBoard';
import { useUser } from '@/app/hooks/useUser';

export default function RoomPage() {
    const params = useParams<{ roomId: string }>();
    const { userInfo } = useUser();

    // Jeśli z jakiegoś powodu nie ma ID, wyświetlamy loading
    if (!params?.roomId) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-[#1a120b] text-amber-50">
                <h1 className="text-xl animate-pulse">LADOWANIE PARAMETROW...</h1>
            </div>
        );
    }

    // Zamiast łączyć się tutaj, oddajemy sterowanie do ThousandBoard.
    // To on obsłuży hasło, błędy i wyświetli odpowiednie okienka.
    return (
        <ThousandBoard
            gameName={"Tysiac"} 
            roomId={params.roomId} 
            myId={(userInfo?.userId)?.toString() || ""} 
            myName={userInfo?.nickname || "Gość"}
        />
    )
}
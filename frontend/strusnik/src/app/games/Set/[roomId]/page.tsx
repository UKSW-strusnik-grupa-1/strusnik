"use client"

import { useParams } from 'next/navigation';
import SetBoard from '@/app/components/set/SetBoard';
import { useUser } from '@/app/hooks/useUser';
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

export default function SetRoomPage() {
    const params = useParams<{ roomId: string }>();
    const { userInfo } = useUser();
    const { lang } = useLang();

    if (!params?.roomId) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-[#1a120b] text-amber-50">
                <h1 className="text-xl animate-pulse">{t(lang, "loading")}</h1>
            </div>
        );
    }

    return (
        <SetBoard
            gameName={"Set"}
            roomId={params.roomId}
            myId={(userInfo?.userId)?.toString() || ""}
            myName={userInfo?.nickname || t(lang, "user.guest")}
        />
    )
}

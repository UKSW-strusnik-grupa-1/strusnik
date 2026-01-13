'use client';

import Link from 'next/link';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import { X } from 'lucide-react';

interface ActiveGameBannerProps {
    gameName: string;
    roomId: string;
    roomName?: string;
    onDismiss?: () => void;
}

const gameDisplayNames: Record<string, string> = {
    chess: 'Chess',
    Chess: 'Chess',
    Tysiac: 'Thousand',
    Stratego: 'Stratego',
    Battleships: 'Battleships',
    Set: 'Set',
};

function normalizeGameName(name: string): string {
    const normalized: Record<string, string> = {
        'chess': 'Chess',
        'stratego': 'Stratego',
        'tysiac': 'Tysiac',
        'battleships': 'Battleships',
        'set': 'Set',
    };
    return normalized[name.toLowerCase()] || name;
}

export default function ActiveGameBanner({ gameName, roomId, roomName, onDismiss }: ActiveGameBannerProps) {
    const { lang } = useLang();
    const displayName = gameDisplayNames[gameName] || gameName;
    const normalizedGameName = normalizeGameName(gameName);

    return (
        <div className="w-[calc(100vw-32px)] max-w-[650px] mb-4 px-2 sm:px-0">
            <div className="relative bg-gradient-to-r from-amber-900/80 to-amber-700/80 border border-amber-500/50 rounded-xl p-3 sm:p-4 shadow-lg backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex-1">
                        <p className="text-amber-200 font-bold uppercase tracking-wide text-xs sm:text-sm mb-0.5 sm:mb-1">
                            {t(lang, 'lobby.active_game')}
                        </p>
                        <p className="text-amber-50 font-extrabold text-base sm:text-lg">
                            {displayName} {roomName && `- ${roomName}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <Link
                            href={`/games/${normalizedGameName}/${roomId}`}
                            className="relative group flex-1 sm:flex-initial"
                        >
                            <img
                                src="/main/button.png"
                                alt=""
                                className="w-full sm:w-[140px] h-10 sm:h-12 object-cover transition-all group-hover:brightness-110"
                                draggable={false}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-amber-50 font-bold uppercase tracking-wide text-xs sm:text-sm group-hover:scale-105 transition-transform">
                                {t(lang, 'lobby.rejoin')}
                            </span>
                        </Link>

                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="p-2 rounded-full hover:bg-black/30 transition-colors text-amber-200 hover:text-amber-50 touch-target"
                                title={t(lang, 'lobby.dismiss')}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

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

// Normalizes game name to proper format (matching /games/ folders)
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
        <div className="w-[650px] mb-4">
            <div className="relative bg-gradient-to-r from-amber-900/80 to-amber-700/80 border border-amber-500/50 rounded-xl p-4 shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-amber-200 font-bold uppercase tracking-wide text-sm mb-1">
                            {t(lang, 'lobby.active_game')}
                        </p>
                        <p className="text-amber-50 font-extrabold text-lg">
                            {displayName} {roomName && `- ${roomName}`}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href={`/games/${normalizedGameName}/${roomId}`}
                            className="relative group"
                        >
                            <img
                                src="/main/button.png"
                                alt=""
                                className="w-[140px] h-[48px] object-cover transition-all group-hover:brightness-110"
                                draggable={false}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-amber-50 font-bold uppercase tracking-wide text-sm group-hover:scale-105 transition-transform">
                                {t(lang, 'lobby.rejoin')}
                            </span>
                        </Link>

                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="p-2 rounded-full hover:bg-black/30 transition-colors text-amber-200 hover:text-amber-50"
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

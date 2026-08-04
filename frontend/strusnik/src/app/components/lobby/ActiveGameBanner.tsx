'use client';

import Link from 'next/link';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import { ArrowUpRight, X } from 'lucide-react';

interface ActiveGameBannerProps {
    gameName: string;
    roomId: string;
    roomName?: string;
    onDismiss?: () => void;
}

const gameLabelKeys: Record<string, string> = {
    chess: 'chess',
    stratego: 'stratego',
    tysiac: 'tysiac',
    battleships: 'battleships',
    set: 'set',
    haxball: 'haxball',
};

function normalizeGameName(name: string): string {
    const normalized: Record<string, string> = {
        'chess': 'Chess',
        'stratego': 'Stratego',
        'tysiac': 'Tysiac',
        'battleships': 'Battleships',
        'set': 'Set',
        'haxball': 'haxball',
    };
    return normalized[name.toLowerCase()] || name;
}

export default function ActiveGameBanner({ gameName, roomId, roomName, onDismiss }: ActiveGameBannerProps) {
    const { lang } = useLang();
    const gameLabelKey = gameLabelKeys[gameName.toLowerCase()];
    const translatedName = gameLabelKey ? t(lang, `games.${gameLabelKey}`) : gameName;
    const displayName = translatedName === `games.${gameLabelKey}` ? gameName : translatedName;
    const normalizedGameName = normalizeGameName(gameName);

    return (
        <div className="w-[calc(100vw-32px)] max-w-[650px] mb-4 px-2 sm:px-0">
            <div className="game-panel relative p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex-1">
                        <p className="text-amber-200 font-bold uppercase tracking-wide text-xs sm:text-sm mb-0.5 sm:mb-1">
                            {t(lang, 'lobby.active_game')}
                        </p>
                        <p className="text-amber-50 font-extrabold text-base sm:text-lg">
                            {displayName}{roomName && <span aria-label=", pokoj"> · {roomName}</span>}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <Link
                            href={`/games/${normalizedGameName}/${roomId}`}
                            className="active-game__link relative group flex-1 sm:flex-initial"
                        >
                            <span>{t(lang, 'lobby.rejoin')}</span>
                            <ArrowUpRight size={16} aria-hidden="true" />
                        </Link>

                        {onDismiss && (
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="game-secondary-button touch-target rounded-full p-2 text-amber-200 hover:text-amber-50"
                                aria-label={t(lang, 'lobby.dismiss')}
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

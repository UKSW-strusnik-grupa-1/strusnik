'use client';

import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface OpponentDisconnectedBannerProps {
    name: string;
    timeLeft: number;
    /** Optional: key for the "opponent disconnected" text, defaults to generic */
    disconnectedKey?: string;
    /** Optional: key for the "waiting for reconnect" text, defaults to generic */
    waitingKey?: string;
}

/**
 * Ujednolicony komponent wyświetlający informację o rozłączeniu przeciwnika.
 * Używany we wszystkich grach multiplayer.
 */
export default function OpponentDisconnectedBanner({
    name,
    timeLeft,
    disconnectedKey = 'common.opponent_disconnected',
    waitingKey = 'common.waiting_reconnect',
}: OpponentDisconnectedBannerProps) {
    const { lang } = useLang();

    return (
        <>
            <div className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-[2px]" />

            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
                <div className="px-6 py-4 rounded-xl bg-red-900/95 border-2 border-red-500/70 text-amber-50 font-bold uppercase tracking-wide text-center backdrop-blur-md shadow-2xl shadow-red-900/50">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-2xl">⚠️</span>
                        <p className="text-base">{t(lang, disconnectedKey)}</p>
                    </div>
                    <p className="text-lg text-amber-300 font-extrabold">{name}</p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                        <p className="text-xs text-amber-100/80">{t(lang, waitingKey)}</p>
                        <span className="text-xl font-bold text-amber-400 min-w-[40px]">{timeLeft}s</span>
                    </div>
                    <div className="mt-2 w-full bg-red-950/50 rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000 ease-linear"
                            style={{ width: `${Math.min(100, (timeLeft / 90) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

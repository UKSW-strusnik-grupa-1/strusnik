'use client';

import { Clock3, WifiOff } from 'lucide-react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface OpponentDisconnectedBannerProps {
    name: string;
    timeLeft: number;
    disconnectedKey?: string;
    waitingKey?: string;
}

const DISCONNECT_TIMEOUT_SECONDS = 90;

export default function OpponentDisconnectedBanner({
    name,
    timeLeft,
    disconnectedKey = 'common.opponent_disconnected',
    waitingKey = 'common.waiting_reconnect',
}: OpponentDisconnectedBannerProps) {
    const { lang } = useLang();
    const progress = Math.max(0, Math.min(100, (timeLeft / DISCONNECT_TIMEOUT_SECONDS) * 100));

    return (
        <div className="opponent-disconnected-overlay">
            <div className="opponent-disconnected-card" role="status" aria-live="polite">
                <div className="opponent-disconnected__header">
                    <div className="opponent-disconnected__icon" aria-hidden="true">
                        <WifiOff size={22} strokeWidth={1.8} />
                    </div>
                    <div className="opponent-disconnected__heading">
                        <p>{t(lang, disconnectedKey)}</p>
                        <span>{t(lang, waitingKey)}</span>
                    </div>
                    <div
                        className="opponent-disconnected__timer"
                        aria-label={t(lang, 'common.seconds_remaining').replace('{time}', String(timeLeft))}
                    >
                        <Clock3 size={16} strokeWidth={2} aria-hidden="true" />
                        <strong>{timeLeft}</strong>
                        <span>s</span>
                    </div>
                </div>

                <div className="opponent-disconnected__player">
                    <span>{name}</span>
                </div>

                <div className="opponent-disconnected__progress" aria-hidden="true">
                    <span style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );
}

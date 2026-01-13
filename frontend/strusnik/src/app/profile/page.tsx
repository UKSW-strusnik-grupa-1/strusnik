"use client";

import React, { useState, useEffect } from "react";
import ReturnArrow from "../components/lobby/returnArrow";
import { Games } from "../constants/games";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import ActiveGameBanner from "../components/lobby/ActiveGameBanner";
import { useSocket } from "../hooks/useSocket";

interface MultiplayerStats {
    total_wins: number;
    by_game: Record<string, { wins: number }>;
}

interface SingleplayerStats {
    by_game: Record<string, {
        best_score: number;
        games_played: number;
    }>;
}

interface ProfileData {
    username: string;
    created_at: string;
    last_login: string;
    multiplayer: MultiplayerStats;
    singleplayer: SingleplayerStats;
}

export default function ProfilePage() {
    const { lang } = useLang();
    const { activeGame: activeMultiplayerGame, setActiveGame: setActiveMultiplayerGame } = useSocket();

    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch("/api/profile/me", {
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    setProfileData(data);
                } else if (res.status === 401) {
                    setError(t(lang, "profile.error.not_logged_in"));
                } else {
                    setError(t(lang, "profile.error.fetch_failed"));
                }
            } catch (err) {
                console.error("Profile fetch error:", err);
                setError(t(lang, "profile.error.network"));
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [lang]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString(lang === "pl" ? "pl-PL" : "en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div className="relative w-full min-h-screen flex flex-col items-center justify-center text-white overflow-hidden px-2 sm:px-4 py-16 sm:py-4">
            <div className="absolute w-full h-screen flex flex-col overflow-visible">
                <ReturnArrow href="/" text={t(lang, "arrow")} />
            </div>

            {activeMultiplayerGame && (
                <div className="fixed top-12 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-full px-2 sm:px-0 sm:w-auto">
                    <ActiveGameBanner
                        gameName={activeMultiplayerGame.gameName}
                        roomId={activeMultiplayerGame.roomId}
                        roomName={activeMultiplayerGame.roomName}
                        onDismiss={() => setActiveMultiplayerGame(null)}
                    />
                </div>
            )}

            <div className="z-10 w-full max-w-4xl lg:max-w-5xl p-2 md:p-6 flex flex-col gap-3 md:gap-6 h-auto sm:h-[85vh] md:h-[80vh]">
                <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-center drop-shadow-lg tracking-wider text-gray-300 mt-8 sm:mt-12 md:mt-0">
                    {t(lang, "profile.title")}
                </h1>

                {loading && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-xl text-gray-400 animate-pulse">{t(lang, "loading")}</div>
                    </div>
                )}

                {error && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-xl text-red-400">{error}</div>
                    </div>
                )}

                {profileData && !loading && !error && (
                    <>
                        <div className="bg-black/60 rounded-xl backdrop-blur-md border border-[#403832] p-4 md:p-6 shadow-2xl">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#36271e] rounded-full flex items-center justify-center border-2 border-[#6F5C50]">
                                        <span className="text-2xl md:text-3xl font-bold text-gray-300">
                                            {profileData.username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-bold text-white">{profileData.username}</h2>
                                        <p className="text-sm text-gray-400">
                                            {t(lang, "profile.member_since")}: {formatDate(profileData.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-400">
                                    {t(lang, "profile.last_login")}: {formatDate(profileData.last_login)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="bg-black/60 rounded-xl backdrop-blur-md border border-[#403832] p-4 md:p-6 shadow-2xl">
                                <h3 className="text-lg md:text-xl font-bold text-gray-300 mb-4 border-b border-[#6F5C50] pb-2">
                                    {t(lang, "profile.multiplayer_stats")}
                                </h3>

                                <div className="mb-4 p-3 bg-[#36271e]/50 rounded-lg">
                                    <div className="text-sm text-gray-400">{t(lang, "profile.total_wins")}</div>
                                    <div className="text-2xl md:text-3xl font-bold text-white">
                                        {profileData.multiplayer.total_wins}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {Games.multiplayer.map((game) => (
                                        <div
                                            key={game}
                                            className="flex justify-between items-center p-2 bg-black/30 rounded-lg"
                                        >
                                            <span className="text-gray-300 text-sm md:text-base">{game}</span>
                                            <span className="font-bold text-white">
                                                {profileData.multiplayer.by_game[game.toLowerCase()]?.wins || 0} {t(lang, "profile.wins")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-black/60 rounded-xl backdrop-blur-md border border-[#403832] p-4 md:p-6 shadow-2xl">
                                <h3 className="text-lg md:text-xl font-bold text-gray-300 mb-4 border-b border-[#6F5C50] pb-2">
                                    {t(lang, "profile.singleplayer_stats")}
                                </h3>

                                <div className="space-y-3">
                                    {Games.singleplayer.map((game) => {
                                        const stats = profileData.singleplayer.by_game[game.toLowerCase()];
                                        return (
                                            <div
                                                key={game}
                                                className="p-3 bg-black/30 rounded-lg"
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-gray-300 font-medium">{game}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {stats?.games_played || 0} {t(lang, "profile.games_played")}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-400">{t(lang, "profile.best_score")}</span>
                                                    <span className="text-xl font-bold text-white">
                                                        {stats?.best_score || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

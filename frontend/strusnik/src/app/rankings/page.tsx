"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Gamepad2, Medal, RefreshCw, Trophy, Users } from "lucide-react";
import ReturnArrow from "../components/lobby/returnArrow";
import ActiveGameBanner from "../components/lobby/ActiveGameBanner";
import AccountRequiredState from "../components/common/AccountRequiredState";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import { Games } from "../constants/games";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";

interface RankingEntry {
  username: string;
  userId?: number | string;
  user_id?: number | string;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  score?: number;
  points?: number;
  wins?: number;
  gamesPlayed?: number;
}

const GAME_LABEL_KEYS: Record<string, string> = {
  chess: "chess",
  stratego: "stratego",
  tysiac: "tysiac",
  battleships: "battleships",
  set: "set",
  haxball: "haxball",
};

function getGameLabel(lang: "pl" | "en", game: string) {
  const key = GAME_LABEL_KEYS[game.toLowerCase()] ?? game.toLowerCase();
  const translated = t(lang, `games.${key}`);
  return translated === `games.${key}` ? game : translated;
}

function getPoints(entry: RankingEntry) {
  return entry.points ?? entry.score ?? entry.wins ?? 0;
}

function getAvatarUrl(entry: RankingEntry) {
  const avatarUrl = entry.avatarUrl ?? entry.avatar_url;
  const userId = entry.userId ?? entry.user_id;

  if (avatarUrl) return avatarUrl;
  if (avatarUrl === undefined) {
    if (userId) return `/api/profile/avatar/${encodeURIComponent(String(userId))}`;
    return `/api/profile/${encodeURIComponent(entry.username)}/avatar`;
  }
  return null;
}

export default function RankingsPage() {
  const { lang } = useLang();
  const { activeGame: activeMultiplayerGame, setActiveGame: setActiveMultiplayerGame } = useSocket();
  const { userInfo, isLoading: isUserLoading } = useUser();

  const allGames = useMemo(() => [...Games.multiplayer], []);
  const [activeGame, setActiveGame] = useState<string>(allGames[0] ?? "");
  const [rankingData, setRankingData] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const activeGameLabel = getGameLabel(lang, activeGame);
  const isResultsLoading = isUserLoading || loading;
  const leaders = rankingData.slice(0, 3);
  const remainingPlayers = rankingData.slice(3);

  useEffect(() => {
    if (isUserLoading || userInfo?.isGuest || !activeGame) return;

    const controller = new AbortController();

    const fetchRanking = async () => {
      setLoading(true);
      setHasError(false);
      setRankingData([]);

      try {
        const response = await fetch(`/api/rankings/${encodeURIComponent(activeGame)}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Ranking request failed with ${response.status}`);

        const data = await response.json();
        setRankingData(Array.isArray(data) ? data : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(t(lang, "rankings.error.network"), error);
        setRankingData([]);
        setHasError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchRanking();
    return () => controller.abort();
  }, [activeGame, isUserLoading, lang, refreshToken, userInfo?.isGuest]);

  const getEntryAriaLabel = (entry: RankingEntry, index: number) => (
    `${index + 1}. ${entry.username}, ` +
    `${entry.wins ?? 0} ${t(lang, "rankings.columns.wins").toLowerCase()}, ` +
    `${getPoints(entry)} ${t(lang, "rankings.columns.points").toLowerCase()}`
  );

  return (
    <main id="main-content" className="game-page-shell rankings-shell">
      <ReturnArrow href="/" text={t(lang, "arrow")} />

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

      <div className="rankings-frame z-10">
        {userInfo?.isGuest && !isUserLoading ? (
          <AccountRequiredState />
        ) : (
          <>
            <header className="rankings-header">
              <div className="rankings-header__copy">
                <p className="rankings-kicker">
                  <Trophy size={15} aria-hidden="true" />
                  {t(lang, "rankings.kicker")}
                </p>
                <h1>{t(lang, "rankings.title")}</h1>
                <p className="rankings-header__subtitle">{t(lang, "rankings.subtitle")}</p>
              </div>

              <aside className="rankings-header__signal" aria-label={t(lang, "rankings.active_game")}>
                <span className="rankings-header__signal-icon" aria-hidden="true">
                  <Gamepad2 size={20} />
                </span>
                <span className="rankings-header__signal-label">{t(lang, "rankings.active_game")}</span>
                <strong>{activeGameLabel}</strong>
                <span className="rankings-header__signal-count">
                  <Users size={14} aria-hidden="true" />
                  {rankingData.length} / 10 {t(lang, "rankings.top_players").toLowerCase()}
                </span>
              </aside>
            </header>

            <nav className="rankings-game-tabs" aria-label={t(lang, "rankings.game_selector")}>
              {allGames.map((game) => {
                const isActive = activeGame === game;
                return (
                  <button
                    key={game}
                    type="button"
                    aria-pressed={isActive}
                    className={`rankings-game-tab${isActive ? " is-active" : ""}`}
                    onClick={() => setActiveGame(game)}
                  >
                    <Gamepad2 size={16} aria-hidden="true" />
                    <span>{getGameLabel(lang, game)}</span>
                  </button>
                );
              })}
            </nav>

            <section className="rankings-board" aria-labelledby="rankings-board-title">
              <div className="rankings-board__heading">
                <div>
                  <p className="rankings-board__kicker">{t(lang, "rankings.board_kicker")}</p>
                  <h2 id="rankings-board-title">{activeGameLabel}</h2>
                </div>
                <p className="rankings-board__hint">{t(lang, "rankings.points_hint")}</p>
              </div>

              <div className="sr-only" role="status" aria-live="polite">
                {isResultsLoading ? t(lang, "rankings.loading") : hasError ? t(lang, "rankings.error.fetch_failed") : ""}
              </div>

              {isResultsLoading ? (
                <div className="rankings-skeleton" aria-hidden="true">
                  <div className="rankings-skeleton__leaders">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="rankings-skeleton__rows">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ) : hasError ? (
                <div className="rankings-empty-state" role="alert">
                  <span className="rankings-empty-state__icon" aria-hidden="true">
                    <RefreshCw size={22} />
                  </span>
                  <h3>{t(lang, "rankings.error.fetch_failed")}</h3>
                  <p>{t(lang, "rankings.error.network")}</p>
                  <button type="button" className="game-secondary-button" onClick={() => setRefreshToken((token) => token + 1)}>
                    <RefreshCw size={16} aria-hidden="true" />
                    {t(lang, "rankings.retry")}
                  </button>
                </div>
              ) : rankingData.length === 0 ? (
                <div className="rankings-empty-state">
                  <span className="rankings-empty-state__icon" aria-hidden="true">
                    <Medal size={22} />
                  </span>
                  <h3>{t(lang, "rankings.empty_title")}</h3>
                  <p>{t(lang, "rankings.empty_description")}</p>
                </div>
              ) : (
                <>
                  <div className="rankings-podium" aria-label={t(lang, "rankings.podium_label")}>
                    {leaders.map((entry, index) => {
                      const isCurrentUser = entry.username === userInfo?.nickname;
                      return (
                        <article
                          key={`${entry.username}-${index}`}
                          className={`rankings-podium__item is-place-${index + 1}${isCurrentUser ? " is-current" : ""}`}
                          aria-label={getEntryAriaLabel(entry, index)}
                        >
                          <div className="rankings-podium__place">
                            <Medal size={15} aria-hidden="true" />
                            <span>{index + 1}. {t(lang, "rankings.place")}</span>
                          </div>
                          <div className="rankings-podium__avatar">
                            <ProfileAvatar
                              avatarUrl={getAvatarUrl(entry)}
                              displayName={entry.username}
                              large={index === 0}
                            />
                          </div>
                          <strong className="rankings-podium__name">{entry.username}</strong>
                          {isCurrentUser && <span className="rankings-current-badge">{t(lang, "rankings.you")}</span>}
                          <div className="rankings-podium__stats">
                            <div>
                              <strong>{entry.wins ?? 0}</strong>
                              <span>{t(lang, "rankings.columns.wins")}</span>
                            </div>
                            <div>
                              <strong>{getPoints(entry)}</strong>
                              <span>{t(lang, "rankings.columns.points")}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {remainingPlayers.length > 0 && (
                    <>
                      <div className="rankings-list__header" aria-hidden="true">
                        <span>{t(lang, "rankings.columns.position")}</span>
                        <span>{t(lang, "rankings.columns.player")}</span>
                        <span>{t(lang, "rankings.columns.wins")}</span>
                        <span>{t(lang, "rankings.columns.points")}</span>
                      </div>
                      <ol className="rankings-list" start={4} aria-label={t(lang, "rankings.other_players")}>
                        {remainingPlayers.map((entry, index) => {
                          const rank = index + 4;
                          const isCurrentUser = entry.username === userInfo?.nickname;
                          return (
                            <li
                              key={`${entry.username}-${rank}`}
                              className={`rankings-list__row${isCurrentUser ? " is-current" : ""}`}
                              aria-label={getEntryAriaLabel(entry, rank - 1)}
                            >
                              <span className="rankings-list__position">{rank}.</span>
                              <span className="rankings-list__player">
                                <ProfileAvatar avatarUrl={getAvatarUrl(entry)} displayName={entry.username} />
                                <span className="rankings-list__name">{entry.username}</span>
                                {isCurrentUser && <span className="rankings-current-badge">{t(lang, "rankings.you")}</span>}
                              </span>
                              <strong className="rankings-list__metric">{entry.wins ?? 0}</strong>
                              <strong className="rankings-list__metric">{getPoints(entry)}</strong>
                            </li>
                          );
                        })}
                      </ol>
                    </>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

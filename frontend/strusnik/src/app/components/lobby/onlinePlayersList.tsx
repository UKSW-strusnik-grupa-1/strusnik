"use client";

import { Check, ChevronDown, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/app/hooks/useSocket";
import { useUser } from "@/app/hooks/useUser";
import { t } from "@/app/i18n";
import { useLang } from "@/app/lang";
import ProfileAvatar from "@/app/components/profile/ProfileAvatar";

interface OnlinePlayer {
  userId: string;
  username: string;
  hasAvatar?: boolean;
  status: "available" | "in_lobby" | "in_game";
  isGuest?: boolean;
}

interface OnlinePlayersListProps {
  inviteMode?: boolean;
  currentRoomId?: string;
  placement?: "bottom" | "top" | "lobby";
}

export default function OnlinePlayersList({
  inviteMode = false,
  currentRoomId,
  placement = "bottom",
}: OnlinePlayersListProps) {
  const { socket, isConnected } = useSocket();
  const { userInfo } = useUser();
  const { lang } = useLang();
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [invitedPlayers, setInvitedPlayers] = useState<Set<string>>(new Set());
  const isCompact = inviteMode && placement !== "lobby";
  const [isOpen, setIsOpen] = useState(!isCompact);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit("get_online_players");

    const handlePlayersUpdate = (data: OnlinePlayer[]) => setPlayers(data);
    socket.on("online_players_update", handlePlayersUpdate);

    return () => {
      socket.off("online_players_update", handlePlayersUpdate);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    if (!isCompact || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      setIsOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isCompact, isOpen]);

  const handleInvite = (targetUserId: string) => {
    if (!socket) return;

    socket.emit("send_invite", { targetUserId });
    setInvitedPlayers((current) => new Set(current).add(targetUserId));

    window.setTimeout(() => {
      setInvitedPlayers((current) => {
        const next = new Set(current);
        next.delete(targetUserId);
        return next;
      });
    }, 5000);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_game":
        return t(lang, "lobby.status_in_game");
      case "in_lobby":
        return t(lang, "lobby.status_in_lobby");
      default:
        return t(lang, "lobby.status_available");
    }
  };

  if (!userInfo) return null;

  const placementClass = `online-players-panel--${placement}`;
  const title = inviteMode ? t(lang, "lobby.invite_title") : t(lang, "lobby.players_title");
  const panelId = `online-players-panel-${placement}`;
  const titleId = `online-players-title-${placement}`;

  const panel = (
    <section
      ref={isCompact ? panelRef : undefined}
      id={panelId}
      data-current-room-id={currentRoomId}
      className={`online-players-panel ${placementClass}${isCompact ? " online-players-panel--popover" : ""}`}
      aria-labelledby={titleId}
    >
      <header className="online-players-header">
        <div>
          <h2 id={titleId}>{title}</h2>
        </div>
        <div className="online-players-header-actions">
          <span className="online-players-count">{players.length}</span>
          {isCompact && (
            <button
              type="button"
              className="online-players-close"
              onClick={() => {
                setIsOpen(false);
                window.requestAnimationFrame(() => triggerRef.current?.focus());
              }}
              aria-label={t(lang, "lobby.players_close")}
            >
              <X size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <div className="online-players-list" role="list" aria-label={title}>
        {players.length === 0 ? (
          <p className="online-players-empty">{t(lang, "lobby.players_empty")}</p>
        ) : (
          players.map((player) => {
            const isMe = String(player.userId) === String(userInfo.userId);
            const canInvite = inviteMode && !isMe && player.status === "available";
            const wasInvited = invitedPlayers.has(player.userId);
            const avatarUrl = isMe
              ? userInfo.avatarUrl
              : player.hasAvatar && !player.isGuest
                ? `/api/profile/${encodeURIComponent(player.username)}/avatar`
                : null;
            const statusLabel = getStatusLabel(player.status);

            return (
              <div
                key={player.userId}
                role="listitem"
                aria-label={`${player.username}, ${statusLabel}${isMe ? ", Ty" : ""}`}
                className={`online-player-row${isMe ? " is-current" : ""}`}
              >
                <span className={`online-player-status online-player-status--${player.status}`} aria-hidden="true" />
                <ProfileAvatar avatarUrl={avatarUrl} displayName={player.username} />

                <div className="online-player-copy">
                  <span className="online-player-name">{player.username}</span>
                  <span className="online-player-state">{statusLabel}</span>
                </div>

                {isMe && <span className="online-player-you">{t(lang, 'multiplayer.you')}</span>}

                {canInvite && (
                  <button
                    type="button"
                    onClick={() => handleInvite(player.userId)}
                    disabled={wasInvited}
                    aria-label={wasInvited ? t(lang, "lobby.invite_sent") : `${t(lang, "lobby.invite_player")} ${player.username}`}
                    className={`online-player-invite${wasInvited ? " is-sent" : ""}`}
                    title={t(lang, "lobby.invite_player")}
                  >
                    {wasInvited ? (
                      <Check size={16} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );

  if (!isCompact) return panel;

  return (
    <div className={`online-players-dock online-players-dock--${placement}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`online-players-launcher${isOpen ? " is-open" : ""}`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`${title}. ${isOpen ? t(lang, "lobby.players_close") : t(lang, "lobby.players_open")}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserPlus size={17} strokeWidth={2} aria-hidden="true" />
        <span>{title}</span>
        <span className="online-players-launcher__count">{players.length}</span>
        <ChevronDown className="online-players-launcher__chevron" size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {isOpen && panel}
    </div>
  );
}

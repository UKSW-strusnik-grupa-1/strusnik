"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { HaxballState } from "@/app/games/haxball/constants";

export interface HaxballInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  kick: boolean;
  sequence: number;
}

interface UseHaxballArgs {
  socket: Socket | null;
  roomId: string;
  userId: string;
  role: "player" | "observer";
  initialPassword?: string;
}

const initialInput: HaxballInputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  kick: false,
  sequence: 0,
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function directionToBooleans(x: number, y: number) {
  return {
    left: x < -0.22,
    right: x > 0.22,
    up: y < -0.22,
    down: y > 0.22,
  };
}

export function useHaxball({ socket, roomId, userId, role, initialPassword }: UseHaxballArgs) {
  const [gameState, setGameState] = useState<HaxballState | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isObserver, setIsObserver] = useState(role === "observer");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const inputRef = useRef<HaxballInputState>({ ...initialInput });
  const joinedRef = useRef(false);
  const kickTimeoutRef = useRef<number | null>(null);
  const gamepadFrameRef = useRef<number | null>(null);

  const emitInput = useCallback(() => {
    if (!socket || !roomId || !isJoined || role === "observer") return;
    const next = { ...inputRef.current, sequence: inputRef.current.sequence + 1 };
    inputRef.current = next;
    socket.emit("haxball_input", { roomId, input: next });
  }, [isJoined, role, roomId, socket]);

  const updateInput = useCallback((patch: Partial<HaxballInputState>) => {
    inputRef.current = { ...inputRef.current, ...patch };
  }, []);

  const setMovement = useCallback((x: number, y: number) => {
    updateInput(directionToBooleans(x, y));
  }, [updateInput]);

  const triggerKick = useCallback(() => {
    updateInput({ kick: true });
    // A kick is a discrete action. Send it immediately instead of waiting
    // for the next 30 Hz input interval, which makes shooting feel delayed.
    emitInput();
    if (kickTimeoutRef.current !== null) window.clearTimeout(kickTimeoutRef.current);
    kickTimeoutRef.current = window.setTimeout(() => {
      updateInput({ kick: false });
      kickTimeoutRef.current = null;
    }, 90);
  }, [emitInput, updateInput]);

  const emitJoin = useCallback((password?: string) => {
    if (!socket || !roomId) return;
    setJoinError(null);
    socket.emit("join_room", {
      game_name: "Haxball",
      room_id: roomId,
      password: password || undefined,
      role,
    });
  }, [role, roomId, socket]);

  const leaveRoom = useCallback(() => {
    if (!socket || !roomId || !joinedRef.current) return;
    joinedRef.current = false;
    setIsJoined(false);
    socket.emit("leave_room", { roomId });
  }, [roomId, socket]);

  const chooseTeam = useCallback((team: "red" | "blue") => {
    socket?.emit("haxball_choose_team", { roomId, team });
  }, [roomId, socket]);

  const setReady = useCallback((ready: boolean) => {
    socket?.emit("haxball_ready", { roomId, ready });
  }, [roomId, socket]);

  const startGame = useCallback(() => {
    socket?.emit("start_game", { roomId });
  }, [roomId, socket]);

  const updateSettings = useCallback((settings: { map_id?: string; duration_min?: number }) => {
    socket?.emit("haxball_update_settings", { roomId, ...settings });
  }, [roomId, socket]);

  const prepareRematch = useCallback(() => {
    socket?.emit("haxball_rematch", { roomId });
  }, [roomId, socket]);

  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    const handleJoinResponse = (payload: { success?: boolean; role?: string; room_data?: { host_id?: string }; message?: string; error_code?: string }) => {
      if (payload.success) {
        joinedRef.current = true;
        setIsJoined(true);
        setIsObserver(payload.role === "observer" || role === "observer");
        setHostId(payload.room_data?.host_id ? String(payload.room_data.host_id) : null);
        setJoinError(null);
        setPasswordModalOpen(false);
        setPasswordMessage("");
        return;
      }

      if (payload.error_code === "PASSWORD_REQUIRED") {
        setPasswordModalOpen(true);
        setPasswordMessage(String(payload.message || ""));
        return;
      }

      setJoinError(String(payload.message || "Nie udało się dołączyć do pokoju."));
    };

    const handleGameState = (state: HaxballState) => {
      if (!state || typeof state !== "object") return;
      setGameState(state);
    };

    const handleSocketError = (payload: { msg?: string; message?: string }) => {
      const message = payload?.msg || payload?.message;
      if (message) setJoinError(String(message));
    };

    const handleRoomClosed = () => {
      joinedRef.current = false;
      setIsJoined(false);
      setJoinError("Ten pokój został zamknięty.");
    };

    socket.on("join_room_response", handleJoinResponse);
    socket.on("game_state_update", handleGameState);
    socket.on("error", handleSocketError);
    socket.on("room_closed", handleRoomClosed);
    const joinTimer = window.setTimeout(() => emitJoin(initialPassword), 0);
    socket.emit("sync_state", { roomId });

    return () => {
      window.clearTimeout(joinTimer);
      socket.off("join_room_response", handleJoinResponse);
      socket.off("game_state_update", handleGameState);
      socket.off("error", handleSocketError);
      socket.off("room_closed", handleRoomClosed);
      if (joinedRef.current) socket.emit("leave_room", { roomId });
      joinedRef.current = false;
      setIsJoined(false);
    };
  }, [emitJoin, initialPassword, roomId, role, socket, userId]);

  useEffect(() => {
    if (!socket || !isJoined || role === "observer") return;
    const interval = window.setInterval(emitInput, 33);
    return () => window.clearInterval(interval);
  }, [emitInput, isJoined, role, socket]);

  useEffect(() => {
    if (!isJoined || role === "observer") return;

    const directionKeys: Record<string, "up" | "down" | "left" | "right"> = {
      w: "up",
      arrowup: "up",
      a: "left",
      arrowleft: "left",
      s: "down",
      arrowdown: "down",
      d: "right",
      arrowright: "right",
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const direction = directionKeys[key];
      if (direction || key === " ") event.preventDefault();
      if (direction) updateInput({ [direction]: true });
      if (key === " ") triggerKick();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const direction = directionKeys[event.key.toLowerCase()];
      if (direction) {
        event.preventDefault();
        updateInput({ [direction]: false });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isJoined, role, triggerKick, updateInput]);

  useEffect(() => {
    if (!isJoined || role === "observer" || typeof navigator === "undefined" || !navigator.getGamepads) return;
    let previousKick = false;

    const pollGamepad = () => {
      const gamepad = navigator.getGamepads()?.find(Boolean);
      if (gamepad) {
        const x = Math.abs(gamepad.axes[0] || 0) < 0.16 ? 0 : gamepad.axes[0] || 0;
        const y = Math.abs(gamepad.axes[1] || 0) < 0.16 ? 0 : gamepad.axes[1] || 0;
        updateInput(directionToBooleans(x, y));
        const kickPressed = Boolean(gamepad.buttons[0]?.pressed);
        if (kickPressed && !previousKick) triggerKick();
        previousKick = kickPressed;
      }
      gamepadFrameRef.current = window.requestAnimationFrame(pollGamepad);
    };

    gamepadFrameRef.current = window.requestAnimationFrame(pollGamepad);
    return () => {
      if (gamepadFrameRef.current !== null) window.cancelAnimationFrame(gamepadFrameRef.current);
      gamepadFrameRef.current = null;
    };
  }, [isJoined, role, triggerKick, updateInput]);

  useEffect(() => () => {
    if (kickTimeoutRef.current !== null) window.clearTimeout(kickTimeoutRef.current);
  }, []);

  return {
    gameState,
    hostId,
    isJoined,
    isObserver,
    joinError,
    passwordModalOpen,
    passwordMessage,
    input: inputRef,
    emitJoin,
    leaveRoom,
    chooseTeam,
    setReady,
    startGame,
    updateSettings,
    prepareRematch,
    setMovement,
    triggerKick,
    closePasswordModal: () => setPasswordModalOpen(false),
  };
}

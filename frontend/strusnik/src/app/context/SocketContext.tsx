"use client"

import { createContext, useEffect, useState, useContext } from "react";
import { io, Socket } from "socket.io-client"
import { UserContext } from "../context/UserContext";
import { useNotification } from "./NotificationsContext";

const SOCKET_URL = "http://localhost:5000"

interface ActiveGameInfo {
    gameName: string;
    roomId: string;
    roomName?: string;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    activeGame: ActiveGameInfo | null;
    setActiveGame: (game: ActiveGameInfo | null) => void;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState<boolean>(false)
    const [activeGame, setActiveGame] = useState<ActiveGameInfo | null>(null)

    const userContext = useContext(UserContext);
    const { notify } = useNotification();

    useEffect(() => {
        if (!userContext?.userInfo) return;

        const newSocket = io(SOCKET_URL, {
            transports: ["websocket"],
            autoConnect: true,
            auth: {
                token: userContext.userInfo.userId,
                username: userContext.userInfo.nickname
            }
        })

        newSocket.on("connect", () => {
            console.log("connected")
            setIsConnected(true)
        })

        newSocket.on("connect_error", (err) => {
            setIsConnected(false);
            const msg = err instanceof Error ? err.message : "Błąd połączenia z serwerem";
            notify(msg, "error");
        });

        newSocket.on("error", (err: any) => {
            console.log("Socket error received:", err);

            let message = "Wystąpił błąd gniazda";

            if (err && typeof err === "object" && "msg" in err) {
                message = String(err.msg);
            }
            else if (err && typeof err === "object" && "message" in err) {
                message = String(err.message);
            }
            else if (typeof err === "string") {
                message = err;
            }
            else {
                try {
                    message = JSON.stringify(err);
                } catch (e) {
                    message = "Nieznany błąd krytyczny";
                }
            }

            notify(message, "error");
        });

        newSocket.on("disconnect", (reason) => {
            setIsConnected(false)
            if (reason !== "io client disconnect") {
                notify("Utracono połączenie z serwerem", "error");
            }
        })

        newSocket.on("error_message", (data: { message: string }) => {
            notify(data.message, "error");
        });

        newSocket.on("notification", (data: { message: string, type?: "info" | "success" }) => {
            notify(data.message, data.type || "info");
        });

        newSocket.on("game_invite", (data: { from: string }) => {
            notify(`Gracz ${data.from} zaprasza Cię do gry!`, "info");
        });

        newSocket.on("player_joined", (data: { username: string }) => {
            notify(`${data.username} dołączył do pokoju`, "success");
        });

        newSocket.on("your_active_game", (data: any) => {
            if (data && data.roomId && data.gameName) {
                setActiveGame({
                    gameName: data.gameName,
                    roomId: data.roomId,
                    roomName: data.roomName
                });
            } else {
                setActiveGame(null);
            }
        })

        newSocket.on("game_ended_timeout", () => {
            setActiveGame(null);
        })

        newSocket.on("admin_kick", (data: { user_id: string; reason: string }) => {
            if (userContext?.userInfo && String(userContext.userInfo.userId) === data.user_id) {
                notify(`Zostałeś wyrzucony przez administratora: ${data.reason}`, "error");
                setActiveGame(null);
                window.location.href = '/';
            }
        });

        newSocket.on("admin_ban", (data: { user_id: string; reason: string }) => {
            if (userContext?.userInfo && String(userContext.userInfo.userId) === data.user_id) {
                notify(`Zostałeś zbanowany: ${data.reason}`, "error");
                setActiveGame(null);
                window.location.href = '/';
            }
        });

        setSocket(newSocket)

        return () => {
            newSocket.disconnect()
        }
    }, [userContext?.userInfo, notify])

    return (
        <SocketContext.Provider value={{ socket, isConnected, activeGame, setActiveGame }}>
            {children}
        </SocketContext.Provider>
    )
}
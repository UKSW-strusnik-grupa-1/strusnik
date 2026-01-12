"use client"

import { createContext, useEffect, useState, useContext } from "react";
import { io, Socket } from "socket.io-client"
import { UserContext } from "../context/UserContext";

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
            setIsConnected(true)
        })

        newSocket.on("disconnect", () => {
            setIsConnected(false)
        })

        // Handle active game info from server on reconnect
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

        // Handle game ended - clear active game
        newSocket.on("game_ended_timeout", () => {
            setActiveGame(null);
        })

        setSocket(newSocket)

        return () => {
            newSocket.disconnect()
        }
    }, [userContext?.userInfo])

    return (
        <SocketContext.Provider value={{ socket, isConnected, activeGame, setActiveGame }}>
            {children}
        </SocketContext.Provider>
    )
}
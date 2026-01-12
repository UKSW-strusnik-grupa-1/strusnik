"use client"

import { createContext, useEffect, useState, useContext } from "react";
import { io, Socket } from "socket.io-client"
import { UserContext } from "../context/UserContext";
import { useNotification } from "./NotificationsContext";

const SOCKET_URL = "http://localhost:5000"

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider = ({children} : {children: React.ReactNode}) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState<boolean>(false)
    
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
            setIsConnected(true)
        })

        newSocket.on("disconnect", () => {
            setIsConnected(false)
            notify("Utracono połączenie z serwerem", "error");
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

        setSocket(newSocket)

        return () => {
            newSocket.disconnect()
        }
    }, [userContext?.userInfo, notify]) 

    return (
        <SocketContext.Provider value={{socket, isConnected}}>
            {children}
        </SocketContext.Provider>
    )
}
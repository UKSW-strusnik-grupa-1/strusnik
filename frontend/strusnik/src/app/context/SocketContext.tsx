"use client"

import { createContext, useEffect, useState, useContext } from "react";
import { io, Socket } from "socket.io-client"
import { UserContext } from "../context/UserContext";

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

        setSocket(newSocket)

        return () => {
            newSocket.disconnect()
        }
    }, [userContext?.userInfo])

    return (
        <SocketContext.Provider value={{socket, isConnected}}>
            {children}
        </SocketContext.Provider>
    )
}
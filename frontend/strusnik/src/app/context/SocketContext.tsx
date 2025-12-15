"use client"

import { createContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client"

const SOCKET_URL = "http://localhost:5000"

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider = ({children} : {children: React.ReactNode}) => {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState<boolean>(false)

    useEffect(() => {
        const newSocket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: true})

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
    }, [])

    return (
        <SocketContext.Provider value={{socket, isConnected}}>
            {children}
        </SocketContext.Provider>
    )
}
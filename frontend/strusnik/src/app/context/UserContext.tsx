"use client"

import React, { createContext, useEffect, useState } from "react";
import { User } from "../types/user";

interface UserContextType {
    userInfo: User | null;
    setUserInfo: React.Dispatch<React.SetStateAction<User | null>>;
    isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({children} : {children : React.ReactNode}) => {

    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("/api/auth/parse", {
                    method: "GET",
                })
                
                if (response.ok) {
                    const data = await response.json();
                    setUserInfo({userId: data.user_id, nickname: data.login});
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }; 
        fetchData();
    }, [])

    return (
        <UserContext.Provider value={{userInfo, setUserInfo, isLoading}}>
            {children}
        </UserContext.Provider>
    )
}
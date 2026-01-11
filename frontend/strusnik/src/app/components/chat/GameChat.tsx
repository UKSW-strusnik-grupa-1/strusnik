'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Minimize2 } from 'lucide-react';

interface ChatMessage {
    sender: string;
    text: string;
    timestamp: number;
    isSystem: boolean;
    sid: string;
}

interface GameChatProps {
    socket: any;
    roomId: string;
    myId: string;
    myName: string;
    width?: string;
    height?: string;
    className?: string;
    headerClassName?: string;
    bubbleClassName?: string;
    isBubble?: boolean; 
}

export function GameChat({ 
    socket, 
    roomId, 
    myId, 
    myName, 
    width, 
    height = "250px",   
    className = "w-[140px] md:w-[220px] lg:w-[300px] mr-1 bg-[#000000]/30 backdrop-blur-md border-l border-r border-[#353434] bottom-0 right-0",
    headerClassName = "bg-[#000]/20 border-b border-[#353434]",
    bubbleClassName = "absolute bottom-4 right-3 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full transition-all group shadow-lg cursor-pointer z-20",
    isBubble = false 
}: GameChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    
    const [isOpen, setIsOpen] = useState(!isBubble);
    const [hasUnread, setHasUnread] = useState(false);
    
    const [isRateLimited, setIsRateLimited] = useState(false);
    const sentTimestamps = useRef<number[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg: ChatMessage) => {
            setMessages((prev) => [...prev, msg]);
            if (isBubble && !isOpen) {
                setHasUnread(true);
            }
        };

        socket.on('chat_message_update', handleMessage);

        return () => {
            socket.off('chat_message_update', handleMessage);
        };
    }, [socket, isBubble, isOpen]);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            if (isBubble) setHasUnread(false);
        }
    }, [messages, isOpen, isBubble]);

    const handleSend = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (isRateLimited || !inputMsg.trim() || !socket) return;

        const now = Date.now();
        
        const recentMessages = sentTimestamps.current.filter(t => now - t < 5000);

        socket.emit('send_chat_message', { roomId, message: inputMsg.trim() });
        setInputMsg("");

        const newTimestamps = [...recentMessages, now];
        sentTimestamps.current = newTimestamps;

        if (newTimestamps.length >= 3) {
            setIsRateLimited(true);
            
            const oldestMessageTime = newTimestamps[0];
            const unlockTime = oldestMessageTime + 5000;
            const timeToWait = unlockTime - now;

            setTimeout(() => {
                setIsRateLimited(false);
            }, timeToWait > 0 ? timeToWait : 0);
        }
    };

    if (isBubble && !isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className={bubbleClassName}
            >
                <MessageCircle className="text-white w-5 h-5 md:w-6 md:h-6" />
                {hasUnread && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full border border-black" />
                )}
            </button>
        );
    }

    return (
        <div 
            className={`absolute z-50 flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ${className}`}
            style={{ width, height }}
        >
            
            {isBubble ? (
                <div className={`flex items-center justify-between px-3 py-2 ${headerClassName}`}>
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider flex gap-2 items-center">
                        <MessageCircle size={12}/> CHAT
                    </span>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <Minimize2 size={14} />
                    </button>
                </div>
            ) : (
                <div className="h-px w-full bg-[#353434]"></div>
            )}

            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center opacity-30">
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest">Czat</p>
                    </div>
                )}
                
                {messages.map((msg, idx) => {
                    const isMe = msg.sender === myName;
                    
                    if (msg.isSystem) {
                        return (
                            <div key={idx} className="text-center text-[9px] text-gray-500 my-0.5 font-mono uppercase">
                                {msg.text}
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && <span className="text-[9px] text-gray-500 ml-1 leading-none mb-0.5">{msg.sender}</span>}
                            <div className={`
                                max-w-[95%] px-2 py-1 rounded text-xs wrap-break-word border
                                ${isMe 
                                    ? 'bg-[#353434]/80 text-gray-200 border-gray-600' 
                                    : 'bg-black/40 text-gray-300 border-[#353434]'}
                            `}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-1.5 bg-[#000000]/60 border-t border-[#353434] flex gap-1">
                <input 
                    type="text" 
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    disabled={isRateLimited}
                    placeholder={isRateLimited ? "Limit..." : "Napisz..."}
                    className={`flex-1 bg-black/40 border border-[#353434] rounded text-gray-200 text-[10px] px-2 py-1 focus:outline-none focus:border-gray-500 transition-colors placeholder:text-gray-600 ${isRateLimited ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button 
                    type="submit"
                    disabled={!inputMsg.trim() || isRateLimited}
                    className={`px-2 border border-[#353434] rounded transition-colors flex items-center justify-center
                        ${isRateLimited 
                            ? 'bg-red-900/20 text-red-500 cursor-not-allowed opacity-50' 
                            : 'bg-[#353434]/30 hover:bg-[#353434]/60 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                        }`}
                >
                    <Send size={12} />
                </button>
            </form>
        </div>
    );
}
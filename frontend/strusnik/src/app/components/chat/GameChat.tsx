'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Minimize2 } from 'lucide-react';
import { stripPolishDiacritics } from '@/app/utils/copy';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface ChatMessage {
    sender: string;
    text: string;
    timestamp: number;
    isSystem: boolean;
    sid: string;
}

interface ChatSocket {
    id?: string;
    on: (event: string, handler: (message: ChatMessage) => void) => void;
    off: (event: string, handler: (message: ChatMessage) => void) => void;
    emit: (event: string, data: Record<string, unknown>) => void;
}

type GameChatVariant = 'waiting' | 'game';

interface GameChatProps {
    socket: ChatSocket | null;
    roomId: string;
    myId: string;
    myName: string;
    width?: string;
    height?: string;
    className?: string;
    headerClassName?: string;
    bubbleClassName?: string;
    isBubble?: boolean;
    variant?: GameChatVariant;
}

export function GameChat({ 
    socket, 
    roomId, 
    myId, 
    myName, 
    width, 
    height = "250px",
    className = "",
    headerClassName = "",
    bubbleClassName = "",
    isBubble = false,
    variant = 'waiting',
}: GameChatProps) {
    const { lang } = useLang();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");

    const [isOpen, setIsOpen] = useState(!isBubble);
    const [hasUnread, setHasUnread] = useState(false);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const sentTimestamps = useRef<number[]>([]);
    const rateLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatPanelId = `game-chat-panel-${roomId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg: ChatMessage) => {
            setMessages((prev) => [...prev, msg].slice(-100));
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
        if (isOpen && messages.length > 0) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen && isBubble) {
            inputRef.current?.focus({ preventScroll: true });
        }
    }, [isOpen, isBubble]);

    useEffect(() => {
        return () => {
            if (rateLimitTimeoutRef.current) {
                clearTimeout(rateLimitTimeoutRef.current);
            }
        };
    }, []);

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

            if (rateLimitTimeoutRef.current) {
                clearTimeout(rateLimitTimeoutRef.current);
            }
            rateLimitTimeoutRef.current = setTimeout(() => {
                setIsRateLimited(false);
                rateLimitTimeoutRef.current = null;
            }, timeToWait > 0 ? timeToWait : 0);
        }
    };

    if (isBubble && !isOpen) {
        return (
            <button 
                data-player-id={myId}
                onClick={() => {
                    setIsOpen(true);
                    setHasUnread(false);
                }}
                type="button"
                aria-label={hasUnread ? `${t(lang, 'chat.open')}, ${t(lang, 'chat.unread')}` : t(lang, 'chat.open')}
                aria-controls={chatPanelId}
                aria-expanded={isOpen}
                className={`${bubbleClassName} game-chat__bubble game-chat--${variant}`}
            >
                <MessageCircle aria-hidden="true" />
                {hasUnread && (
                    <span className="game-chat__unread" aria-hidden="true" />
                )}
            </button>
        );
    }

    return (
        <div 
            data-player-id={myId}
            id={chatPanelId}
            className={`game-chat game-chat--${variant} absolute z-50 flex flex-col overflow-hidden ${className}`}
            style={variant === 'game' ? undefined : { width, height }}
        >
            
            {isBubble || variant === 'game' ? (
                <div className={`game-chat__header flex items-center justify-between px-3 py-2 ${headerClassName}`}>
                    <div className="game-chat__heading">
                        <span className="game-chat__status" aria-hidden="true" />
                        <div className="game-chat__heading-copy">
                            <span className="game-chat__title">
                                <MessageCircle className="game-chat__title-icon" aria-hidden="true" />
                                {t(lang, 'chat.title')}
                            </span>
                            <span className="game-chat__subtitle">{t(lang, 'chat.subtitle')}</span>
                        </div>
                    </div>
                    {isBubble && (
                        <button type="button" onClick={() => setIsOpen(false)} aria-label={t(lang, 'chat.close')} className="game-chat__close touch-target">
                            <Minimize2 size={14} aria-hidden="true" />
                        </button>
                    )}
                </div>
            ) : (
                <div className="game-chat__rule" aria-hidden="true"></div>
            )}

            <div className="game-chat__messages flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 custom-scrollbar" role="log" aria-label={t(lang, 'chat.title')} aria-live="polite" aria-relevant="additions text">
                {messages.length === 0 && (
                    <div className="game-chat__empty flex-1 flex items-center justify-center" role="status">
                        <MessageCircle aria-hidden="true" />
                        <p>{t(lang, 'chat.empty')}</p>
                        <span>{t(lang, 'chat.empty_hint')}</span>
                    </div>
                )}
                
                {messages.map((msg, idx) => {
                    const isMe = socket?.id ? msg.sid === socket.id : msg.sender === myName;
                    
                    if (msg.isSystem) {
                        return (
                            <div key={idx} className="game-chat__system-message">
                                {stripPolishDiacritics(msg.text)}
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className={`game-chat__message-row ${isMe ? 'is-own' : 'is-other'}`}>
                            {!isMe && <span className="game-chat__sender">{msg.sender}</span>}
                            <div className="game-chat__message">
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="game-chat__composer p-1.5 flex gap-1">
                <label htmlFor={`chat-message-${roomId}`} className="sr-only">{t(lang, 'chat.input_label')}</label>
                <input 
                    ref={inputRef}
                    id={`chat-message-${roomId}`}
                    type="text"
                    maxLength={500}
                    autoComplete="off"
                    enterKeyHint="send"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    disabled={isRateLimited}
                    placeholder={isRateLimited ? t(lang, 'chat.rate_limit') : t(lang, 'chat.placeholder')}
                    className={`game-chat__input flex-1 ${isRateLimited ? 'is-rate-limited' : ''}`}
                />
                <button 
                    type="submit"
                    disabled={!inputMsg.trim() || isRateLimited}
                    aria-label={t(lang, 'chat.send')}
                    className={`game-chat__send flex items-center justify-center ${isRateLimited ? 'is-rate-limited' : ''}`}
                >
                    <Send size={16} strokeWidth={2} aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}
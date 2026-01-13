"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type NotificationType = "info" | "success" | "error" | "warning";

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

const removePolishChars = (text: string): string => {
  const map: { [key: string]: string } = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
};

const getTypeStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return {
        iconColor: 'text-emerald-400',
        glow: 'shadow-[0_0_20px_-5px_rgba(52,211,153,0.4)]',
        border: 'border-emerald-500/20',
        progress: 'bg-emerald-500',
        title: 'Sukces'
      };
    case 'error':
      return {
        iconColor: 'text-rose-400',
        glow: 'shadow-[0_0_20px_-5px_rgba(251,113,133,0.4)]',
        border: 'border-rose-500/20',
        progress: 'bg-rose-500',
        title: 'Blad'
      };
    case 'warning':
      return {
        iconColor: 'text-amber-400',
        glow: 'shadow-[0_0_20px_-5px_rgba(251,191,36,0.4)]',
        border: 'border-amber-500/20',
        progress: 'bg-amber-500',
        title: 'Uwaga'
      };
    default:
      return {
        iconColor: 'text-blue-400',
        glow: 'shadow-[0_0_20px_-5px_rgba(96,165,250,0.4)]',
        border: 'border-blue-500/20',
        progress: 'bg-blue-500',
        title: 'Informacja'
      };
  }
};

const Icons = {
  success: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

const NotificationToast = ({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: (id: number) => void; 
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const styles = getTypeStyles(notification.type);

  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isPaused]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(notification.id), 300);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        relative overflow-hidden
        pointer-events-auto cursor-pointer 
        flex items-start gap-4
        p-4 rounded-2xl
        bg-black/60 backdrop-blur-xl
        border ${styles.border}
        shadow-lg ${styles.glow}
        transition-all duration-300 ease-out
        group
        ${isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        hover:scale-[1.02] hover:bg-black/70
      `}
      style={{ minWidth: "320px", maxWidth: "420px" }}
      onClick={handleClose}
    >
      <div className={`mt-0.5 shrink-0 ${styles.iconColor} p-2 rounded-full bg-white/5 border border-white/5`}>
        {notification.type === 'error' ? Icons.error : 
         notification.type === 'warning' ? Icons.warning : 
         notification.type === 'success' ? Icons.success : Icons.info}
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <span className={`text-xs font-bold uppercase tracking-widest ${styles.iconColor}`}>
          {styles.title}
        </span>
        <span className="text-gray-200 text-sm font-medium leading-relaxed">
          {notification.message}
        </span>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        className="shrink-0 text-gray-500 hover:text-white transition-colors p-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/10">
        <div 
          className={`h-full ${styles.progress} origin-left`}
          style={{
            animation: isPaused ? 'none' : 'shrink-progress 5s linear forwards'
          }}
        />
      </div>
    </div>
  );
};


export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = "info") => {
    const id = Date.now();
    const cleanMessage = removePolishChars(message);
    
    setNotifications((prev) => [...prev, { id, message: cleanMessage, type }]);
  }, []);

  const closeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      <style>{`
        @keyframes shrink-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>

      {children}
      
      <div className="fixed bottom-6 right-6 z-9999 flex flex-col gap-3 pointer-events-none p-4">
        {notifications.map((note) => (
          <NotificationToast 
            key={note.id} 
            notification={note} 
            onClose={closeNotification} 
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
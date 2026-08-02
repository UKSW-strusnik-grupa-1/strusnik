"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { useLang } from "../lang";
import { t } from "../i18n";

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

const Icons = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

const NotificationToast = ({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: (id: number) => void;
}) => {
  const { lang } = useLang();
  const [isClosing, setIsClosing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const Icon = Icons[notification.type];

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => onClose(notification.id), 300);
  }, [notification.id, onClose]);

  useEffect(() => {
    if (isPaused || notification.type === "error") return;

    const timer = window.setTimeout(handleClose, 5000);
    return () => window.clearTimeout(timer);
  }, [handleClose, isPaused, notification.type]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <article
      className={`notification-toast notification-toast--${notification.type}${isClosing ? " notification-toast--closing" : ""}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role={notification.type === "error" ? "alert" : "status"}
      aria-live={notification.type === "error" ? "assertive" : "polite"}
    >
      <div className="notification-toast__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </div>

      <div className="notification-toast__content">
        <span className="notification-toast__title">
          {t(lang, `notifications.${notification.type}`)}
        </span>
        <p className="notification-toast__message">{notification.message}</p>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="notification-toast__close"
        aria-label={t(lang, "notifications.close")}
      >
        <X size={17} aria-hidden="true" />
      </button>

      {notification.type !== "error" && (
        <span
          className="notification-toast__progress"
          aria-hidden="true"
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
        />
      )}
    </article>
  );
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((message: string, type: NotificationType = "info") => {
    nextId.current += 1;
    setNotifications((previous) => [...previous, { id: nextId.current, message, type }]);
  }, []);

  const closeNotification = useCallback((id: number) => {
    setNotifications((previous) => previous.filter((notification) => notification.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="notification-viewport">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={closeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

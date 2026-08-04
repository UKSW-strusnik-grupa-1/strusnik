"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "reduced-motion";

type MotionContextValue = {
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
};

const MotionContext = createContext<MotionContextValue | null>(null);

function applyReducedMotion(enabled: boolean) {
  if (enabled) document.documentElement.dataset.reducedMotion = "true";
  else delete document.documentElement.dataset.reducedMotion;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotionState] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const enabled = saved === "true" || (saved === null && mediaQuery.matches);
    // Hydrate the persisted preference after the browser exposes localStorage and media queries.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotionState(enabled);
    applyReducedMotion(enabled);

    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(STORAGE_KEY) === null) {
        setReducedMotionState(event.matches);
        applyReducedMotion(event.matches);
      }
    };

    mediaQuery.addEventListener?.("change", handleSystemChange);
    return () => mediaQuery.removeEventListener?.("change", handleSystemChange);
  }, []);

  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    applyReducedMotion(enabled);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // The setting still applies for the current session when storage is unavailable.
    }
  };

  return (
    <MotionContext.Provider value={{ reducedMotion, setReducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
}

export function useMotionPreference() {
  const context = useContext(MotionContext);
  if (!context) throw new Error("useMotionPreference must be used within a MotionProvider");
  return context;
}

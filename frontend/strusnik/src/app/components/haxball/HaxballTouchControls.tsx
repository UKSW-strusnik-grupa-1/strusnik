"use client";

import { useRef, type PointerEvent } from "react";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";

interface HaxballTouchControlsProps {
  onMovement: (x: number, y: number) => void;
  onKick: () => void;
}

export default function HaxballTouchControls({ onMovement, onKick }: HaxballTouchControlsProps) {
  const { lang } = useLang();
  const joystickRef = useRef<HTMLButtonElement>(null);

  const updateFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const element = joystickRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = Math.min(rect.width, rect.height) / 2;
    const x = Math.max(-1, Math.min(1, (event.clientX - centerX) / radius));
    const y = Math.max(-1, Math.min(1, (event.clientY - centerY) / radius));
    onMovement(x, y);
  };

  const resetMovement = () => onMovement(0, 0);

  return (
    <div className="haxball-touch-controls" role="group" aria-label={t(lang, "haxball.touch")}>
      <button
        ref={joystickRef}
        type="button"
        className="haxball-joystick"
        aria-label={t(lang, "haxball.touch")}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
        }}
        onPointerUp={resetMovement}
        onPointerCancel={resetMovement}
        onKeyDown={(event) => {
          const directions: Record<string, [number, number]> = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
          };
          const direction = directions[event.key];
          if (!direction) return;
          event.preventDefault();
          onMovement(direction[0], direction[1]);
        }}
        onKeyUp={(event) => {
          if (event.key.startsWith("Arrow")) {
            event.preventDefault();
            resetMovement();
          }
        }}
      >
        <span className="haxball-joystick__ring" aria-hidden="true" />
        <span className="haxball-joystick__knob" aria-hidden="true" />
      </button>
      <button type="button" className="haxball-kick-button" onClick={onKick}>
        <span aria-hidden="true">✦</span>
        <span>KICK</span>
      </button>
    </div>
  );
}

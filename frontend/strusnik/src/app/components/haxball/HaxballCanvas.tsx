"use client";

import { useEffect, useRef } from "react";
import type { HaxballState, HaxballTeam } from "@/app/games/haxball/constants";

interface HaxballCanvasProps {
  state: HaxballState;
  userId: string;
  label: string;
}

const colors: Record<HaxballTeam, string> = {
  red: "#f06a78",
  blue: "#65a8f8",
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.beginPath();
  ctx.rect(x, y, width, height);
}

const MAX_EXTRAPOLATION_MS = 100;

export default function HaxballCanvas({ state, userId, label }: HaxballCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const stateReceivedAtRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
    stateReceivedAtRef.current = performance.now();
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;

    const resize = () => {
      // `body` uses CSS zoom for the app density. Measuring the visual rect and
      // writing it back as an inline CSS size applies that zoom twice, leaving
      // the canvas stuck in the top-left corner of the arena. Keep the CSS size
      // owned by the stylesheet and use the wrapper's layout dimensions for the
      // backing bitmap instead.
      canvas.style.removeProperty("width");
      canvas.style.removeProperty("height");
      const rect = wrapper.getBoundingClientRect();
      const zoom = Number.parseFloat(window.getComputedStyle(wrapper).zoom || "1") || 1;
      width = Math.max(1, wrapper.clientWidth || Math.round(rect.width / zoom));
      height = Math.max(1, wrapper.clientHeight || Math.round(rect.height / zoom));
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
    };

    const draw = () => {
      const current = stateRef.current;
      const field = current.field;
      const elapsedSeconds = stateReceivedAtRef.current > 0
        ? Math.min(Math.max(performance.now() - stateReceivedAtRef.current, 0), MAX_EXTRAPOLATION_MS) / 1000
        : 0;
      const scale = Math.min(width / field.width, height / field.height);
      const arenaWidth = field.width * scale;
      const arenaHeight = field.height * scale;
      const offsetX = (width - arenaWidth) / 2;
      const offsetY = (height - arenaHeight) / 2;
      const x = (value: number) => offsetX + value * scale;
      const y = (value: number) => offsetY + value * scale;

      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      // Keep the area outside the pitch transparent so the Strusnik background
      // remains visible around the match.
      context.clearRect(0, 0, width, height);

      context.fillStyle = "#181818";
      roundedRect(context, offsetX, offsetY, arenaWidth, arenaHeight, 18);
      context.fill();
      context.strokeStyle = "rgba(233,236,243,0.2)";
      context.lineWidth = 1;
      context.stroke();

      context.save();
      context.beginPath();
      roundedRect(context, offsetX, offsetY, arenaWidth, arenaHeight, 18);
      context.clip();

      context.strokeStyle = "rgba(233,236,243,0.16)";
      context.lineWidth = Math.max(1, scale * 4);
      context.beginPath();
      context.moveTo(x(field.width / 2), y(0));
      context.lineTo(x(field.width / 2), y(field.height));
      context.stroke();

      context.beginPath();
      context.arc(x(field.width / 2), y(field.height / 2), scale * 165, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "#ff8a3d";
      context.beginPath();
      context.arc(x(field.width / 2), y(field.height / 2), Math.max(2, scale * 8), 0, Math.PI * 2);
      context.fill();

      const goalTop = (field.height - field.goal_width) / 2;
      context.fillStyle = "rgba(255,138,61,0.12)";
      context.strokeStyle = "rgba(255,138,61,0.8)";
      context.lineWidth = Math.max(1, scale * 4);
      context.fillRect(offsetX, y(goalTop), Math.max(8, scale * 90), scale * field.goal_width);
      context.strokeRect(offsetX, y(goalTop), Math.max(8, scale * 90), scale * field.goal_width);
      context.fillRect(x(field.width) - Math.max(8, scale * 90), y(goalTop), Math.max(8, scale * 90), scale * field.goal_width);
      context.strokeRect(x(field.width) - Math.max(8, scale * 90), y(goalTop), Math.max(8, scale * 90), scale * field.goal_width);

      for (const obstacle of field.obstacles) {
        context.fillStyle = "#313131";
        roundedRect(context, x(obstacle.x), y(obstacle.y), obstacle.width * scale, obstacle.height * scale, Math.max(3, scale * 10));
        context.fill();
        context.strokeStyle = "rgba(255,138,61,0.42)";
        context.stroke();
      }

      for (const player of current.players) {
        const isMe = String(player.userId) === String(userId);
        // State arrives in discrete network snapshots. Extrapolating briefly
        // from the latest authoritative velocity removes the visible 20 to 30
        // Hz stepping without letting a stale connection move objects forever.
        const predictedX = player.x + player.vx * elapsedSeconds;
        const predictedY = player.y + player.vy * elapsedSeconds;
        const playerColor = player.team ? colors[player.team] : "#bac0c9";
        context.fillStyle = playerColor;
        context.beginPath();
        context.arc(x(predictedX), y(predictedY), Math.max(7, scale * field.player_radius), 0, Math.PI * 2);
        context.fill();
        if (isMe) {
          context.strokeStyle = "#ffffff";
          context.lineWidth = Math.max(2, scale * 6);
          context.stroke();
        }
        context.fillStyle = "#111111";
        context.font = `${Math.max(10, scale * 26)}px system-ui, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(player.name.slice(0, 2).toUpperCase(), x(predictedX), y(predictedY));
      }

      const predictedBallX = current.ball.x + current.ball.vx * elapsedSeconds;
      const predictedBallY = current.ball.y + current.ball.vy * elapsedSeconds;
      context.fillStyle = "#f1f4f7";
      context.beginPath();
      context.arc(x(predictedBallX), y(predictedBallY), Math.max(5, scale * field.ball_radius), 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(0,0,0,0.4)";
      context.lineWidth = Math.max(1, scale * 3);
      context.stroke();
      context.restore();

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    frame = window.requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [userId]);

  return (
    <div ref={wrapperRef} className="haxball-canvas-wrap">
      <canvas ref={canvasRef} className="haxball-canvas" role="img" aria-label={label} />
      <span className="sr-only">
        {label}. {state.players.map((player) => `${player.name}: ${player.team ?? "bez drużyny"}`).join(", ")}
      </span>
    </div>
  );
}

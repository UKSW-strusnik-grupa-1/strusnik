"use client";

import ReturnArrow from "@/app/components/lobby/returnArrow";
import { useSnake } from "@/app/hooks/useSnake";
import React, { useLayoutEffect, useRef, useState } from "react";

type BoardMetrics = {
  cell: number;
  inner: number;
  left: number;
  top: number;
};

type GridRect = { x: number; y: number; w: number; h: number };

const BOARD_IMG = { w: 644, h: 630 };

const GRID_RECT: GridRect = {
  x: 87 / BOARD_IMG.w,
  y: 56 / BOARD_IMG.h,
  w: 468 / BOARD_IMG.w,
  h: 468 / BOARD_IMG.h,
};

function useSnappedBoard(
  ref: React.RefObject<HTMLDivElement | null>,
  boardSize: number,
  img: { w: number; h: number },
  grid: GridRect
) {
  const [m, setM] = useState<BoardMetrics | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width: elW, height: elH } = entry.contentRect;

      const scale = Math.min(elW / img.w, elH / img.h);
      const drawW = img.w * scale;
      const drawH = img.h * scale;

      const imgOffX = (elW - drawW) / 2;
      const imgOffY = (elH - drawH) / 2;

      const gridW0 = drawW * grid.w;
      const gridH0 = drawH * grid.h;

      const cell = Math.max(1, Math.floor(Math.min(gridW0, gridH0) / boardSize));
      const inner = cell * boardSize;

      const extraX = gridW0 - inner;
      const extraY = gridH0 - inner;

      const left = Math.round(imgOffX + drawW * grid.x + extraX / 2) + 2;
      const top = Math.round(imgOffY + drawH * grid.y + extraY / 2) + 3;

      setM({ cell, inner, left, top });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, boardSize, img.w, img.h, grid.x, grid.y, grid.w, grid.h]);

  return m;
}

export default function SnakePage() {
  const {
    BOARD_SIZE,
    snake,
    food,
    gameStatus,
    score,
    isSubmittingScore,
    startGame,
    resetGame,
  } = useSnake();

  const isSnakeCell = (x: number, y: number) =>
    snake.some((seg) => seg.x === x && seg.y === y);

  const isFoodCell = (x: number, y: number) => food.x === x && food.y === y;

  const plankClass =
    "w-full h-16 bg-no-repeat bg-center bg-cover flex items-center justify-center text-white font-extrabold tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]";

  const boardRef = useRef<HTMLDivElement | null>(null);

  const metrics = useSnappedBoard(boardRef, BOARD_SIZE, BOARD_IMG, GRID_RECT);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute w-full h-screen flex flex-col overflow-visible">
        <ReturnArrow href="/singleplayer" text="WYJDZ" />
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 w-[min(680px,92vw)]">
          <div
            className={plankClass}
            style={{ backgroundImage: "url('/main/button.png')" }}
          >
            <span className="text-lg">
              WYNIK: {score}
              {isSubmittingScore && " ..."}
            </span>
          </div>

          <div
            ref={boardRef}
            className="relative aspect-square w-[min(680px,92vw,calc(100vh-260px))] bg-no-repeat bg-center bg-contain"
            style={{ backgroundImage: "url('/snake/board.png')" }}
          >
            {metrics && (
              <div
                className="absolute"
                style={{
                  left: metrics.left,
                  top: metrics.top,
                  width: metrics.inner,
                  height: metrics.inner,
                }}
              >
                <div
                  className="grid"
                  style={{
                    width: metrics.inner,
                    height: metrics.inner,
                    gridTemplateColumns: `repeat(${BOARD_SIZE}, ${metrics.cell}px)`,
                    gridTemplateRows: `repeat(${BOARD_SIZE}, ${metrics.cell}px)`,
                  }}
                >
                  {Array.from({ length: BOARD_SIZE }).map((_, y) =>
                    Array.from({ length: BOARD_SIZE }).map((_, x) => {
                      const snakeHere = isSnakeCell(x, y);
                      const foodHere = isFoodCell(x, y);

                      return (
                        <div
                          key={`${x}-${y}`}
                          style={{ width: metrics.cell, height: metrics.cell }}
                          className={[
                            "bg-black/0",
                            snakeHere ? "bg-emerald-400" : "",
                            foodHere ? "bg-red-400" : "",
                          ].join(" ")}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {gameStatus === "NOT-STARTED" && (<button onClick={startGame} className={plankClass + " hover:brightness-110 transition"} style={{ backgroundImage: "url('/main/button.png')" }}>ZAGRAJ</button>)}
          {gameStatus === "STARTED" && (<button className={plankClass + " hover:brightness-110 transition"} style={{ backgroundImage: "url('/main/button.png')" }}>W TRAKCIE</button>)}
          {gameStatus === "FINISHED" && (<button onClick={startGame} className={plankClass + " hover:brightness-110 transition"} style={{ backgroundImage: "url('/main/button.png')" }}>ZAGRAJ PONOWNIE</button>)}
       
        </div>
      </div>
    </div>
  );
}

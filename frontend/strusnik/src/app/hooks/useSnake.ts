import { useEffect, useRef, useState } from "react";
import { useFetchWithNotify } from "./useFetchWithNotify";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Cell {
  x: number;
  y: number;
}

const BOARD_SIZE = 9;
const INITIAL_SPEED = 200;

const createInitialSnake = (): Cell[] => [
  { x: 3, y: 4 },
  { x: 2, y: 4 },
  { x: 1, y: 4 },
];

const INITIAL_SNAKE_LENGTH = createInitialSnake().length;

const randomFood = (snake: Cell[]): Cell => {
  while (true) {
    const x = Math.floor(Math.random() * BOARD_SIZE);
    const y = Math.floor(Math.random() * BOARD_SIZE);

    if (!snake.some((s) => s.x === x && s.y === y)) return { x, y };
  }
};

export type GameStatus = "NOT-STARTED" | "STARTED" | "FINISHED";

async function readJsonOrText(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export const useSnake = () => {
  const [uuid, setUuid] = useState<string | null>(null);
  const [snake, setSnake] = useState<Cell[]>(createInitialSnake);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [food, setFood] = useState<Cell>(() => randomFood(createInitialSnake()));
  const [gameStatus, setGameStatus] = useState<GameStatus>("NOT-STARTED");
  const [foodsEaten, setFoodsEaten] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  const fetchWithNotify = useFetchWithNotify();

  const score = foodsEaten * 100;

  const directionRef = useRef<Direction>("RIGHT");
  const dirQueueRef = useRef<Direction[]>([]);

  const isOpposite = (a: Direction, b: Direction) =>
    (a === "UP" && b === "DOWN") ||
    (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") ||
    (a === "RIGHT" && b === "LEFT");

  const enqueueDirection = (nextDir: Direction) => {
    if (gameStatus !== "STARTED") return;

    const q = dirQueueRef.current;
    const base = q.length ? q[q.length - 1] : directionRef.current;

    if (nextDir === base) return;
    if (isOpposite(base, nextDir)) return;
    if (q.length >= 2) return;

    q.push(nextDir);
  };

  const snakeRef = useRef<Cell[]>(snake);
  const foodRef = useRef<Cell>(food);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  const startGame = async () => {
    try {
      const data = await fetchWithNotify("/api/games/snake/start", {
        method: "POST",
        cache: "no-store",
      });

      if (!data) return;

      const initialSnake = createInitialSnake();

      setUuid((data as any)?.uuid ?? null);
      setSnake(initialSnake);
      setDirection("RIGHT");
      directionRef.current = "RIGHT";
      dirQueueRef.current = [];
      setFood(randomFood(initialSnake));
      setFoodsEaten(0);
      setSpeed(INITIAL_SPEED);
      setGameStatus("STARTED");
    } catch (err) {
      console.error(err);
    }
  };

  const resetGame = () => {
    const initialSnake = createInitialSnake();
    setSnake(initialSnake);
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    dirQueueRef.current = [];
    setFood(randomFood(initialSnake));
    setFoodsEaten(0);
    setSpeed(INITIAL_SPEED);
    setGameStatus("NOT-STARTED");
  };

  const finishGame = async (finalSnake: Cell[]) => {
    setGameStatus("FINISHED");
    dirQueueRef.current = [];

    const finalFoodsEaten = Math.max(0, finalSnake.length - INITIAL_SNAKE_LENGTH);
    setFoodsEaten(finalFoodsEaten);

    if (!uuid) return;

    try {
      setIsSubmittingScore(true);

      const data = await fetchWithNotify("/api/games/snake/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid, foodsEaten: finalFoodsEaten }),
        cache: "no-store",
      });

      if (!data) {
          throw new Error("Failed to submit score");
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus === "FINISHED") return;

      const k = e.key.toLowerCase();

      if (e.key === "ArrowUp" || k === "w") {
        enqueueDirection("UP");
      } else if (e.key === "ArrowDown" || k === "s") {
        enqueueDirection("DOWN");
      } else if (e.key === "ArrowLeft" || k === "a") {
        enqueueDirection("LEFT");
      } else if (e.key === "ArrowRight" || k === "d") {
        enqueueDirection("RIGHT");
      } else if (e.key === " " && gameStatus === "NOT-STARTED") {
        startGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStatus]);

  useEffect(() => {
    if (gameStatus !== "STARTED") return;

    const interval = setInterval(() => {
      const currentSnake = snakeRef.current;
      const currentFood = foodRef.current;
      const head = currentSnake[0];

      const queuedDir = dirQueueRef.current.shift();
      if (queuedDir) {
        directionRef.current = queuedDir;
        setDirection(queuedDir);
      }

      let newHead: Cell = { ...head };

      if (directionRef.current === "UP") newHead.y -= 1;
      if (directionRef.current === "DOWN") newHead.y += 1;
      if (directionRef.current === "LEFT") newHead.x -= 1;
      if (directionRef.current === "RIGHT") newHead.x += 1;

      if (
        newHead.x < 0 ||
        newHead.x >= BOARD_SIZE ||
        newHead.y < 0 ||
        newHead.y >= BOARD_SIZE
      ) {
        finishGame(currentSnake);
        return;
      }

      const ateFood = newHead.x === currentFood.x && newHead.y === currentFood.y;

      if (currentSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        finishGame(currentSnake);
        return;
      }

      const nextSnake = [newHead, ...currentSnake];
      if (!ateFood) nextSnake.pop();

      setSnake(nextSnake);

      if (ateFood) {
        setFoodsEaten((fe) => fe + 1);
        setFood(randomFood(nextSnake));
        setSpeed((sp) => Math.max(60, sp - 5));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [gameStatus, speed]);

  return {
    BOARD_SIZE,
    snake,
    food,
    direction,
    gameStatus,
    score,
    isSubmittingScore,
    startGame,
    resetGame,
  };
};

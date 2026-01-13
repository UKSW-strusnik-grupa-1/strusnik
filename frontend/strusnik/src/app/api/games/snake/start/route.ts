import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.API_URL ?? "http://localhost:5000";

const PREFIXES = (process.env.SNAKE_BACKEND_PREFIXES ??
  "/api/games/snake,/api/snake,/snake").split(",");

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function POST() {
  for (const p of PREFIXES) {
    const prefix = p.trim();
    if (!prefix) continue;

    const url =
      `${BACKEND_URL}` +
      (prefix.startsWith("/") ? prefix : `/${prefix}`) +
      "/start";

    try {
      const res = await fetch(url, { method: "POST", cache: "no-store" });

      if (res.status === 404) continue;

      const data = await safeJson(res);
      return NextResponse.json(data ?? {}, { status: res.status });
    } catch {
      continue;
    }
  }

  const uuid = randomUUID();
  return NextResponse.json(
    {
      uuid,
      boardWidth: 9,
      boardHeight: 9,
      gameStatus: "NOT-STARTED",
      _fallback: true,
    },
    { status: 201 }
  );
}

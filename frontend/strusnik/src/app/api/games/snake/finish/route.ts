import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();

  let parsed: any = null;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    parsed = null;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/games/snake/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyText,
      cache: "no-store",
    });

    const data = await safeJson(res);
    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (err) {
    const uuid = parsed?.uuid;
    const foodsEaten = parsed?.foodsEaten;

    if (uuid == null || foodsEaten == null || Number.isNaN(Number(foodsEaten))) {
      return NextResponse.json(
        { error: "uuid and foodsEaten are required" },
        { status: 400 }
      );
    }

    const fe = Math.max(0, Number(foodsEaten) | 0);
    return NextResponse.json(
      {
        uuid,
        foodsEaten: fe,
        score: fe * 100,
        gameStatus: "FINISHED",
        _fallback: true,
      },
      { status: 200 }
    );
  }
}

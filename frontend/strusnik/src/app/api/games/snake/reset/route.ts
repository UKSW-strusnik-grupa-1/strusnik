import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const res = await fetch("http://localhost:5000/api/games/snake/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Snake reset request failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game } = await params;

  try {
    const backendUrl = `${BACKEND}/api/rankings/${game}`;

    const res = await fetch(backendUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Failed to fetch from backend" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Ranking fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
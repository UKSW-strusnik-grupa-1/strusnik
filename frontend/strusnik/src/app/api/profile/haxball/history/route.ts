import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  const jwtToken = request.cookies.get("jwtToken")?.value;
  if (!jwtToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${BACKEND}/api/profile/haxball/history`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({ error: "Unable to read history." }));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to reach the profile service." }, { status: 502 });
  }
}

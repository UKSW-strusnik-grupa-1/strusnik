import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function forwardFriendsRequest(request: NextRequest, path: string) {
  const token = request.cookies.get("jwtToken")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const body = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();
    const response = await fetch(`${BACKEND}/api/friends${path}${new URL(request.url).search}`, {
      method: request.method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });
    const payload = await response.text();

    return new NextResponse(payload, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Backend connection failed" }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND = process.env.API_URL || "http://localhost:5000";

async function readResponse(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: "Backend returned an invalid response." };
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get("jwtToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(`${BACKEND}/api/auth/password`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    });

    return NextResponse.json(await readResponse(response), { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the authentication service.", code: "NETWORK_ERROR" },
      { status: 502 },
    );
  }
}

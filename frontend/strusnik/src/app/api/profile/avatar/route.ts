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

async function updateAvatar(request: NextRequest, method: "PUT" | "DELETE") {
  const jwtToken = request.cookies.get("jwtToken")?.value;
  if (!jwtToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = method === "PUT" ? await request.text() : undefined;
  const response = await fetch(`${BACKEND}/api/profile/avatar`, {
    method,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
    cache: "no-store",
  });

  return NextResponse.json(await readResponse(response), { status: response.status });
}

export async function PUT(request: NextRequest) {
  try {
    return await updateAvatar(request, "PUT");
  } catch {
    return NextResponse.json({ error: "Unable to reach the profile service." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await updateAvatar(request, "DELETE");
  } catch {
    return NextResponse.json({ error: "Unable to reach the profile service." }, { status: 502 });
  }
}

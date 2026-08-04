import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

async function readResponse(response: Response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { error: "Backend returned an invalid response." };
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const username = typeof body?.username === "string" ? body.username.trim() : "";
        const password = typeof body?.password === "string" ? body.password : "";

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
        }
        if (username.length < 3 || username.length > 100) {
            return NextResponse.json({ error: "Username must be between 3 and 100 characters." }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
        }

        const response = await fetch(`${BACKEND}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            cache: "no-store",
        });
        const data = await readResponse(response);
        const nextResponse = NextResponse.json(data, { status: response.status });
        const cookiesHeader = response.headers.get("set-cookie");
        if (cookiesHeader) nextResponse.headers.set("set-cookie", cookiesHeader);
        return nextResponse;
    } catch {
        return NextResponse.json({ error: "Unable to reach the authentication service." }, { status: 502 });
    }
}

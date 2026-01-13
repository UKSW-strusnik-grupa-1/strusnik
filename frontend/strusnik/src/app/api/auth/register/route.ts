import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json(
                { error: "Username and password required." },
                { status: 400 }
            );
        }

        if (username.length < 3) {
            return NextResponse.json(
                { error: "Username must be at least 3 characters." },
                { status: 400 }
            );
        }

        if (password.length < 4) {
            return NextResponse.json(
                { error: "Password must be at least 4 characters." },
                { status: 400 }
            );
        }

        const response = await fetch(`${BACKEND}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || "Registration error." },
                { status: response.status }
            );
        }

        return NextResponse.json(data, { status: 201 });

    } catch (error) {
        return NextResponse.json(
            { error: "Registration error." },
            { status: 500 }
        );
    }
}

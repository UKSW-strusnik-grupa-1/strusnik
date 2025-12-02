import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        const response = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || "Login error." }, 
                { status: response.status }
            );
        }

        const cookiesHeader = response.headers.get('set-cookie');
        const nextResponse = NextResponse.json(data, { status: 200 });

        if (cookiesHeader) {
            nextResponse.headers.set('set-cookie', cookiesHeader);
        }

        return nextResponse;

    } catch (error) {
        return NextResponse.json(
            { error: "Login error." },
            { status: 500 }
        );
    }
}

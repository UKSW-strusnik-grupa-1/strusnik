import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uuid } = body;

        const response = await fetch("http://localhost:5000/api/games/blackjack/stand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uuid })
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || "Fetch error." }, 
                { status: response.status }
            );
        }

        const nextResponse = NextResponse.json(data, { status: 200 });
        return nextResponse;

    } catch (error) {
        return NextResponse.json(
            { error: "Fetch error." },
            { status: 500 }
        );
    }
}

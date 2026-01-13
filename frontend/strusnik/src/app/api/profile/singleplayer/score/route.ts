import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const jwtToken = request.cookies.get("jwtToken")?.value;

        if (!jwtToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const backendUrl = "http://localhost:5000/api/profile/singleplayer/score";

        const res = await fetch(backendUrl, {
            method: "POST",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: "Failed to save score" },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Score save error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

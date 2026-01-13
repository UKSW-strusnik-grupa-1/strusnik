import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
    try {
        const jwtToken = request.cookies.get("jwtToken")?.value;

        if (!jwtToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const backendUrl = `${BACKEND}/api/profile/me`;

        const res = await fetch(backendUrl, {
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}`,
            },
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: "Failed to fetch from backend" },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Profile fetch error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

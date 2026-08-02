import { NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    const { username } = await params;

    try {
        const response = await fetch(
            `${BACKEND}/api/profile/${encodeURIComponent(username)}/avatar`,
            { cache: "no-store" },
        );

        return new NextResponse(response.body, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
                "Cache-Control": "public, max-age=60",
            },
        });
    } catch {
        return NextResponse.json({ error: "Unable to reach the profile service." }, { status: 502 });
    }
}

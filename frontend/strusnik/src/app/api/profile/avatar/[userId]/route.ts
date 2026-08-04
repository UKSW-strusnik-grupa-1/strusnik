import { NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;

    if (!/^\d+$/.test(userId)) {
        return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    try {
        const response = await fetch(`${BACKEND}/api/profile/avatar/${userId}`, {
            cache: "no-store",
        });

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

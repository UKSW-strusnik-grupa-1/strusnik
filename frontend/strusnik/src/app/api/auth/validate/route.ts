import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.API_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const token = typeof body?.token === "string" ? body.token : "";
        const response = await fetch(`${BACKEND}/api/auth/validate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            cache: "no-store",
        });
        const text = await response.text();
        let data: { valid?: boolean; error?: string } = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { valid: false, error: "Invalid validation response." };
        }
        return NextResponse.json(
            { valid: Boolean(data.valid), ...(data.error ? { error: data.error } : {}) },
            { status: response.status },
        );
    } catch {
        return NextResponse.json({ valid: false, error: "Unable to validate the session." }, { status: 502 });
    }
}

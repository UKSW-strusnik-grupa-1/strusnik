import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:5000";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const pathStr = path.join('/');
    const tokenCookie = request.cookies.get("jwtToken");
    const tokenValue = tokenCookie?.value;

    const url = new URL(request.url);
    const queryString = url.search;

    try {
        const response = await fetch(`${BACKEND_URL}/api/admin/${pathStr}${queryString}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(tokenValue && { "Cookie": `jwtToken=${tokenValue}` }),
            },
            credentials: 'include',
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: "Backend connection failed" }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const pathStr = path.join('/');
    const tokenCookie = request.cookies.get("jwtToken");
    const tokenValue = tokenCookie?.value;

    try {
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/admin/${pathStr}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(tokenValue && { "Cookie": `jwtToken=${tokenValue}` }),
            },
            credentials: 'include',
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: "Backend connection failed" }, { status: 500 });
    }
}

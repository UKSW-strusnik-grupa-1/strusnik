import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const tokenCookie = request.cookies.get("jwtToken");
    const tokenValue = tokenCookie?.value;

    if (!tokenValue) {
         return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    try {
        const response = await fetch("http://localhost:5000/api/auth/token", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Cookie": `jwtToken=${tokenValue}` 
            },
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                { 
                    valid: data.valid || false, 
                    error: data.error || "Parse claims error." 
                },
                { status: response.status }
            )
        }

        return NextResponse.json(data, { status: response.status })
    } catch (error) {
        return NextResponse.json({
            valid: false,
            error: "Parse claims error.",
        }, { status: 400 })
    }
}
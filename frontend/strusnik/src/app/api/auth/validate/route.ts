import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token } = body;
        
        const response = await fetch("http://localhost:5000/api/auth/validate", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(
                { 
                    valid: data.valid || false, 
                    error: data.error || "Validate error." 
                },
                { status: response.status }
            )
        }

        return NextResponse.json(data, { status: response.status })
    } catch (error) {
        return NextResponse.json({
            valid: false,
            error: "Validate error.",
        }, { status: 400 })
    }
}
import { cookies } from "next/headers";
import { config } from "@/proxy";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("jwtToken")?.value;

        // Call backend to clear cookie there too
        const response = await fetch(`${config.backendUrl}/api/auth/logout`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Cookie: `jwtToken=${token}` }),
            },
        });

        // Delete cookie on Next.js side
        const nextResponse = NextResponse.json(
            { message: "Logged out successfully." },
            { status: 200 }
        );

        nextResponse.cookies.delete("jwtToken");

        return nextResponse;
    } catch (error) {
        console.error("Logout error:", error);
        // Even if backend fails, delete the cookie
        const nextResponse = NextResponse.json(
            { message: "Logged out." },
            { status: 200 }
        );
        nextResponse.cookies.delete("jwtToken");
        return nextResponse;
    }
}

import { NextRequest, NextResponse } from "next/server";

async function isTokenValid(token: string, request: NextRequest) {
    try {
        const url = new URL("/api/auth/validate", request.url);
        const response = await fetch(url.toString(), { 
            method: "POST",
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        console.log(data)

        return data.valid || false;
    } catch (error) {
        console.log(error)
        return false;
    }
}

export async function proxy(request: NextRequest) {
    if (
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname === '/favicon.ico' ||
        request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js)$/) ||
        request.method === 'POST'
    ) {
        return NextResponse.next();
    }

    const jwtToken = request.cookies.get("jwtToken")?.value;

    if (request.nextUrl.pathname === "/auth") {
        if (jwtToken) {
            const isValid = await isTokenValid(jwtToken, request);
            if (isValid) {
                return NextResponse.redirect(new URL("/", request.url));
            }
        }
        return NextResponse.next();
    } else {
        if (!jwtToken) {
            return NextResponse.redirect(new URL("/auth", request.url));
        }

        const isValid = await isTokenValid(jwtToken, request);
        if (!isValid) {
            return NextResponse.redirect(new URL("/auth", request.url));
        }

        return NextResponse.next();
    }
}

export const config = {
    matcher: '/:path*',
};
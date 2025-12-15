import { NextRequest, NextResponse } from "next/server";

/**
 * Weryfikuje ważność tokenu JWT, wysyłając żądanie do wewnętrznego API backendu.
 * Funkcja ta działa po stronie serwera (Server-Side) w środowisku Edge.
 * * Wykonuje tzw. "Server-Side Fetch" do endpointu walidacyjnego, aby upewnić się,
 * że token nie wygasł i nie został sfałszowany, zanim użytkownik zobaczy stronę.
 *
 * @param token - Token JWT pobrany z ciasteczek przeglądarki (cookie: "jwtToken").
 * @param request - Oryginalne żądanie przychodzące (potrzebne do zbudowania pełnego URL, np. http://localhost:3000/api/...).
 * @returns Promise zwracający `true` jeśli token jest ważny, w przeciwnym razie `false` (także w przypadku błędu sieci).
 */
async function isTokenValid(token: string, request: NextRequest) {
    try {
        // Konstrukcja pełnego adresu URL do API walidacji
        const url = new URL("/api/auth/validate", request.url);
        
        // Zapytanie do backendu (Backend sprawdza podpis JWT i czas wygaśnięcia)
        const response = await fetch(url.toString(), { 
            method: "POST",
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        console.log(data)

        // Zwraca status walidacji z backendu
        return data.valid || false;
    } catch (error) {
        console.log(error)
        // W przypadku błędu (np. backend nie działa) uznajemy token za nieważny dla bezpieczeństwa
        return false;
    }
}

/**
 * Główna funkcja Middleware (Proxy) działająca na krawędzi (Edge Runtime).
 * Pełni rolę "Strażnika" (Gatekeeper) dla całej aplikacji.
 * * Uruchamia się przed każdym żądaniem do serwera (zgodnie z config.matcher) i decyduje,
 * czy użytkownik może zobaczyć daną stronę, czy powinien zostać przekierowany.
 *
 * Logika działania:
 * 1. **Wykluczenia:** Pomija pliki statyczne, API, zasoby systemowe Next.js i metody POST.
 * 2. **Pobranie tokenu:** Sprawdza obecność ciasteczka `jwtToken`.
 * 3. **Strona Logowania (`/auth`):**
 * - Jeśli użytkownik jest zalogowany (ma ważny token) -> Wyrzuca go na stronę główną (`/`).
 * - Jeśli nie jest zalogowany -> Pozwala wejść.
 * 4. **Strony Chronione (reszta aplikacji):**
 * - Jeśli brak tokenu lub jest nieważny -> Przekierowuje na logowanie (`/auth`).
 * - Jeśli token ważny -> Przepuszcza żądanie (`NextResponse.next()`).
 *
 * @param request - Przychodzące żądanie HTTP z przeglądarki użytkownika.
 * @returns Odpowiedź Next.js: przekierowanie (Redirect) lub kontynuacja (Next).
 */
export async function proxy(request: NextRequest) {
    // 1. Pomiń sprawdzanie dla ścieżek, które nie wymagają autoryzacji (zasoby techniczne i API)
    if (
        request.nextUrl.pathname.startsWith('/api') ||       // Endpointy API są zabezpieczane osobno
        request.nextUrl.pathname.startsWith('/_next') ||     // Pliki systemowe Next.js (build chunks)
        request.nextUrl.pathname === '/favicon.ico' ||       // Ikona strony
        request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js)$/) || // Pliki statyczne (obrazy, style)
        request.method === 'POST'                            // Żądania POST (np. logowanie) przepuszczamy
    ) {
        return NextResponse.next();
    }

    // 2. Pobierz token z ciasteczek
    const jwtToken = request.cookies.get("jwtToken")?.value;

    // 3. Obsługa strony logowania/rejestracji (/auth)
    if (request.nextUrl.pathname === "/auth") {
        if (jwtToken) {
            // Jeśli użytkownik ma token, sprawdzamy czy jest ważny
            const isValid = await isTokenValid(jwtToken, request);
            if (isValid) {
                // Zalogowany użytkownik nie powinien widzieć ekranu logowania -> idzie do Dashboardu
                return NextResponse.redirect(new URL("/", request.url));
            }
        }
        // Jeśli nie ma tokenu lub jest nieważny -> pozwól zobaczyć formularz logowania
        return NextResponse.next();
    } else {
        // 4. Obsługa wszystkich innych stron (Chronione)
        
        // Brak tokenu -> Brak wstępu -> Redirect na /auth
        if (!jwtToken) {
            return NextResponse.redirect(new URL("/auth", request.url));
        }

        // Token jest, ale musimy sprawdzić czy jest ważny (nie wygasł, nie sfałszowany)
        const isValid = await isTokenValid(jwtToken, request);
        if (!isValid) {
            // Token nieważny -> Redirect na /auth
            return NextResponse.redirect(new URL("/auth", request.url));
        }

        // Wszystko OK -> Przepuść użytkownika do aplikacji
        return NextResponse.next();
    }
}

/**
 * Konfiguracja zasięgu działania Middleware.
 * * `matcher: '/:path*'` oznacza, że funkcja `proxy` uruchomi się dla absolutnie każdej ścieżki
 * w aplikacji. Filtrowanie (wykluczanie API czy plików statycznych) odbywa się
 * programowo wewnątrz funkcji `proxy`.
 */
export const config = {
    matcher: '/:path*',
};
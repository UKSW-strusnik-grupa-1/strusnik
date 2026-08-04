import { useNotification } from "../context/NotificationsContext";
import { stripPolishDiacritics } from "../utils/copy";

type JsonObject = Record<string, unknown>;

async function readJson(response: Response): Promise<JsonObject | null> {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { error: response.statusText || "Invalid server response." };
    }
}

export const useFetchWithNotify = () => {
    const { notify } = useNotification();

    const fetchWithNotify = async <T = JsonObject>(url: string, options: RequestInit = {}): Promise<T | null> => {
        try {
            const response = await fetch(url, options);
            const data = await readJson(response);

            if (!response.ok) {
                const rawMessage = data?.message ?? data?.error;
                const errorMessage = typeof rawMessage === "string" ? rawMessage : response.statusText || "Wystapil blad";
                const type = response.status === 400 || response.status === 404 ? "warning" : "error";
                notify(stripPolishDiacritics(errorMessage), type);
                return null;
            }

            return data as T;
        } catch {
            notify("Nie udalo sie polaczyc z serwerem.", "error");
            return null;
        }
    };

    return fetchWithNotify;
};

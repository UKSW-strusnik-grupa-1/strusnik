import { useRouter } from "next/navigation";
import { useNotification } from "../context/NotificationsContext";

export const useFetchWithNotify = () => {
    const { notify } = useNotification();
    const router = useRouter();

    const fetchWithNotify = async (url: string, options: RequestInit = {}) => {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                let errorMessage = "Wystąpił błąd";

                try {
                    const data = await response.json();
                    errorMessage = data.message || data.error || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText;
                }

                switch (response.status) {
                    case 400:
                        notify(`Błąd żądania: ${errorMessage}`, "warning");
                        break;
                    case 401:
                        notify(errorMessage || "Sesja wygasła. Zaloguj się ponownie.", "error");
                        break;
                    case 403:
                        notify(errorMessage || "Brak uprawnień do wykonania tej akcji.", "error");
                        break;
                    case 404:
                        notify(errorMessage || "Nie znaleziono zasobu.", "warning");
                        break;
                    case 500:
                        notify(errorMessage || "Błąd serwera. Spróbuj później.", "error");
                        break;
                    default:
                        notify(errorMessage, "error");
                }

                return null;
            }

            return await response.json();

        } catch (error) {
            console.error(error);
            notify("Problem z połączeniem sieciowym", "error");
            return null;
        }
    };

    return fetchWithNotify;
};
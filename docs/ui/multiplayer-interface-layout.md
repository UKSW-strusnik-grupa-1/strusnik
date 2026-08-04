# Layout interfejsu gry multiplayer

**Status:** obowiązujący kontrakt projektowy  
**Zakres:** lobby, aktywna rozgrywka, obserwatorzy i stany przejściowe w Strusniku  
**Źródło terminologii:** [`CONTEXT.md`](../../CONTEXT.md)  
**Obowiązkowy przegląd:** `/better-interface`

Ten dokument opisuje wspólny layout interfejsu multiplayer niezależnie od reguł konkretnej gry. Nie zastępuje projektu areny ani zasad gry. Określa, co musi pozostać wspólne, aby gracz zawsze rozumiał: gdzie jest gra, kto bierze udział, jaki jest najważniejszy stan i co może zrobić teraz.

## 1. Zasady nadrzędne

1. **Arena gry jest centrum.** To główna przestrzeń decyzji i nie może konkurować z dekoracją, chatem ani administracyjnymi kontrolkami.
2. **Strefa uczestników jest stabilna.** Kafelki graczy nie nachodzą na arenę i nie zmieniają kolejności przy każdej aktualizacji statusu.
3. **Informacja albo usunięcie.** Każdy widoczny tekst, kolor, ikona i panel musi przekazywać stan, nazywać działanie albo wspierać decyzję.
4. **Kafelek gracza jest zwarty.** Avatar, nick, jeden priorytetowy status, jedna kluczowa statystyka i jawne akcje wystarczają w podstawowym widoku.
5. **Mechanika gry ma pierwszeństwo przed szablonem.** Wspólny shell nie może pogorszyć czytelności gry turowej, realtime, drużynowej ani gry o nietypowej liczbie uczestników.
6. **Nie ukrywamy istotnych uczestników.** Przy dużej liczbie graczy używamy przewijania i wyraźnej wskazówki, nie zmniejszamy kafelków do nieczytelnego rozmiaru.
7. **Stan nie może zależeć tylko od koloru, animacji ani pozycji.** Każdy ważny stan ma redundantzny sygnał.
8. **Nie projektujemy na podstawie istniejącego odstępstwa.** Stary komponent może być migrowany; nie jest automatycznie wzorcem.

## 2. Canonicalny układ

### 2.1 Desktop i tablet

Standardowy układ zachowuje wspólny kontekst, centralną arenę i osobną strefę uczestników:

```text
┌──────────────────────────────────────────────────────────────┐
│ Kontekst pokoju / gry                 pomocnicze kontrolki   │
├──────────────────────┬──────────────────────┬───────────────┤
│ Strefa uczestników    │ Arena gry            │ Chat /         │
│                      │                      │ szczegóły     │
│ PlayerTile           │                      │ (opcjonalne)  │
│ PlayerTile           │ primary action       │               │
│ PlayerTile           │                      │               │
└──────────────────────┴──────────────────────┴───────────────┘
```

- Arena dostaje pierwszeństwo w dostępnej przestrzeni.
- Strefa uczestników jest bocznym railem lub inną stabilną strefą; nie musi zawsze być po tej samej stronie, jeśli wymaga tego mechanika.
- Pomocnicza kolumna jest opcjonalna. Nie dodajemy jej tylko po to, by wypełnić ekran.
- Przy dwóch graczach można użyć pozycji po przeciwnych stronach areny, jeśli pozycja ma znaczenie dla gry. Używamy tego samego `PlayerTile`.
- Arena zachowuje proporcje właściwe dla konkretnej gry. Nie narzucamy jednego `aspect-ratio` wszystkim grom.

### 2.2 Mobile

Nie zmniejszamy areny, aby zmieścić wszystkie kafelki. Układ przechodzi w jedną kolumnę:

```text
┌─────────────────────────┐
│ Kontekst                │
├─────────────────────────┤
│ Arena gry               │
│                         │
│ Główna akcja / status   │  ← stabilna strefa, jeśli potrzebna
├─────────────────────────┤
│ PlayerTile → PlayerTile │  ← poziomy rail z widocznym peekiem
├─────────────────────────┤
│ Kontrolki pomocnicze    │
└─────────────────────────┘
```

- Arena pozostaje pierwsza w kolejności decyzji.
- Rail uczestników ma przewidywalny scroll i pokazuje fragment następnego kafelka jako affordance.
- Własny gracz jest pierwszy tylko wtedy, gdy gra nie ma znaczącej geometrii miejsc. Gdy miejsca są częścią mechaniki, zachowujemy kolejność gry i oznaczamy własnego gracza.
- Główna akcja musi być osiągalna bez przewijania całej strony; może używać stabilnego paska akcji z safe area.
- Chat i menu nie zmniejszają ani nie przesuwają areny.
- Główne breakpointy wynikają z tego, kiedy treść przestaje się mieścić, a nie z domyślnej listy urządzeń.

## 3. `PlayerTile`

`PlayerTile` jest wspólnym modułem prezentacyjnym. Nie zna zasad konkretnej gry. Gra dostarcza znormalizowany model uczestnika, a moduł ukrywa wspólne zachowanie: priorytet statusu, fallback avatara, nazwy dostępności, stabilność wymiarów i wariant wizualny.

### 3.1 Anatomia

```text
┌────────────────────────────────────┐
│ [avatar]  Nick              [akcje]│
│           status / aktywność       │
│           jedna statystyka          │
└────────────────────────────────────┘
```

Kafelek zawiera:

- avatar w stałym miejscu; brak obrazu używa neutralnego fallbacku,
- nick jako podstawową informację tekstową,
- oznaczenie własnego gracza (`Ty`) bez zmiany rozmiaru kafelka,
- jeden priorytetowy `Status uczestnika`,
- jedną najważniejszą statystykę zależną od gry,
- drużynę lub rolę tylko wtedy, gdy wynika z mechaniki,
- jawne akcje wynikające z uprawnień.

Nie dodajemy zestawu wszystkich możliwych metadanych. Szczegóły mogą być dostępne w kontekstowym menu albo osobnym widoku.

### 3.2 Kontrakt modułu

Przykładowy model semantyczny — nazwy typów mogą zostać dopasowane do istniejącego kodu:

```ts
type PlayerTileModel = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  isSelf: boolean;
  role: 'player' | 'observer';
  team?: { id: string; label: string };
  connection: 'connected' | 'reconnecting' | 'disconnected';
  activity: 'active' | 'playing' | 'ready' | 'waiting';
  participation?: 'eliminated';
  metric?: { label: string; value: string };
  outcome?: 'won' | 'lost' | 'draw' | 'eliminated' | 'finished';
};
```

Właściwy interfejs modułu powinien przyjmować mały model oraz:

- `variant`: `lobby | game | observer`,
- jawne akcje/sloty dostępne w danym kontekście,
- obsługę zdarzeń bez wprowadzania wiedzy o regułach gry.

Nie przekazujemy do `PlayerTile` surowego stanu serwera ani obiektu konkretnej gry. Mapowanie do modelu należy do adaptera gry przed seamem modułu.

### 3.3 Priorytet statusu

W zwykłym widoku jeden status jest dominujący:

1. problem z połączeniem: `reconnecting` / `disconnected`,
2. sposób udziału: `observer` / `eliminated`,
3. aktywność właściwa dla mechaniki: `current turn`, `playing`, `active`, `waiting`,
4. gotowość: `ready` / `not ready`,
5. statystyka.

W `Zakończenie rozgrywki` rezultat uczestnika może zastąpić aktywność. Gra nie może wymuszać `turn`, jeśli jest realtime albo nie ma pojęcia tury.

### 3.4 Kolejność

- Gry z istotną geometrią miejsc zachowują kolejność wynikającą z mechaniki.
- W pozostałych grach własny gracz jest pierwszy, a reszta ma stabilną kolejność, np. kolejność dołączenia.
- Aktywny uczestnik dostaje wyróżnienie, ale nie przeskakuje automatycznie na początek.
- Obserwatorzy są osobną grupą.
- Kolejność DOM i kolejność wizualna są zgodne.

### 3.5 Akcje

- Cały kafelek nie jest domyślnie linkiem ani przyciskiem.
- Akcje zależą od roli i uprawnień.
- Częste, bezpieczne akcje mogą być widoczne; rzadkie lub destrukcyjne trafiają do jednego menu.
- `kick`, `ban` i podobne działania wymagają jasnego potwierdzenia.
- Nie pokazujemy martwych kontrolek bez uprawnienia.

## 4. Lobby

Lobby używa tego samego modelu uczestnika, ale zamiast statystyk meczu pokazuje gotowość i dostępne miejsce:

- kontekst pokoju na górze: gra, nazwa pokoju, aktualny stan,
- miejsca uczestników są główną treścią,
- puste miejsce jest jawną akcją dołączenia,
- gotowość lub rozpoczęcie gry to jedna główna akcja,
- konfiguracja, zaproszenia i akcje hosta są drugorzędne,
- chat nie jest główną treścią lobby.

Canonicalna nazwa produktowa to **Lobby**. `WaitingRoom` może pozostać nazwą techniczną istniejącego modułu, ale nowe modele nie powinny używać jej jako nazwy całego interfejsu.

## 5. Drużyny i obserwatorzy

### Drużyny

- Grupujemy graczy tylko wtedy, gdy drużyna jest częścią mechaniki.
- Pokazujemy nazwę lub rolę drużyny.
- Kolor drużyny zawsze ma dodatkowy sygnał: tekst, ikonę albo wzór.
- Grupowanie nie może ukrywać uczestników za wieloma poziomami rozwijania.

### Obserwatorzy

- Są osobną grupą od graczy.
- Pokazujemy ich liczbę.
- Przy większej liczbie grupa może być domyślnie zwinięta, ale kontrolka musi jasno ujawniać zawartość.
- Obserwator ma avatar, nick i stan połączenia, ale nie statystyki gracza.
- Obserwator nie może wyglądać jak gracz z nieaktywnym stanem.
- Własny obserwator jest jednoznacznie oznaczony.

## 6. Skala uczestników

| Sytuacja | Zasada |
| --- | --- |
| 2 graczy | Oba kafelki widoczne; pozycje mogą odzwierciedlać mechanikę. |
| 3–8 graczy | Pełna widoczność na desktopie, bez nachodzenia na arenę. |
| 8+ graczy | Stabilna przewijana lista; nie zmniejszamy kafelków poniżej użytecznej gęstości. |
| Mobile | Poziomy rail z widocznym fragmentem następnego kafelka. |
| Wielu obserwatorów | Osobna, zwijana grupa z licznikiem. |

Nie ukrywamy uczestników bez kontroli `pokaż więcej` lub równoważnej, zrozumiałej wskazówki.

## 7. Stany i realtime

| Stan | Zachowanie layoutu |
| --- | --- |
| `loading` | Zachowuje kształt docelowej areny i kafelków; nie ogranicza się do samego spinnera. |
| `empty` | Krótko wyjaśnia brak danych i pokazuje jedną kolejną akcję. |
| `error` | Jest przy obszarze, którego dotyczy, i zawiera drogę odzyskania. |
| `reconnecting` | Nie zasłania całego ekranu, jeśli bezpieczne oczekiwanie jest możliwe. |
| `disconnected` | Zachowuje tożsamość i miejsce uczestnika do czasu potwierdzonej zmiany. |
| `finished` | Zachowuje kontekst areny, uczestników i prowadzi do jednej następnej decyzji. |

Przy odłączeniu nie usuwamy natychmiast kafelka ani nie przestawiamy pozostałych graczy. Miejsce staje się puste dopiero po potwierdzeniu stanu pokoju/serwera.

Zmiany realtime aktualizują istniejące elementy. Nie tworzymy serii toastów dla każdej tury, gotowości ani zmiany licznika.

## 8. Kontrolki, chat i warstwy

### Kontrolki

- Główne akcje są przy arenie albo w stabilnym pasku akcji.
- Jedna akcja ma wyraźne pierwszeństwo.
- Kontrolki nie zasłaniają planszy ani kafelków.
- Akcje drugorzędne mają jedną przewidywalną strefę.
- Etykieta akcji zaczyna się od czasownika; ikona ma accessible name.
- Na mobile główna akcja pozostaje osiągalna bez przewijania całej strony.

### Chat gry

- Nie jest stałą częścią głównego layoutu.
- W lobby może być dostępny jako panel pomocniczy.
- W aktywnej grze domyślnie jest zwinięty do kontrolki.
- Liczba nieprzeczytanych wiadomości jest widoczna bez zasłaniania areny.
- Rozwinięcie jest nieblokującą warstwą z pełną obsługą klawiatury.
- Jeśli gra nie potrzebuje komunikacji, agent nie dodaje chatu automatycznie.

### Modale

- Modal służy tylko decyzji blokującej lub wymagającej potwierdzenia.
- Rutynowe informacje są inline, w statusie albo w toastach.
- Modal przejmuje fokus, obsługuje `Escape` i przy zamknięciu oddaje fokus wyzwalaczowi.
- Tło jest niedostępne podczas decyzji blokującej.
- Chat, menu gracza i ustawienia powinny być nieblokujące.

## 9. Wizualny i typograficzny język

- Zachowujemy istniejące tokeny projektu: ciemne neutralne powierzchnie, bursztynowy akcent, font Perciles i `lucide-react`.
- Nie wprowadzamy nowych kolorów, drugiego systemu ikon ani osobnych tokenów dla pojedynczej gry bez uzasadnienia.
- Akcent służy jednej głównej akcji lub ważnemu aktywnemu stanowi.
- Kafelki pozostają neutralne; wyróżnienie własnego gracza nie może zmieniać wymiarów.
- Używamy przestrzeni zamiast linii i ozdobnych kontenerów.
- Bazowa gęstość: `8 px` wewnątrz grupy, `16 px` między powiązanymi blokami, `24 px+` między sekcjami i `12 px` między kontrolkami.
- Bazowy radius powierzchni to `16 px`; elementy zagnieżdżone zachowują koncentryczność.
- Tekst nie ma stałej wysokości zależnej od przykładowego nicku.
- Liczniki i timery używają cyfr tabularnych.
- Długie nicki i identyfikatory mają bezpieczne skrócenie wizualne, ale pełna wartość pozostaje dostępna.
- Brak sloganów, tagline’ów, dekoracyjnych kickerów i opisów powtarzających to, co już wynika z layoutu.

## 10. Dostępność i lokalizacja

To są warunki projektowe, nie zadania na później:

- semantyczny HTML, native controls i pełna obsługa klawiaturą,
- widoczny `:focus-visible`, bez pozytywnych `tabindex`,
- minimum `44×44 px` dla celów dotykowych,
- statusy z sygnałem innym niż kolor,
- poprawne accessible names dla ikon, menu i statusów,
- jedna logiczna kolejność DOM i jeden główny landmark `main`,
- live updates z właściwą pilnością (`status` dla zwykłych zmian, `alert` tylko dla pilnych błędów),
- działanie przy 200% zoomie i szerokości 320 px,
- `prefers-reduced-motion`,
- testy RTL i właściwości logiczne CSS,
- avatar z fallbackiem i alt textem dobranym do funkcji obrazu,
- teksty przez istniejący system i18n, bez składania zdań przez konkatenację,
- nicki i wartości użytkownika izolowane jako dane, np. przez `<bdi>` tam, gdzie potrzeba.

## 11. Ruch

- Animacja wyjaśnia zmianę stanu albo relację; nie dekoruje każdej aktualizacji.
- Nie animujemy wymiarów ani pozycji, jeśli powoduje to przesuwanie kafelków.
- Przejścia są krótkie i przerywalne.
- Każdy animowany stan ma statyczny sygnał.
- `prefers-reduced-motion` wyłącza ruch ozdobny.
- Tura, wynik i połączenie muszą być czytelne bez animacji i dźwięku.

## 12. Przebieg pracy agenta

1. Rozpoznaj ekran: Lobby, aktywna rozgrywka, obserwator albo stan przejściowy.
2. Przeczytaj istniejące komponenty, tokeny, breakpointy, i18n i wzorce.
3. Dla nowego ekranu lub większej zmiany uruchom `/better-interface full`.
4. Dla lokalnej zmiany komponentu uruchom `/better-interface quick`.
5. Zaprojektuj wariant zgodny z tym kontraktem i z mechaniką konkretnej gry.
6. Zaimplementuj przez istniejący system stylów, komponentów i tokenów.
7. Wykonaj ponowny przegląd na stanach normalnym, loading, empty, error, reconnecting, disconnected, finished i mobile.
8. Usuń problemy `HIGH` i `MEDIUM` przed zakończeniem.
9. Uruchom dostępne testy oraz sprawdź renderowany interfejs, gdy ocena zależy od zachowania lub wyglądu.
10. Jeśli wprowadzasz wyjątek, zapisz powód przy ekranie/module i nie traktuj go jako nowego wzorca bez aktualizacji tego dokumentu.

## 13. Kryteria ukończenia

Ekran multiplayer jest gotowy dopiero po sprawdzeniu:

- 2, 3–8 i 8+ uczestników,
- brak avatara, długi nick i długie tłumaczenie,
- własny gracz, obserwator, drużyna i odłączenie,
- `loading`, `empty`, `error`, `reconnecting`, `disconnected` i zakończenie,
- desktop, tablet, 320 px i mobile landscape,
- klawiatura, focus, accessible names i live statusy,
- 200% zoom, RTL i `prefers-reduced-motion`,
- brak zmiany kolejności lub wymiarów przy realtime,
- `/better-interface` bez otwartych problemów `HIGH` lub `MEDIUM`.

## 14. Zakazy domyślne

Nie dodajemy bez uzasadnienia:

- dekoracyjnych tekstów i pustych sekcji,
- kafelków bez funkcji,
- stałego chatu w arenie,
- statusów opartych wyłącznie na kolorze,
- ukrywania uczestników bez kontroli ujawniającej listę,
- arbitralnych breakpointów,
- stałych wysokości tekstu,
- globalnego zmniejszania interfejsu jako rozwiązania responsywnego,
- osobnych wariantów `PlayerTile` dla każdej gry,
- klikalnego całego kafelka bez konkretnego celu.

## 15. Istniejący backlog migracyjny

Poniższe miejsca wymagają oceny przy najbliższej modyfikacji, bo nie są wzorcem dla nowych ekranów:

- `frontend/strusnik/src/app/components/lobby/onlinePlayersList.tsx` — dekoracyjny kicker `STRUSNIK / LIVE`.
- `frontend/strusnik/src/app/components/chat/GameChat.tsx` — dodatkowy subtitle chatu, który powinien pozostać tylko wtedy, gdy ma funkcję.
- `frontend/strusnik/src/app/globals.css` — globalny `zoom: var(--interface-scale)` oraz `overflow: hidden`; wymagają weryfikacji względem 200% zoomu, reflow i dostępności.

Nie zmieniaj tych miejsc automatycznie w ramach samego dokumentu. Przy implementacji konkretnej zmiany zastosuj kontrakt i sprawdź, czy odstępstwo ma uzasadnienie.

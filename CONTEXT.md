# Multiplayer game interface

Wspólny język opisujący interfejsy gier multiplayer w Strusniku, niezależnie od reguł konkretnej gry.

## Zakres interfejsu

**Interfejs multiplayer**:
Wspólna struktura ekranu, która pozwala uczestnikom wejść do rozgrywki, śledzić jej stan i wykonywać działania bez zbędnego tekstu ani dekoracyjnych wstawek.
_Avoid_: layout gry, ekran gry jako określenie całego systemu

**Arena gry**:
Główna przestrzeń, w której użytkownik obserwuje i wykonuje działania właściwe dla konkretnej gry.
_Avoid_: board jako nazwa uniwersalna dla każdej gry

**Kafelek gracza**:
Jednostka interfejsu pokazująca uczestnika rozgrywki przez avatar, nick, status oraz najważniejszą informację lub akcję kontekstową.
_Avoid_: karta gracza, player card

**Lobby**:
Przestrzeń przed rozpoczęciem rozgrywki, w której uczestnicy dołączają, czekają i konfigurują dostępne opcje.
_Avoid_: poczekalnia jako określenie całego interfejsu multiplayer

**Aktywna rozgrywka**:
Stan, w którym arena gry i informacje o uczestnikach wspierają bieżące decyzje oraz działania graczy.
_Avoid_: live game

**Strefa uczestników**:
Stabilny obszar interfejsu przeznaczony na kafelki graczy i obserwatorów, oddzielony od areny gry.
_Avoid_: panel boczny jako nazwa obowiązująca w każdym układzie

**Status uczestnika**:
Najważniejszy aktualny stan osoby widoczny w interfejsie: problem z połączeniem, sposób udziału, aktywność albo gotowość.
_Avoid_: status gracza jako określenie obejmujące dowolną statystykę

**Aktywność uczestnika**:
Informacja o tym, czy uczestnik może teraz działać w danej mechanice gry; może oznaczać turę, grę w czasie rzeczywistym, gotowość lub oczekiwanie.
_Avoid_: tura jako określenie wspólne dla wszystkich gier

**Drużyna**:
Grupa uczestników połączonych wspólnym celem lub wynikiem w ramach zasad konkretnej gry.
_Avoid_: grupa jako nazwa widoczna w interfejsie, team bez kontekstu

**Kolejność uczestników**:
Stabilny porządek prezentowania uczestników, wynikający najpierw z mechaniki gry, a następnie z perspektywy własnego gracza i kolejności dołączenia.
_Avoid_: sortowanie po każdej zmianie statusu

**Tekst funkcjonalny**:
Krótki tekst, który przekazuje stan, nazywa działanie albo pomaga podjąć decyzję; nie pełni roli dekoracji.
_Avoid_: copy, opis ozdobny

**Własny gracz**:
Uczestnik oglądający interfejs z własnej perspektywy, którego kafelek i dostępne działania wymagają jednoznacznego rozpoznania.
_Avoid_: ja, current player

**Chat gry**:
Pomocnicza przestrzeń komunikacji między uczestnikami, która nie jest częścią głównej areny i nie może konkurować z działaniami gry.
_Avoid_: okno rozmowy jako element głównego layoutu

**Stan przejściowy**:
Tymczasowy lub wyjątkowy stan interfejsu, który wyjaśnia oczekiwanie, brak danych, problem z połączeniem albo zakończenie rozgrywki bez utraty orientacji.
_Avoid_: przypadek brzegowy jako nazwa widoczna w interfejsie

**Zakończenie rozgrywki**:
Stan po rozstrzygnięciu gry, który pokazuje wynik, zachowuje kontekst uczestników i prowadzi do jednej kolejnej decyzji.
_Avoid_: game over jako jedyny opis stanu

**Odłączenie uczestnika**:
Stan, w którym uczestnik chwilowo lub trwale traci połączenie, ale jego tożsamość i miejsce pozostają częścią kontekstu do czasu potwierdzenia zmiany.
_Avoid_: usunięcie gracza jako natychmiastowa interpretacja problemu z połączeniem

**Rezultat uczestnika**:
Znaczenie zakończenia rozgrywki dla konkretnego uczestnika, takie jak zwycięstwo, przegrana, remis, eliminacja albo zakończenie bez klasyfikacji.
_Avoid_: zwycięzca jako uniwersalny rezultat

**Obserwator**:
Uczestnik widzący przebieg aktywnej rozgrywki, ale nieposiadający prawa wykonywania ruchów gracza.
_Avoid_: spectator jako nazwa w tekstach interfejsu

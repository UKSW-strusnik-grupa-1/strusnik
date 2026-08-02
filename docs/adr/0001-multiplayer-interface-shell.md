---
status: accepted
---

# Wspólny shell interfejsu multiplayer

Dla wszystkich gier multiplayer przyjmujemy wspólny shell oparty na centralnej arenie, osobnej strefie uczestników i jednym kontrakcie `PlayerTile`, zamiast kopiowania niezależnych layoutów dla każdej gry. Wspólne pozostają struktura, statusy, dostępność, responsywność i stany przejściowe, natomiast arena, statystyki, akcje, drużyny i kolejność miejsc pozostają zależne od mechaniki konkretnej gry. Decyzja ogranicza rozrost niespójnych interfejsów, zachowuje leverage wspólnego modułu i pozwala grom zachować własną ergonomię.

## Rozważane opcje

- **Osobny layout dla każdej gry** — odrzucony: powiela zasady, utrudnia dostępność i zwiększa niespójność.
- **Jeden sztywny layout dla wszystkich gier** — odrzucony: gry turowe, realtime, drużynowe i gry o różnej liczbie uczestników mają inne potrzeby.
- **Wspólny shell z wariantami zależnymi od mechaniki** — przyjęty: wspólny kontrakt zapewnia spójność, a arena i szczegóły pozostają elastyczne.

## Konsekwencje

Nowe ekrany i modyfikacje istniejących ekranów muszą stosować `docs/ui/multiplayer-interface-layout.md` oraz przejść odpowiedni przegląd `/better-interface`. Istniejące odstępstwa są backlogiem migracyjnym, a nie precedensem projektowym.

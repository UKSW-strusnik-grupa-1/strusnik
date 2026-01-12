"""
SET Card Game - Backend Logic

Karty mają 4 właściwości, każda z 3 możliwymi wartościami:
- Kształt (shape): 0, 1, 2 (np. diament, owal, fala)
- Kolor (color): 0, 1, 2 (np. czerwony, zielony, fioletowy)
- Wypełnienie (fill): 0, 1, 2 (np. pełne, paski, puste)
- Liczba (count): 0, 1, 2 (1, 2, lub 3 symbole)

SET to 3 karty, gdzie dla każdej z 4 właściwości:
wszystkie 3 wartości są takie same LUB wszystkie 3 są różne.
"""

import random
import time
from typing import List, Dict, Any, Optional
from .base import MultiplayerGame

from models import db, User, GameStats
from flask import current_app


class SetGame(MultiplayerGame):
    player_range = [2, 4]

    def __init__(self, players: List[str]) -> None:
        super().__init__(players)
        self.seats: List[Optional[Dict[str, Any]]] = [None] * 4
        self.deck: List[Dict[str, int]] = []
        self.table_cards: List[Optional[Dict[str, int]]] = []
        self.game_state = self.init_board()

    def init_board(self) -> Dict[str, Any]:
        return {
            "stage": "waiting_for_players",
            "seats": self.seats,
            "table_cards": [],
            "deck_remaining": 81,
            "last_set_by": None,
            "last_set_cards": [],
            "winner": None,
            "winners": [],  # Lista zwycięzców (może być remis)
            "msg": "",
            "game_over": False
        }

    def _generate_deck(self) -> List[Dict[str, int]]:
        """Generuje pełną talię 81 kart SET"""
        deck = []
        for shape in range(3):
            for color in range(3):
                for fill in range(3):
                    for count in range(3):
                        deck.append({
                            "shape": shape,
                            "color": color,
                            "fill": fill,
                            "count": count,
                            "id": f"{shape}{color}{fill}{count}"
                        })
        return deck

    def _is_valid_set(self, cards: List[Dict[str, int]]) -> bool:
        """Sprawdza czy 3 karty tworzą poprawny SET"""
        if len(cards) != 3:
            return False

        for prop in ["shape", "color", "fill", "count"]:
            values = [card[prop] for card in cards]
            # Wszystkie takie same lub wszystkie różne
            if not (len(set(values)) == 1 or len(set(values)) == 3):
                return False
        return True

    def _find_set_on_table(self) -> Optional[List[int]]:
        """Znajduje dowolny SET na stole (indeksy), lub None jeśli nie ma"""
        active_cards = [(i, c) for i, c in enumerate(self.table_cards) if c is not None]
        
        for i in range(len(active_cards)):
            for j in range(i + 1, len(active_cards)):
                for k in range(j + 1, len(active_cards)):
                    idx_i, card_i = active_cards[i]
                    idx_j, card_j = active_cards[j]
                    idx_k, card_k = active_cards[k]
                    
                    if self._is_valid_set([card_i, card_j, card_k]):
                        return [idx_i, idx_j, idx_k]
        return None

    def _deal_initial_cards(self):
        """Rozdaje początkowe 12 kart na stół"""
        self.deck = self._generate_deck()
        random.shuffle(self.deck)
        
        self.table_cards = []
        for _ in range(12):
            if self.deck:
                self.table_cards.append(self.deck.pop())
            else:
                self.table_cards.append(None)

        # Upewniamy się że jest przynajmniej 1 SET na stole
        # Jeśli nie ma, dobieramy 3 karty (max 21 kart na stole)
        while not self._find_set_on_table() and self.deck and len([c for c in self.table_cards if c]) < 21:
            for _ in range(3):
                if self.deck:
                    self.table_cards.append(self.deck.pop())

    def _refill_table(self):
        """Uzupełnia stół do 12 kart (lub więcej jeśli nie ma SET)"""
        # Usuń puste sloty i skompresuj
        self.table_cards = [c for c in self.table_cards if c is not None]
        
        # Dobierz do 12 kart
        while len(self.table_cards) < 12 and self.deck:
            self.table_cards.append(self.deck.pop())

        # Jeśli nadal nie ma SET, dobieraj po 3 karty
        while not self._find_set_on_table() and self.deck:
            for _ in range(3):
                if self.deck:
                    self.table_cards.append(self.deck.pop())

    def sit_player(self, player_id: str, player_name: str, seat_index: int, user_token: str) -> Dict[str, Any]:
        if not (0 <= seat_index < 4):
            return {"success": False, "msg": "NIEPRAWIDLOWE MIEJSCE."}

        if self.seats[seat_index] is not None:
            return {"success": False, "msg": "MIEJSCE ZAJETE."}

        for s in self.seats:
            if s and s.get('userId') == user_token:
                return {"success": False, "msg": "JUZ SIEDZISZ PRZY STOLE."}

        self.seats[seat_index] = {
            "socketId": player_id,
            "userId": user_token,
            "name": player_name,
            "score": 0,
            "sets_found": 0,
            "connected": True,
            "disconnect_timestamp": None
        }
        return {"success": True, "msg": "Usiadłeś."}

    def set_player_connection_status(self, user_token: str, is_connected: bool, sid: str = None):
        for i, seat in enumerate(self.seats):
            if seat and seat.get('userId') == user_token:

                # When disconnecting during waiting_for_players, remove the player entirely
                if not is_connected and self.game_state['stage'] == 'waiting_for_players':
                    self.seats[i] = None
                    return True

                # Always update socketId when reconnecting (before status check)
                if is_connected and sid:
                    seat['socketId'] = sid
                    seat['disconnect_timestamp'] = None

                # Skip if status is already the same
                if seat.get('connected') == is_connected:
                    return False

                seat['connected'] = is_connected

                if not is_connected:
                    seat['disconnect_timestamp'] = time.time()
                    
                return True
        return False

    def start_game(self) -> Dict[str, Any]:
        seated_count = len([s for s in self.seats if s is not None])
        if seated_count < 2:
            return {"success": False, "msg": "Za mało graczy (min. 2)."}

        self._deal_initial_cards()
        
        self.game_state['stage'] = 'playing'
        self.game_state['table_cards'] = self.table_cards
        self.game_state['deck_remaining'] = len(self.deck)
        self.game_state['msg'] = "Gra rozpoczęta! Znajdź SET!"
        
        return {"success": True}

    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Obsługuje ruchy gracza:
        - claim_set: gracz wskazuje 3 karty jako SET
        - no_set: gracz twierdzi że nie ma SET na stole
        """
        action = move_data.get('action')

        if self.game_state['stage'] != 'playing':
            return {"success": False, "msg": "Gra nie jest w toku."}

        # Znajdź gracza
        player_seat = None
        player_idx = -1
        for i, seat in enumerate(self.seats):
            if seat and (seat.get('socketId') == player_id or seat.get('userId') == player_id):
                player_seat = seat
                player_idx = i
                break

        if not player_seat:
            return {"success": False, "msg": "Nie jesteś przy stole."}

        if action == 'claim_set':
            return self._handle_claim_set(player_seat, player_idx, move_data)
        elif action == 'no_set':
            return self._handle_no_set(player_seat, player_idx)
        else:
            return {"success": False, "msg": "Nieznana akcja."}

    def _handle_claim_set(self, player_seat: Dict, player_idx: int, move_data: Dict) -> Dict[str, Any]:
        """Gracz próbuje zgłosić SET"""
        card_indices = move_data.get('card_indices', [])
        
        if len(card_indices) != 3:
            return {"success": False, "msg": "Wybierz dokładnie 3 karty."}

        # Sprawdź czy indeksy są prawidłowe
        for idx in card_indices:
            if idx < 0 or idx >= len(self.table_cards) or self.table_cards[idx] is None:
                return {"success": False, "msg": "Nieprawidłowy wybór kart."}

        selected_cards = [self.table_cards[idx] for idx in card_indices]

        if self._is_valid_set(selected_cards):
            # Poprawny SET!
            player_seat['score'] += 1
            player_seat['sets_found'] += 1

            self.game_state['last_set_by'] = player_seat['name']
            self.game_state['last_set_cards'] = [c['id'] for c in selected_cards]
            self.game_state['msg'] = f"{player_seat['name']} znalazł SET!"

            # Usuń karty ze stołu
            for idx in sorted(card_indices, reverse=True):
                self.table_cards[idx] = None

            # Uzupełnij stół
            self._refill_table()
            self.game_state['table_cards'] = self.table_cards
            self.game_state['deck_remaining'] = len(self.deck)

            # Sprawdź koniec gry
            if self._check_game_end():
                return {"success": True, "game_over": True}

            return {"success": True, "valid_set": True}
        else:
            # Niepoprawny SET - kara: -1 punkt
            player_seat['score'] -= 1
            self.game_state['msg'] = f"{player_seat['name']} pomylił się! (-1 pkt)"
            return {"success": True, "valid_set": False}

    def _handle_no_set(self, player_seat: Dict, player_idx: int) -> Dict[str, Any]:
        """Gracz twierdzi że nie ma SET na stole"""
        existing_set = self._find_set_on_table()

        if existing_set is None:
            # Gracz ma rację - nie ma SET
            if self.deck:
                # Dobierz 3 karty
                for _ in range(3):
                    if self.deck:
                        self.table_cards.append(self.deck.pop())
                
                self.game_state['table_cards'] = self.table_cards
                self.game_state['deck_remaining'] = len(self.deck)
                self.game_state['msg'] = "Brak SET - dobrano 3 karty."
                return {"success": True, "was_correct": True}
            else:
                # Koniec gry
                self._check_game_end()
                return {"success": True, "was_correct": True, "game_over": True}
        else:
            # Gracz się pomylił - jest SET na stole
            player_seat['score'] -= 1
            self.game_state['msg'] = f"{player_seat['name']} pomylił się - SET jest na stole! (-1 pkt)"
            return {"success": True, "was_correct": False}

    def _check_game_end(self) -> bool:
        """Sprawdza czy gra się skończyła"""
        # Gra kończy się gdy: talia pusta i nie ma SET na stole
        if not self.deck and not self._find_set_on_table():
            self.game_state['stage'] = 'finished'
            self.game_state['game_over'] = True
            
            # Znajdź zwycięzcę(ów)
            max_score = max((s['score'] for s in self.seats if s), default=0)
            winners = [s['name'] for s in self.seats if s and s['score'] == max_score]
            
            self.game_state['winners'] = winners
            if len(winners) == 1:
                self.game_state['winner'] = winners[0]
                self.game_state['msg'] = f"Koniec gry! Wygrywa {winners[0]}!"
            else:
                self.game_state['winner'] = None
                self.game_state['msg'] = f"Koniec gry! Remis: {', '.join(winners)}!"
            
            # Zapisz statystyki do bazy
            self._save_game_stats()
            
            return True
        return False

    def _save_game_stats(self):
        """Zapisuje statystyki gry do bazy danych"""
        try:
            for seat in self.seats:
                if seat and seat.get('userId'):
                    user = User.query.filter_by(id=seat['userId']).first()
                    if user:
                        is_winner = seat['name'] in self.game_state.get('winners', [])
                        
                        stats = GameStats.query.filter_by(
                            user_id=user.id,
                            game_name='Set'
                        ).first()
                        
                        if not stats:
                            stats = GameStats(
                                user_id=user.id,
                                game_name='Set',
                                wins=0,
                                losses=0,
                                draws=0
                            )
                            db.session.add(stats)
                        
                        if is_winner and len(self.game_state.get('winners', [])) == 1:
                            stats.wins += 1
                        elif is_winner:
                            stats.draws += 1
                        else:
                            stats.losses += 1
                        
                        db.session.commit()
        except Exception as e:
            print(f"Error saving Set game stats: {e}")
            db.session.rollback()

    def get_state(self) -> Dict[str, Any]:
        """Zwraca pełny stan gry"""
        state = {
            "stage": self.game_state['stage'],
            "seats": [
                {
                    "socketId": s['socketId'],
                    "userId": s['userId'],
                    "name": s['name'],
                    "score": s['score'],
                    "sets_found": s['sets_found'],
                    "connected": s['connected'],
                } if s else None
                for s in self.seats
            ],
            "table_cards": self.game_state.get('table_cards', []),
            "deck_remaining": self.game_state.get('deck_remaining', 0),
            "last_set_by": self.game_state.get('last_set_by'),
            "last_set_cards": self.game_state.get('last_set_cards', []),
            "winner": self.game_state.get('winner'),
            "winners": self.game_state.get('winners', []),
            "msg": self.game_state.get('msg', ''),
            "game_over": self.game_state.get('game_over', False)
        }
        return state

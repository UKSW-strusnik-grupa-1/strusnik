import random
from typing import List, Dict, Any, Optional
from .base import MultiplayerGame


class Thousand(MultiplayerGame):
    def __init__(self, players: List[str]) -> None:
        super().__init__(players)

        self.seats: List[Optional[Dict[str, Any]]] = [None] * 4

        ranks = ['9', '10', 'J', 'Q', 'K', 'A']
        suits = ['H', 'D', 'C', 'S']
        self.deck = [r + s for s in suits for r in ranks]

        self.game_state = self.init_board()

    def init_board(self) -> Dict[str, Any]:
        return {
            "stage": "waiting_for_players",
            "seats": self.seats,
            "current_player": None,
            "cards_on_table": [],
            "stock": []
        }

    def sit_player(self, player_id: str, player_name: str, seat_index: int) -> Dict[str, Any]:
        if not (0 <= seat_index < 4):
            return {"success": False, "msg": "Nieprawidłowe miejsce."}

        if self.seats[seat_index] is not None:
            return {"success": False, "msg": "Miejsce zajęte."}

        for s in self.seats:
            if s and s['id'] == player_id:
                return {"success": False, "msg": "Już siedzisz przy stole."}

        self.seats[seat_index] = {
            "id": player_id,
            "name": player_name,
            "score": 0,
            "hand": [],
            "hand_count": 0
        }
        return {"success": True, "msg": "Usiadłeś."}

    def start_game(self) -> Dict[str, Any]:
        seated_players = [s for s in self.seats if s is not None]
        if len(seated_players) < 2:
            return {"success": False, "msg": "Za mało graczy, aby rozpocząć (min. 2)."}

        self.game_state['stage'] = 'playing'

        current_deck = self.deck.copy()
        random.shuffle(current_deck)

        card_idx = 0
        for seat in self.seats:
            if seat is not None:
                hand = current_deck[card_idx: card_idx + 7]
                seat['hand'] = hand
                seat['hand_count'] = len(hand)
                card_idx += 7

        self.game_state['stock'] = current_deck[card_idx:]

        return {"success": True}

    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        move_type = move_data.get('type')

        seat = next((s for s in self.seats if s and s['id'] == player_id), None)
        if not seat:
            return {"success": False, "msg": "Nie grasz w tej grze."}

        if move_type == 'play_card':
            card_code = move_data.get('card')

            if card_code in seat['hand']:
                seat['hand'].remove(card_code)
                seat['hand_count'] = len(seat['hand'])

                self.game_state['cards_on_table'].append({
                    "player_id": player_id,
                    "card": card_code
                })

                return {"success": True}
            else:
                return {"success": False, "msg": "Nie masz tej karty (oszust!)."}

        return {"success": False, "msg": "Nieznany ruch."}

    def get_state(self) -> Dict[str, Any]:
        public_seats = []
        for seat in self.seats:
            if seat is None:
                public_seats.append(None)
            else:
                s_copy = seat.copy()
                if 'hand' in s_copy:
                    del s_copy['hand']
                public_seats.append(s_copy)

        return {
            "stage": self.game_state['stage'],
            "seats": public_seats,
            "current_player": self.game_state['current_player'],
            "cards_on_table": self.game_state['cards_on_table']
        }
import random
from typing import List, Dict, Any, Optional
from .base import MultiplayerGame

from models import db, User, GameStats
from flask import current_app

class Battleships(MultiplayerGame):
    player_range = [2]

    def __init__(self, players: List[str]) -> None:
        super().__init__(players)
        self.seats: List[Optional[Dict[str, Any]]] = [None] * 2
        self.game_state = self.init_board()

    def init_board(self) -> Dict[str, Any]:
        return {
            "stage": "waiting_for_players",
            "current_player_idx": 0,
            "winner": None,
            "boards": [self._create_empty_board() for _ in range(2)],
            "ready_players": []
        }

    def _create_empty_board(self):
        return [[0] * 10 for _ in range(10)]

    def sit_player(self, player_id: str, player_name: str, seat_index: int, user_token: str) -> Dict[str, Any]:
        if not (0 <= seat_index < 2):
            return {"success": False, "msg": "Nieprawidłowe miejsce."}
        if self.seats[seat_index] is not None:
            return {"success": False, "msg": "Miejsce zajęte."}

        self.seats[seat_index] = {
            "socketId": player_id,
            "userId": user_token,
            "name": player_name,
            "connected": True,
            "score": 0
        }
        return {"success": True, "msg": "Usiadłeś."}

    def start_game(self) -> Dict[str, Any]:
        seated_count = len([s for s in self.seats if s is not None])
        if seated_count < 2:
            return {"success": False, "msg": "Za mało graczy (wymagani 2)."}

        self.game_state['stage'] = 'placement'
        self.game_state['boards'] = [self._create_empty_board() for _ in range(2)]
        self.game_state['ready_players'] = []
        return {"success": True}

    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        player_idx = self._get_player_idx(player_id)
        if player_idx == -1: return {"success": False, "msg": "Nie grasz."}

        move_type = move_data.get('type')

        if self.game_state['stage'] == 'placement':
            if move_type == 'confirm_placement':
                board = move_data.get('board')

                if not isinstance(board, list) or len(board) != 10:
                    return {"success": False, "msg": "Błędna wielkość planszy."}
                for row in board:
                    if not isinstance(row, list) or len(row) != 10:
                        return {"success": False, "msg": "Błędny wiersz planszy."}

                self.game_state['boards'][player_idx] = board

                if player_idx not in self.game_state['ready_players']:
                    self.game_state['ready_players'].append(player_idx)

                print(
                    f"DEBUG Battleships: Player {player_idx} confirmed. Ready players: {self.game_state['ready_players']}, Stage: {self.game_state['stage']}")

                if len(self.game_state['ready_players']) == 2:
                    self.game_state['stage'] = 'playing'
                    self.game_state['current_player_idx'] = 0
                    print(f"DEBUG Battleships: Game started! Stage is now: {self.game_state['stage']}")
                return {"success": True}

        elif self.game_state['stage'] == 'playing':
            if move_type == 'shoot':
                if self.game_state['current_player_idx'] != player_idx:
                    return {"success": False, "msg": "Nie Twoja kolej."}

                x, y = move_data.get('x'), move_data.get('y')
                opponent_idx = (player_idx + 1) % 2
                opponent_board = self.game_state['boards'][opponent_idx]

                if opponent_board[y][x] in [2, 3]:
                    return {"success": False, "msg": "Już tu strzelałeś."}

                hit = False
                if opponent_board[y][x] == 1:
                    opponent_board[y][x] = 3
                    hit = True
                    if self._check_win(opponent_idx):
                        self.game_state['stage'] = 'game_over'
                        self.game_state['winner'] = self.seats[player_idx]
                        # Zapis statystyk po wygranej
                        self._record_win(player_idx)
                else:
                    opponent_board[y][x] = 2
                    self.game_state['current_player_idx'] = opponent_idx

                return {"success": True, "hit": hit}

        return {"success": False, "msg": "Nieznany ruch."}

    def _get_player_idx(self, socket_id):
        for i, s in enumerate(self.seats):
            if s and s['socketId'] == socket_id: return i
        return -1

    def set_player_connection_status(self, user_token: str, is_connected: bool, sid: str = None):

        for i, seat in enumerate(self.seats):
            if seat and seat.get('userId') == user_token:

                if not is_connected and self.game_state['stage'] == 'waiting_for_players':
                    self.seats[i] = None
                    return True

                if is_connected and sid:
                    seat['socketId'] = sid

                if seat.get('connected') == is_connected:
                    return False

                seat['connected'] = is_connected
                return True
        return False

    def update_player_sid(self, user_token: str, new_sid: str):

        for seat in self.seats:
            if seat and seat.get('userId') == user_token:
                seat['socketId'] = new_sid
                seat['connected'] = True
                return True
        return False

    def _check_win(self, victim_idx):
        for row in self.game_state['boards'][victim_idx]:
            if 1 in row: return False
        return True

    def _record_win(self, winner_idx: int) -> None:
        try:
            winner_seat = self.seats[winner_idx]
            if not winner_seat: return
            winner_name = winner_seat.get('name')
            if not winner_name: return

            if current_app:
                with current_app.app_context():
                    user = User.query.filter_by(username=winner_name).first()
                    if user:
                        stat = GameStats.query.filter_by(user_id=user.id, game_name='Battleships').first()
                        if not stat:
                            stat = GameStats(user_id=user.id, game_name='Battleships', wins=1)
                            db.session.add(stat)
                        else:
                            stat.wins += 1
                        db.session.commit()
        except Exception as e:
            print(f"Error saving Battleships stats: {e}")

    def get_state(self) -> Dict[str, Any]:
        return {
            "stage": self.game_state['stage'],
            "seats": self.seats,
            "current_player_idx": self.game_state['current_player_idx'],
            "boards": self.game_state['boards'],
            "winner": self.game_state.get('winner'),
            "ready_players": self.game_state.get('ready_players', [])
        }
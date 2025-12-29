from abc import ABC, abstractmethod
from typing import List, Dict, Any

class MultiplayerGame(ABC):
    player_range: List[int] = [2, 3, 4]

    def __init__(self, players: List[str]) -> None:
        self.players = players

    @abstractmethod
    def init_board(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def sit_player(self, player_id: str, player_name: str, seat_index: int, user_token: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_state(self) -> Dict[str, Any]:
        pass

    def start_game(self) -> Dict[str, Any]:
        return {"success": False, "msg": "Not implemented"}
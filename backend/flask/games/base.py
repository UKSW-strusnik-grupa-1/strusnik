from abc import ABC, abstractmethod
from typing import List, Dict, Any


class MultiplayerGame(ABC):
    def __init__(self, players: List[str]) -> None:
        self.players = players

    @abstractmethod
    def init_board(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_state(self) -> Dict[str, Any]:
        pass

    def sit_player(self, player_id: str, player_name: str, seat_index: int) -> Dict[str, Any]:
        return {"success": False, "msg": "Ta gra nie obsługuje siadania przy stole."}
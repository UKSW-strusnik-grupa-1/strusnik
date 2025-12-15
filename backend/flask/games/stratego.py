from games.base import MultiplayerGame
from typing import List, Dict, Any

class Stratego(MultiplayerGame):
    def __init__(self, players: List[str]) -> None:
        super().__init__(players)
        self.game_state = self.init_board()

    def init_board(self) -> Dict[str, Any]:
        return {
            "stage": "bidding",
            "cards": [],
            "current_player": self.players[0]
        }

    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "msg": "Ruch wykonany"}

    def get_state(self) -> Dict[str, Any]:
        return self.game_state
from games.base import MultiplayerGame
from typing import List, Dict, Any

class TicTacToe(MultiplayerGame):
    player_range: List[int] = [2]

    def __init__(self, players: List[str]) -> None:
        super().__init__(players)
        self.game_state = self.init_board()

    def init_board(self) -> Dict[str, Any]:
        return {
            "board": ["", "", "", "", "", "", "", "", ""],
            "current_player": self.players[0],
            "status": "active"
        }

    def sit_player(self, player_id: str, player_name: str, seat_index: int, user_token: str) -> Dict[str, Any]:
        return {"success": True, "msg": "Player seated"}

    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        position = move_data.get("position")
        if self.game_state["board"][position] != "":
            return {"success": False, "msg": "Invalid move"}
        
        symbol = "X" if player_id == self.players[0] else "O"
        self.game_state["board"][position] = symbol
        
        self.game_state["current_player"] = self.players[1] if player_id == self.players[0] else self.players[0]
        
        return {"success": True, "state": self.game_state}

    def get_state(self) -> Dict[str, Any]:
        return self.game_state

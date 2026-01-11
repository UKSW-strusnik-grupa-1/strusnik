from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional, Type, List, Set, Any
from uuid import uuid4

from games.base import MultiplayerGame


class GameType(Enum):
    Multiplayer = "Multiplayer"


@dataclass
class Room:
    uuid: str
    host_id: str
    game_name: str
    players: List[str]
    maxPlayers: int
    password: Optional[str] = None
    room_name: Optional[str] = None
    game_instance: Optional[MultiplayerGame] = None
    player_tokens: Set[str] = field(default_factory=set)

    # --- chess / game settings ---
    time_control_min: Optional[int] = None

    # chess-specific host settings (ignored by other games)
    host_user_token: Optional[str] = None  # stable host identity (token)
    host_color_pref: Optional[str] = None  # 'white'|'black'|'random'
    host_seat_index: Optional[int] = None  # 0=white, 1=black

    def to_dict(self):
        real_players_count = 0

        if self.game_instance and hasattr(self.game_instance, 'seats'):
            real_players_count = len([s for s in self.game_instance.seats if s is not None])

        return {
            "id": self.uuid,
            "game": self.game_name,
            "room_name": self.room_name,
            "players_count": real_players_count,
            "max_players": self.maxPlayers,
            "is_active": self.game_instance is not None,
            "host_id": self.host_id,
            "has_password": self.password is not None,

            # time control (used by chess UI)
            "time_control_min": self.time_control_min,
            "time_min": self.time_control_min,

            # chess host fields (safe to include for other games)
            "host_user_token": self.host_user_token,
            "host_color_pref": self.host_color_pref,
            "host_seat_index": self.host_seat_index,
        }


@dataclass
class Lobby:
    game: Any
    game_class: Type[MultiplayerGame]
    rooms: Dict[str, Room] = field(default_factory=dict)

    def create_room(
        self,
        host_id: str,
        room_name: str,
        game_name: str,
        max_players: int,
        password: Optional[str] = None,
        time_control_min: Optional[int] = None,
        host_user_token: Optional[str] = None,
        host_color_pref: Optional[str] = None,
        host_seat_index: Optional[int] = None,
    ):
        room_uuid = str(uuid4())
        room = Room(
            uuid=room_uuid,
            game_name=game_name,
            room_name=room_name,
            host_id=host_id,
            players=[host_id],
            maxPlayers=max_players,
            password=password,
            player_tokens=set(),
            time_control_min=time_control_min,
            host_user_token=host_user_token,
            host_color_pref=host_color_pref,
            host_seat_index=host_seat_index,
        )
        self.rooms[room_uuid] = room
        return room

    def join_room(self, room_uuid: str, player_id: str, user_token: str):
        room = self.rooms.get(room_uuid)
        if not room:
            return None

        # allow re-join by the same token even if full
        if user_token in room.player_tokens:
            if player_id not in room.players:
                room.players.append(player_id)
            return room

        # basic capacity check (socket_manager has additional chess logic)
        if len(room.player_tokens) >= int(room.maxPlayers or 0):
            return None

        room.player_tokens.add(user_token)
        room.players.append(player_id)
        return room

    def remove_player(self, room_uuid: str, player_sid: str, user_token: str):
        room = self.rooms.get(room_uuid)
        if not room:
            return False

        if user_token in room.player_tokens:
            room.player_tokens.remove(user_token)

        if player_sid in room.players:
            room.players.remove(player_sid)

        return True

    def destroy_room(self, room_uuid: str):
        if room_uuid in self.rooms:
            del self.rooms[room_uuid]
            print(f"Pokój {room_uuid} został usunięty.")
            return True
        return False


@dataclass
class LobbyManager:
    lobbies: Dict[str, Lobby] = field(default_factory=dict)

    def register_game(self, game_name: str, game_type: GameType, game_class: Type[MultiplayerGame]):
        @dataclass
        class GameStub:
            name: str
            type: GameType

        game = GameStub(name=game_name, type=game_type)
        self.lobbies[game_name] = Lobby(game=game, game_class=game_class)

    def get_lobby(self, game_name: str) -> Optional[Lobby]:
        return self.lobbies.get(game_name)
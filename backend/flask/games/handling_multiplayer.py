from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional, Type, List
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

    def to_dict(self):
        return {
            "id": self.uuid,
            "game": self.game_name,
            "room_name": self.room_name,
            "players_count": len(self.players),
            "max_players": self.maxPlayers,
            "is_active": self.game_instance is not None
        }


@dataclass
class Lobby:
    game: any
    game_class: Type[MultiplayerGame]
    rooms: Dict[str, Room] = field(default_factory=dict)

    def create_room(self, host_id: str, room_name: str, game_name: str, max_players: int,
                    password: Optional[str] = None):
        room_uuid = str(uuid4())
        room = Room(
            uuid=room_uuid,
            game_name=game_name,
            room_name=room_name,
            host_id=host_id,
            players=[host_id],
            maxPlayers=max_players,
            password=password
        )
        self.rooms[room_uuid] = room
        return room

    def join_room(self, room_uuid: str, player_id: str):
        room = self.rooms.get(room_uuid)

        if not room:
            return None

        if player_id in room.players:
            return room

        if len(room.players) >= room.maxPlayers:
            return None

        room.players.append(player_id)
        return room


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
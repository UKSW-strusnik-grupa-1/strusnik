import unittest

from games.base import MultiplayerGame
from games.handling_multiplayer import GameType, LobbyManager


class FakeGame(MultiplayerGame):
    player_range = [2]

    def __init__(self, players):
        super().__init__(players)
        self.game_state = {"stage": "waiting_for_players"}
        self.seats = []

    def init_board(self):
        return self.game_state

    def sit_player(self, player_id, player_name, seat_index, user_token):
        return {"success": True}

    def handle_move(self, player_id, move_data):
        return {"success": False}

    def get_state(self):
        return self.game_state


class RoomPresenceTests(unittest.TestCase):
    def setUp(self):
        self.manager = LobbyManager()
        self.manager.register_game("Fake", GameType.Multiplayer, FakeGame)
        self.lobby = self.manager.get_lobby("Fake")
        self.room = self.lobby.create_room(
            host_id="sid-host",
            room_name="Test room",
            game_name="Fake",
            max_players=2,
            host_user_token="user-host",
        )

    def test_observer_does_not_consume_player_slot(self):
        joined = self.lobby.join_observer(
            self.room.uuid, "sid-observer", "user-observer", "Observer"
        )

        self.assertIsNotNone(joined)
        self.assertEqual(len(self.room.player_tokens), 0)
        self.assertEqual(len(self.room.observers), 1)
        self.assertEqual(self.room.to_dict()["players_count"], 0)
        self.assertEqual(self.room.to_dict()["observers_count"], 1)

    def test_observer_limit_and_setting_are_independent_from_players(self):
        self.room.max_observers = 1
        self.assertIsNotNone(
            self.lobby.join_observer(self.room.uuid, "sid-one", "user-one", "One")
        )
        self.assertIsNone(
            self.lobby.join_observer(self.room.uuid, "sid-two", "user-two", "Two")
        )

        self.room.observers_allowed = False
        self.assertIsNone(
            self.lobby.join_observer(self.room.uuid, "sid-three", "user-three", "Three")
        )
        self.assertEqual(len(self.room.observers), 1)

    def test_player_membership_can_be_removed_without_destroying_room_with_observer(self):
        self.lobby.join_observer(self.room.uuid, "sid-observer", "user-observer", "Observer")
        self.room.player_tokens.add("user-host")
        self.lobby.remove_player(self.room.uuid, "sid-host", "user-host")

        self.assertNotIn("user-host", self.room.player_tokens)
        self.assertIn("user-observer", self.room.observers)
        self.assertIn(self.room.uuid, self.lobby.rooms)


if __name__ == "__main__":
    unittest.main()

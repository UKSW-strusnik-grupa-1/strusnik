import unittest
from unittest.mock import patch

from flask import Flask

from games.haxball import HaxballGame
from models import GameStats, HaxballMatch, User, db
from utils import record_haxball_match


class HaxballGameTests(unittest.TestCase):
    def make_game(self, mode="1v1"):
        game = HaxballGame([], mode=mode, map_id="neon-split", duration_min=3)
        return game

    def join_ready(self, game, players):
        for index, (user_id, team) in enumerate(players):
            game.choose_team(user_id, f"sid-{index}", user_id, team)
            game.set_ready(user_id, True)

    def test_input_rate_window_starts_and_resets(self):
        game = self.make_game()
        game.choose_team("a", "sid-a", "A", "red")

        timestamps = [0.0] * 60 + [0.5, 1.01]
        with patch("games.haxball.time.monotonic", side_effect=timestamps):
            accepted = [
                game.handle_input(
                    "sid-a",
                    {"up": True, "down": False, "left": False, "right": False, "kick": False, "sequence": sequence},
                )["success"]
                for sequence in range(60)
            ]
            rejected = game.handle_input(
                "sid-a",
                {"up": True, "down": False, "left": False, "right": False, "kick": False, "sequence": 60},
            )
            accepted_after_reset = game.handle_input(
                "sid-a",
                {"up": True, "down": False, "left": False, "right": False, "kick": False, "sequence": 61},
            )

        self.assertTrue(all(accepted))
        self.assertFalse(rejected["success"])
        self.assertTrue(accepted_after_reset["success"])

    def test_kick_requests_an_immediate_snapshot(self):
        game = self.make_game()
        self.join_ready(game, [("a", "red"), ("b", "blue")])
        game.start_game()
        for _ in range(181):
            game.tick(1 / 60)

        red_player = game._seat_for_user("a")
        self.assertIsNotNone(red_player)
        game.game_state["ball"].update({
            "x": red_player["x"] + 50.0,
            "y": red_player["y"],
            "vx": 0.0,
            "vy": 0.0,
        })
        game.handle_input("sid-0", {
            "kick": True,
            "sequence": 1,
            "up": False,
            "down": False,
            "left": False,
            "right": False,
        })

        result = game.tick(1 / 60)

        self.assertTrue(result["immediate_snapshot"])
        self.assertEqual(game.game_state["last_event"]["type"], "kick")
        self.assertGreater(game.game_state["ball"]["vx"], 0)

    def test_mode_controls_team_capacity(self):
        game = self.make_game("2v2")
        self.join_ready(game, [("a", "red"), ("b", "red"), ("c", "blue"), ("d", "blue")])

        self.assertEqual(game.start_game()["success"], True)
        self.assertEqual(game.max_players, 4)
        self.assertEqual(game.game_state["stage"], "countdown")

        rejected = game.choose_team("e", "sid-e", "E", "red")
        self.assertEqual(rejected["success"], False)

    def test_map_and_duration_changes_clear_ready_state(self):
        game = self.make_game()
        self.join_ready(game, [("a", "red"), ("b", "blue")])

        result = game.update_settings("a", map_id="ice-dock", duration_min=10)

        self.assertTrue(result["success"])
        self.assertEqual(game.map_id, "ice-dock")
        self.assertEqual(game.duration_min, 10)
        self.assertFalse(any(seat["ready"] for seat in game.seats if seat))

    def test_goal_updates_score_and_starts_kickoff_reset(self):
        game = self.make_game()
        self.join_ready(game, [("a", "red"), ("b", "blue")])
        game.start_game()
        for _ in range(181):
            game.tick(1 / 60)

        game._score_goal("red")

        self.assertEqual(game.game_state["score"], {"red": 1, "blue": 0})
        self.assertEqual(game.game_state["stage"], "playing")
        self.assertEqual(game.game_state["kickoff_team"], "blue")
        self.assertEqual(len(game.game_state["goals"]), 1)

    def test_ball_scores_when_crossing_an_open_goal(self):
        game = self.make_game()
        self.join_ready(game, [("a", "red"), ("b", "blue")])
        game.start_game()
        for _ in range(181):
            game.tick(1 / 60)

        game.game_state["ball"].update({"x": 30.0, "y": 500.0, "vx": -1300.0, "vy": 0.0})
        for _ in range(10):
            game.tick(1 / 60)

        self.assertEqual(game.game_state["score"], {"red": 0, "blue": 1})
        self.assertEqual(len(game.game_state["goals"]), 1)

    def test_match_result_is_idempotent_and_updates_profile_stats(self):
        app = Flask(__name__)
        app.config.update(
            TESTING=True,
            SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(app)
        with app.app_context():
            db.create_all()
            red = User(username="Red", password="hashed")
            blue = User(username="Blue", password="hashed")
            db.session.add_all([red, blue])
            db.session.commit()

            participants = [
                {"userId": str(red.id), "name": "Red", "team": "red", "goals": 2, "assists": 1},
                {"userId": str(blue.id), "name": "Blue", "team": "blue", "goals": 0, "assists": 0},
            ]
            first = record_haxball_match(
                "match-1", "room-1", "classic-arena", "1v1", 5,
                {"red": 2, "blue": 0}, "red", "time", participants,
            )
            second = record_haxball_match(
                "match-1", "room-1", "classic-arena", "1v1", 5,
                {"red": 2, "blue": 0}, "red", "time", participants,
            )

            self.assertTrue(first)
            self.assertFalse(second)
            self.assertEqual(HaxballMatch.query.count(), 1)
            stats = GameStats.query.filter_by(game_name="Haxball").order_by(GameStats.user_id).all()
            self.assertEqual(stats[0].points, 3)
            self.assertEqual(stats[0].goals, 2)
            self.assertEqual(stats[0].assists, 1)
            self.assertEqual(stats[1].losses, 1)
            db.session.remove()
            db.drop_all()

    def test_overtime_draw_finishes_match_after_two_minutes(self):
        game = self.make_game()
        self.join_ready(game, [("a", "red"), ("b", "blue")])
        game.start_game()
        for _ in range(181):
            game.tick(1 / 60)
        game.game_state["remaining_ms"] = 0
        game.tick(1 / 60)

        self.assertEqual(game.game_state["stage"], "overtime")
        game.game_state["overtime_remaining_ms"] = 0
        game.game_state["countdown_ms"] = 0
        game.tick(1 / 60)

        self.assertEqual(game.game_state["stage"], "finished")
        self.assertIsNone(game.game_state["result"]["winner_team"])
        self.assertEqual(game.game_state["result"]["reason"], "overtime_draw")


if __name__ == "__main__":
    unittest.main()

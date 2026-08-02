from __future__ import annotations

import copy
import math
import random
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .base import MultiplayerGame


FIELD_WIDTH = 2000.0
FIELD_HEIGHT = 1000.0
GOAL_WIDTH = 300.0
GOAL_DEPTH = 90.0
PLAYER_RADIUS = 30.0
BALL_RADIUS = 18.0
PLAYER_MAX_SPEED = 390.0
PLAYER_ACCELERATION = 1550.0
PLAYER_FRICTION = 8.0
BALL_FRICTION = 0.22
BALL_MAX_SPEED = 1300.0
BALL_BOUNCE = 0.88
PLAYER_BOUNCE = 0.72
KICK_COOLDOWN_SECONDS = 0.25
KICK_RADIUS = 78.0
KICK_IMPULSE = 860.0
COUNTDOWN_SECONDS = 3.0
OVERTIME_SECONDS = 120.0
ASSIST_WINDOW_SECONDS = 3.0

VALID_MODES = {"1v1": 2, "2v2": 4}
VALID_DURATIONS = {3, 5, 10}
TEAM_RED = "red"
TEAM_BLUE = "blue"
TEAMS = (TEAM_RED, TEAM_BLUE)

# Geometry is deliberately data only. The same identifiers are sent to the
# client, while the server remains the authority for collisions and goals.
HAXBALL_MAPS: Dict[str, Dict[str, Any]] = {
    "classic-arena": {
        "name": "Classic Arena",
        "description": "Open space for clean passes and direct attacks.",
        "accent": "amber",
        "obstacles": [],
    },
    "neon-split": {
        "name": "Neon Split",
        "description": "A central gate turns every attack into a choice.",
        "accent": "cyan",
        "obstacles": [
            {"x": 960, "y": 0, "width": 80, "height": 330},
            {"x": 960, "y": 670, "width": 80, "height": 330},
        ],
    },
    "canyon-gate": {
        "name": "Canyon Gate",
        "description": "Symmetric gates open three lanes through the middle.",
        "accent": "orange",
        "obstacles": [
            {"x": 760, "y": 220, "width": 160, "height": 100},
            {"x": 1080, "y": 220, "width": 160, "height": 100},
            {"x": 760, "y": 680, "width": 160, "height": 100},
            {"x": 1080, "y": 680, "width": 160, "height": 100},
        ],
    },
    "ice-dock": {
        "name": "Ice Dock",
        "description": "Wide lanes with symmetric side blocks and quick rotations.",
        "accent": "blue",
        "obstacles": [
            {"x": 400, "y": 160, "width": 100, "height": 200},
            {"x": 400, "y": 640, "width": 100, "height": 200},
            {"x": 1500, "y": 160, "width": 100, "height": 200},
            {"x": 1500, "y": 640, "width": 100, "height": 200},
        ],
    },
}


def normalize_map_id(value: Any) -> str:
    candidate = str(value or "classic-arena").strip().lower()
    return candidate if candidate in HAXBALL_MAPS else "classic-arena"


def normalize_mode(value: Any) -> str:
    candidate = str(value or "1v1").strip().lower()
    return candidate if candidate in VALID_MODES else "1v1"


def normalize_duration(value: Any) -> int:
    try:
        candidate = int(value)
    except (TypeError, ValueError):
        return 5
    return candidate if candidate in VALID_DURATIONS else 5


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _length(x: float, y: float) -> float:
    return math.sqrt((x * x) + (y * y))


def _normalize(x: float, y: float, fallback_x: float = 0.0, fallback_y: float = 0.0) -> tuple[float, float]:
    magnitude = _length(x, y)
    if magnitude <= 0.0001:
        return fallback_x, fallback_y
    return x / magnitude, y / magnitude


def _distance(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


class HaxballGame(MultiplayerGame):
    """Server authoritative 2D Haxball style match simulation.

    The public interface is intentionally small: room code chooses teams,
    readiness, settings and input, while this module owns all match state,
    physics, goals, timers and result attribution.
    """

    player_range = [2, 4]
    keep_room_after_finish = True

    def __init__(
        self,
        players: List[str],
        mode: str = "1v1",
        map_id: str = "classic-arena",
        duration_min: int = 5,
    ) -> None:
        super().__init__(players)
        self.mode = normalize_mode(mode)
        self.max_players = VALID_MODES[self.mode]
        self.map_id = normalize_map_id(map_id)
        self.duration_min = normalize_duration(duration_min)
        self.seats: List[Optional[Dict[str, Any]]] = [None] * self.max_players
        self._inputs: Dict[str, Dict[str, Any]] = {}
        self._last_input_at: Dict[str, float] = {}
        self._input_window_started_at: Dict[str, float] = {}
        self._input_window_count: Dict[str, int] = {}
        self._last_kick_at: Dict[str, float] = {}
        self._touches: List[Dict[str, Any]] = []
        self._pending_result: Optional[Dict[str, Any]] = None
        self._immediate_snapshot = False
        self._rng = random.SystemRandom()
        self.game_state = self.init_board()

    @property
    def map_definition(self) -> Dict[str, Any]:
        return HAXBALL_MAPS[self.map_id]

    def init_board(self) -> Dict[str, Any]:
        return {
            "stage": "waiting_for_players",
            "mode": self.mode,
            "map_id": self.map_id,
            "duration_min": self.duration_min,
            "max_players": self.max_players,
            "field": {
                "width": FIELD_WIDTH,
                "height": FIELD_HEIGHT,
                "goal_width": GOAL_WIDTH,
                "goal_depth": GOAL_DEPTH,
                "player_radius": PLAYER_RADIUS,
                "ball_radius": BALL_RADIUS,
                "obstacles": copy.deepcopy(self.map_definition["obstacles"]),
            },
            "score": {TEAM_RED: 0, TEAM_BLUE: 0},
            "ball": {"x": FIELD_WIDTH / 2, "y": FIELD_HEIGHT / 2, "vx": 0.0, "vy": 0.0},
            "remaining_ms": self.duration_min * 60_000,
            "overtime_remaining_ms": None,
            "countdown_ms": None,
            "kickoff_team": None,
            "last_goal": None,
            "last_event": None,
            "goals": [],
            "result": None,
            "match_id": None,
            "started_at": None,
            "seats": self.seats,
        }

    def get_state(self) -> Dict[str, Any]:
        state = copy.deepcopy(self.game_state)
        state["seats"] = [self._public_seat(seat) if seat else None for seat in self.seats]
        state["players"] = [self._public_seat(seat) for seat in self.seats if seat]
        state["map"] = {
            "id": self.map_id,
            "name": self.map_definition["name"],
            "description": self.map_definition["description"],
            "accent": self.map_definition["accent"],
        }
        state["server_time_ms"] = int(time.time() * 1000)
        return state

    def _public_seat(self, seat: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "userId": str(seat.get("userId")),
            "name": seat.get("name") or "GOSC",
            "team": seat.get("team"),
            "connected": bool(seat.get("connected", True)),
            "ready": bool(seat.get("ready", False)),
            "goals": int(seat.get("goals", 0)),
            "assists": int(seat.get("assists", 0)),
            "ownGoals": int(seat.get("ownGoals", 0)),
            "x": round(float(seat.get("x", 0.0)), 2),
            "y": round(float(seat.get("y", 0.0)), 2),
            "vx": round(float(seat.get("vx", 0.0)), 2),
            "vy": round(float(seat.get("vy", 0.0)), 2),
            "facingX": float(seat.get("facingX", 1.0)),
            "facingY": float(seat.get("facingY", 0.0)),
        }

    def _seat_for_user(self, user_token: str) -> Optional[Dict[str, Any]]:
        return next(
            (seat for seat in self.seats if seat and str(seat.get("userId")) == str(user_token)),
            None,
        )

    def _seat_for_socket(self, socket_id: str) -> Optional[Dict[str, Any]]:
        return next(
            (seat for seat in self.seats if seat and str(seat.get("socketId")) == str(socket_id)),
            None,
        )

    def _team_count(self, team: str) -> int:
        return sum(1 for seat in self.seats if seat and seat.get("team") == team)

    def _team_capacity(self) -> int:
        return self.max_players // 2

    def _spawn_position(self, team: str, team_slot: int) -> tuple[float, float, float]:
        y_positions = [350.0, 650.0]
        y = y_positions[min(team_slot, len(y_positions) - 1)]
        if team == TEAM_RED:
            return 320.0 + (team_slot * 90.0), y, 1.0
        return 1680.0 - (team_slot * 90.0), y, -1.0

    def _reset_round_positions(self) -> None:
        team_slots = {TEAM_RED: 0, TEAM_BLUE: 0}
        for seat in self.seats:
            if not seat or not seat.get("team"):
                continue
            x, y, facing_x = self._spawn_position(seat["team"], team_slots[seat["team"]])
            team_slots[seat["team"]] += 1
            seat.update({"x": x, "y": y, "vx": 0.0, "vy": 0.0, "facingX": facing_x, "facingY": 0.0})
        self.game_state["ball"] = {
            "x": FIELD_WIDTH / 2,
            "y": FIELD_HEIGHT / 2,
            "vx": 0.0,
            "vy": 0.0,
        }
        self._touches.clear()
        for token in list(self._inputs):
            self._inputs[token] = self._empty_input()

    @staticmethod
    def _empty_input() -> Dict[str, Any]:
        return {
            "up": False,
            "down": False,
            "left": False,
            "right": False,
            "kick": False,
            "sequence": 0,
        }

    def choose_team(self, user_token: str, socket_id: str, player_name: str, team: str) -> Dict[str, Any]:
        team = str(team or "").lower().strip()
        if team not in TEAMS:
            return {"success": False, "msg": "Nieprawidlowa druzyna."}
        if self.game_state["stage"] != "waiting_for_players":
            return {"success": False, "msg": "Druzyny mozna zmieniac tylko w poczekalni."}

        existing = self._seat_for_user(user_token)
        if existing and existing.get("ready"):
            return {"success": False, "msg": "Najpierw anuluj gotowosc."}
        if not existing and self._team_count(team) >= self._team_capacity():
            return {"success": False, "msg": "Ta druzyna nie ma juz wolnych miejsc."}

        if existing:
            if existing.get("team") != team and self._team_count(team) >= self._team_capacity():
                return {"success": False, "msg": "Ta druzyna nie ma juz wolnych miejsc."}
            existing["team"] = team
            existing["socketId"] = socket_id
            existing["name"] = player_name or existing.get("name") or "GOSC"
            existing["ready"] = False
        else:
            seat = {
                "socketId": socket_id,
                "userId": str(user_token),
                "name": player_name or "GOSC",
                "team": team,
                "connected": True,
                "ready": False,
                "goals": 0,
                "assists": 0,
                "ownGoals": 0,
                "x": 0.0,
                "y": 0.0,
                "vx": 0.0,
                "vy": 0.0,
                "facingX": 1.0 if team == TEAM_RED else -1.0,
                "facingY": 0.0,
                "disconnect_timestamp": None,
            }
            empty_index = next((index for index, item in enumerate(self.seats) if item is None), None)
            if empty_index is None:
                return {"success": False, "msg": "Brak wolnego miejsca."}
            self.seats[empty_index] = seat
            existing = seat

        team_slots = sum(1 for seat in self.seats if seat and seat.get("team") == team) - 1
        x, y, facing_x = self._spawn_position(team, max(team_slots, 0))
        existing.update({"x": x, "y": y, "facingX": facing_x, "facingY": 0.0})
        self.game_state["seats"] = self.seats
        return {"success": True}

    def sit_player(self, player_id: str, player_name: str, seat_index: int, user_token: str) -> Dict[str, Any]:
        """Compatibility adapter for the shared waiting-room interface.

        Haxball uses choose_team for its real assignment. This method maps a
        seat request to the first available team so generic integrations still
        get a safe, deterministic result.
        """
        if not (0 <= seat_index < self.max_players):
            return {"success": False, "msg": "Nieprawidlowe miejsce."}
        preferred_team = TEAM_RED if seat_index < self._team_capacity() else TEAM_BLUE
        return self.choose_team(user_token, player_id, player_name, preferred_team)

    def set_ready(self, user_token: str, ready: bool) -> Dict[str, Any]:
        if self.game_state["stage"] != "waiting_for_players":
            return {"success": False, "msg": "Gotowosc jest dostepna tylko w poczekalni."}
        seat = self._seat_for_user(user_token)
        if not seat:
            return {"success": False, "msg": "Najpierw wybierz druzyne."}
        if ready and (not seat.get("team") or not seat.get("connected", True)):
            return {"success": False, "msg": "Musisz wybrac druzyne i miec aktywne polaczenie."}
        seat["ready"] = bool(ready)
        return {"success": True}

    def update_settings(self, user_token: str, map_id: Any = None, duration_min: Any = None) -> Dict[str, Any]:
        if self.game_state["stage"] != "waiting_for_players":
            return {"success": False, "msg": "Ustawienia mozna zmieniac tylko w poczekalni."}
        changed = False
        next_map = normalize_map_id(map_id) if map_id is not None else self.map_id
        next_duration = normalize_duration(duration_min) if duration_min is not None else self.duration_min
        if next_map != self.map_id:
            self.map_id = next_map
            changed = True
        if next_duration != self.duration_min:
            self.duration_min = next_duration
            self.game_state["remaining_ms"] = self.duration_min * 60_000
            changed = True
        if changed:
            self.game_state["map_id"] = self.map_id
            self.game_state["duration_min"] = self.duration_min
            self.game_state["field"]["obstacles"] = copy.deepcopy(self.map_definition["obstacles"])
            for seat in self.seats:
                if seat:
                    seat["ready"] = False
        return {"success": True, "changed": changed}

    def start_game(self) -> Dict[str, Any]:
        if self.game_state["stage"] != "waiting_for_players":
            return {"success": False, "msg": "Gra juz zostala rozpoczeta."}
        if any(seat is None for seat in self.seats):
            return {"success": False, "msg": "Potrzebni sa wszyscy gracze."}
        if any(not seat.get("team") for seat in self.seats):
            return {"success": False, "msg": "Kazdy gracz musi wybrac druzyne."}
        if self._team_count(TEAM_RED) != self._team_capacity() or self._team_count(TEAM_BLUE) != self._team_capacity():
            return {"success": False, "msg": "Druzyny musza byc zbalansowane."}
        if any(not seat.get("ready") for seat in self.seats):
            return {"success": False, "msg": "Wszyscy gracze musza byc gotowi."}
        if any(not seat.get("connected", True) for seat in self.seats):
            return {"success": False, "msg": "Wszyscy gracze musza byc polaczeni."}

        self._pending_result = None
        self.game_state.update({
            "stage": "countdown",
            "match_id": str(uuid4()),
            "started_at": time.time(),
            "score": {TEAM_RED: 0, TEAM_BLUE: 0},
            "remaining_ms": self.duration_min * 60_000,
            "overtime_remaining_ms": None,
            "countdown_ms": COUNTDOWN_SECONDS * 1000,
            "kickoff_team": self._rng.choice(list(TEAMS)),
            "last_goal": None,
            "last_event": None,
            "goals": [],
            "result": None,
        })
        for seat in self.seats:
            if seat:
                seat.update({"goals": 0, "assists": 0, "ownGoals": 0})
        self._reset_round_positions()
        return {"success": True}

    def prepare_rematch(self, user_token: str) -> Dict[str, Any]:
        seat = self._seat_for_user(user_token)
        if not seat:
            return {"success": False, "msg": "Nie jestes graczem tego pokoju."}
        if self.game_state["stage"] != "finished":
            return {"success": False, "msg": "Rewanz jest dostepny po zakonczeniu meczu."}
        for player in self.seats:
            if player:
                player["ready"] = False
                player["connected"] = True
        self.game_state.update({
            "stage": "waiting_for_players",
            "match_id": None,
            "started_at": None,
            "remaining_ms": self.duration_min * 60_000,
            "overtime_remaining_ms": None,
            "countdown_ms": None,
            "kickoff_team": None,
            "last_goal": None,
            "last_event": None,
            "score": {TEAM_RED: 0, TEAM_BLUE: 0},
            "result": self.game_state.get("result"),
        })
        self._reset_round_positions()
        return {"success": True}

    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        return self.handle_input(player_id, move_data)

    def handle_input(self, socket_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(input_data, dict):
            return {"success": False, "silent": True}
        seat = self._seat_for_socket(socket_id)
        if not seat:
            return {"success": False, "silent": True}
        user_token = str(seat.get("userId"))
        now = time.monotonic()
        window_start = self._input_window_started_at.get(user_token)
        if window_start is None or now - window_start >= 1.0:
            self._input_window_started_at[user_token] = now
            self._input_window_count[user_token] = 0
        count = self._input_window_count.get(user_token, 0)
        if count >= 60:
            return {"success": False, "silent": True}
        self._input_window_count[user_token] = count + 1

        raw_input = input_data.get("input", input_data)
        if not isinstance(raw_input, dict):
            return {"success": False, "silent": True}
        sequence = raw_input.get("sequence", input_data.get("sequence", 0))
        if isinstance(sequence, bool) or not isinstance(sequence, int):
            return {"success": False, "silent": True}
        previous_sequence = int(self._inputs.get(user_token, {}).get("sequence", -1))
        if sequence < previous_sequence:
            return {"success": False, "silent": True}

        next_input = self._empty_input()
        next_input["sequence"] = sequence
        for key in ("up", "down", "left", "right", "kick"):
            value = raw_input.get(key, False)
            if not isinstance(value, bool):
                return {"success": False, "silent": True}
            next_input[key] = value
        self._inputs[user_token] = next_input
        self._last_input_at[user_token] = now
        return {"success": True}

    def set_player_connection_status(self, user_token: str, is_connected: bool, sid: str = None) -> bool:
        seat = self._seat_for_user(user_token)
        if not seat:
            return False
        if sid and is_connected:
            seat["socketId"] = sid
            seat["disconnect_timestamp"] = None
        if seat.get("connected") == is_connected:
            return False
        seat["connected"] = is_connected
        if not is_connected:
            seat["disconnect_timestamp"] = time.time()
            self._inputs[str(user_token)] = self._empty_input()
        return True

    def remove_player(self, user_token: str) -> bool:
        for index, seat in enumerate(self.seats):
            if seat and str(seat.get("userId")) == str(user_token):
                self.seats[index] = None
                self._inputs.pop(str(user_token), None)
                return True
        return False

    def forfeit_player(self, user_token: str, reason: str = "resign") -> Dict[str, Any]:
        if self.game_state["stage"] not in {"countdown", "playing", "overtime"}:
            return {"success": False, "msg": "Mecz nie jest aktywny."}
        seat = self._seat_for_user(user_token)
        if not seat:
            return {"success": False, "msg": "Nie znaleziono gracza."}
        winner_team = TEAM_BLUE if seat.get("team") == TEAM_RED else TEAM_RED
        self._finish(winner_team, f"forfeit:{reason}")
        return {"success": True}

    def tick(self, dt: float = 1 / 60) -> Dict[str, Any]:
        stage = self.game_state.get("stage")
        if stage not in {"countdown", "playing", "overtime"}:
            return {"state_changed": False, "finished": False, "immediate_snapshot": False}

        self._immediate_snapshot = False
        dt = _clamp(float(dt), 0.0, 0.1)
        if self.game_state.get("countdown_ms") is not None and self.game_state["countdown_ms"] > 0:
            self.game_state["countdown_ms"] = max(0.0, self.game_state["countdown_ms"] - dt * 1000)
            if self.game_state["countdown_ms"] <= 0:
                self.game_state["countdown_ms"] = None
                if stage == "countdown":
                    self.game_state["stage"] = "playing"
            return {"state_changed": True, "finished": False, "immediate_snapshot": False}

        if stage in {"playing", "overtime"}:
            self._simulate(dt)
            current_stage = self.game_state.get("stage")
            if current_stage == "playing":
                self.game_state["remaining_ms"] = max(0.0, self.game_state["remaining_ms"] - dt * 1000)
                if self.game_state["remaining_ms"] <= 0:
                    score = self.game_state["score"]
                    if score[TEAM_RED] == score[TEAM_BLUE]:
                        self.game_state["stage"] = "overtime"
                        self.game_state["overtime_remaining_ms"] = OVERTIME_SECONDS * 1000
                        self.game_state["countdown_ms"] = COUNTDOWN_SECONDS * 1000
                        self.game_state["kickoff_team"] = self._rng.choice(list(TEAMS))
                        self._reset_round_positions()
                    else:
                        winner = TEAM_RED if score[TEAM_RED] > score[TEAM_BLUE] else TEAM_BLUE
                        self._finish(winner, "time")
            elif current_stage == "overtime" and self.game_state.get("overtime_remaining_ms") is not None:
                self.game_state["overtime_remaining_ms"] = max(0.0, self.game_state["overtime_remaining_ms"] - dt * 1000)
                if self.game_state["overtime_remaining_ms"] <= 0:
                    self._finish(None, "overtime_draw")

        return {
            "state_changed": True,
            "finished": self.game_state.get("stage") == "finished",
            "immediate_snapshot": self._immediate_snapshot,
        }

    def consume_match_result(self) -> Optional[Dict[str, Any]]:
        result = self._pending_result
        self._pending_result = None
        return copy.deepcopy(result) if result else None

    def _simulate(self, dt: float) -> None:
        for seat in self.seats:
            if not seat or not seat.get("connected", True):
                continue
            token = str(seat.get("userId"))
            current_input = self._inputs.get(token, self._empty_input())
            x_input = float(current_input["right"]) - float(current_input["left"])
            y_input = float(current_input["down"]) - float(current_input["up"])
            direction_x, direction_y = _normalize(x_input, y_input)
            if abs(direction_x) > 0.001 or abs(direction_y) > 0.001:
                seat["facingX"] = direction_x
                seat["facingY"] = direction_y
                seat["vx"] += direction_x * PLAYER_ACCELERATION * dt
                seat["vy"] += direction_y * PLAYER_ACCELERATION * dt
            else:
                friction = max(0.0, 1.0 - PLAYER_FRICTION * dt)
                seat["vx"] *= friction
                seat["vy"] *= friction
            speed = _length(seat["vx"], seat["vy"])
            if speed > PLAYER_MAX_SPEED:
                seat["vx"], seat["vy"] = _normalize(seat["vx"], seat["vy"], 0.0, 0.0)
                seat["vx"] *= PLAYER_MAX_SPEED
                seat["vy"] *= PLAYER_MAX_SPEED
            seat["x"] += seat["vx"] * dt
            seat["y"] += seat["vy"] * dt
            self._resolve_player_bounds(seat)
            self._resolve_player_obstacles(seat)
            if current_input.get("kick"):
                self._try_kick(seat)

        self._resolve_player_collisions()
        self._integrate_ball(dt)

    def _resolve_player_bounds(self, seat: Dict[str, Any]) -> None:
        seat["x"] = _clamp(seat["x"], PLAYER_RADIUS, FIELD_WIDTH - PLAYER_RADIUS)
        seat["y"] = _clamp(seat["y"], PLAYER_RADIUS, FIELD_HEIGHT - PLAYER_RADIUS)

    def _resolve_player_obstacles(self, seat: Dict[str, Any]) -> None:
        for obstacle in self.map_definition["obstacles"]:
            self._resolve_circle_rect(seat, PLAYER_RADIUS, obstacle, bounce=PLAYER_BOUNCE)

    @staticmethod
    def _resolve_circle_rect(body: Dict[str, Any], radius: float, rect: Dict[str, Any], bounce: float = 0.0) -> bool:
        closest_x = _clamp(body["x"], rect["x"], rect["x"] + rect["width"])
        closest_y = _clamp(body["y"], rect["y"], rect["y"] + rect["height"])
        dx = body["x"] - closest_x
        dy = body["y"] - closest_y
        distance = math.sqrt(dx * dx + dy * dy)
        if distance >= radius:
            return False
        if distance <= 0.0001:
            left = abs(body["x"] - rect["x"])
            right = abs(rect["x"] + rect["width"] - body["x"])
            top = abs(body["y"] - rect["y"])
            bottom = abs(rect["y"] + rect["height"] - body["y"])
            smallest = min(left, right, top, bottom)
            if smallest == left:
                dx, dy = -1.0, 0.0
            elif smallest == right:
                dx, dy = 1.0, 0.0
            elif smallest == top:
                dx, dy = 0.0, -1.0
            else:
                dx, dy = 0.0, 1.0
            distance = 1.0
        else:
            dx /= distance
            dy /= distance
            distance = 1.0
        overlap = radius - math.sqrt((body["x"] - closest_x) ** 2 + (body["y"] - closest_y) ** 2)
        body["x"] += dx * max(overlap, 0.0)
        body["y"] += dy * max(overlap, 0.0)
        velocity_along_normal = body.get("vx", 0.0) * dx + body.get("vy", 0.0) * dy
        if velocity_along_normal < 0:
            body["vx"] -= (1.0 + bounce) * velocity_along_normal * dx
            body["vy"] -= (1.0 + bounce) * velocity_along_normal * dy
        return True

    def _resolve_player_collisions(self) -> None:
        for first_index, first in enumerate(self.seats):
            if not first or not first.get("connected", True):
                continue
            for second in self.seats[first_index + 1 :]:
                if not second or not second.get("connected", True):
                    continue
                dx = second["x"] - first["x"]
                dy = second["y"] - first["y"]
                distance = math.sqrt(dx * dx + dy * dy)
                minimum = PLAYER_RADIUS * 2
                if distance >= minimum:
                    continue
                nx, ny = _normalize(dx, dy, 1.0, 0.0)
                overlap = minimum - max(distance, 0.0001)
                first["x"] -= nx * overlap / 2
                first["y"] -= ny * overlap / 2
                second["x"] += nx * overlap / 2
                second["y"] += ny * overlap / 2
                relative_velocity = (second["vx"] - first["vx"]) * nx + (second["vy"] - first["vy"]) * ny
                if relative_velocity < 0:
                    impulse = -(1.0 + PLAYER_BOUNCE) * relative_velocity / 2
                    first["vx"] -= impulse * nx
                    first["vy"] -= impulse * ny
                    second["vx"] += impulse * nx
                    second["vy"] += impulse * ny
                self._resolve_player_bounds(first)
                self._resolve_player_bounds(second)

    def _set_event(self, event_type: str) -> None:
        current = self.game_state.get("last_event") or {}
        self.game_state["last_event"] = {
            "id": int(current.get("id", 0)) + 1,
            "type": event_type,
            "at_ms": int(time.time() * 1000),
        }

    def _try_kick(self, seat: Dict[str, Any]) -> None:
        token = str(seat.get("userId"))
        now = time.monotonic()
        if now - self._last_kick_at.get(token, 0.0) < KICK_COOLDOWN_SECONDS:
            return
        self._last_kick_at[token] = now
        ball = self.game_state["ball"]
        dx = ball["x"] - seat["x"]
        dy = ball["y"] - seat["y"]
        if math.sqrt(dx * dx + dy * dy) > KICK_RADIUS:
            return
        direction_x, direction_y = _normalize(seat.get("facingX", 0.0), seat.get("facingY", 0.0), 1.0, 0.0)
        ball["vx"] += direction_x * KICK_IMPULSE
        ball["vy"] += direction_y * KICK_IMPULSE
        self._set_event("kick")
        self._immediate_snapshot = True
        self._register_touch(seat)

    def _integrate_ball(self, dt: float) -> None:
        ball = self.game_state["ball"]
        ball["x"] += ball["vx"] * dt
        ball["y"] += ball["vy"] * dt
        friction = max(0.0, 1.0 - BALL_FRICTION * dt)
        ball["vx"] *= friction
        ball["vy"] *= friction
        speed = _length(ball["vx"], ball["vy"])
        if speed > BALL_MAX_SPEED:
            ball["vx"], ball["vy"] = _normalize(ball["vx"], ball["vy"], 0.0, 0.0)
            ball["vx"] *= BALL_MAX_SPEED
            ball["vy"] *= BALL_MAX_SPEED

        goal_top = (FIELD_HEIGHT - GOAL_WIDTH) / 2
        goal_bottom = goal_top + GOAL_WIDTH
        if ball["x"] < -BALL_RADIUS and goal_top <= ball["y"] <= goal_bottom:
            self._score_goal(TEAM_BLUE)
            return
        if ball["x"] > FIELD_WIDTH + BALL_RADIUS and goal_top <= ball["y"] <= goal_bottom:
            self._score_goal(TEAM_RED)
            return

        in_goal_mouth = goal_top <= ball["y"] <= goal_bottom
        if ball["x"] < BALL_RADIUS and not in_goal_mouth:
            ball["x"] = BALL_RADIUS
            ball["vx"] = abs(ball["vx"]) * BALL_BOUNCE
            self._set_event("bounce")
        elif ball["x"] > FIELD_WIDTH - BALL_RADIUS and not in_goal_mouth:
            ball["x"] = FIELD_WIDTH - BALL_RADIUS
            ball["vx"] = -abs(ball["vx"]) * BALL_BOUNCE
            self._set_event("bounce")
        if ball["y"] < BALL_RADIUS:
            ball["y"] = BALL_RADIUS
            ball["vy"] = abs(ball["vy"]) * BALL_BOUNCE
            self._set_event("bounce")
        elif ball["y"] > FIELD_HEIGHT - BALL_RADIUS:
            ball["y"] = FIELD_HEIGHT - BALL_RADIUS
            ball["vy"] = -abs(ball["vy"]) * BALL_BOUNCE
            self._set_event("bounce")

        for obstacle in self.map_definition["obstacles"]:
            if self._resolve_circle_rect(ball, BALL_RADIUS, obstacle, bounce=BALL_BOUNCE):
                self._set_event("bounce")
                speed = _length(ball["vx"], ball["vy"])
                if speed > BALL_MAX_SPEED:
                    ball["vx"], ball["vy"] = _normalize(ball["vx"], ball["vy"], 0.0, 0.0)
                    ball["vx"] *= BALL_MAX_SPEED
                    ball["vy"] *= BALL_MAX_SPEED

        for seat in self.seats:
            if not seat or not seat.get("connected", True):
                continue
            dx = ball["x"] - seat["x"]
            dy = ball["y"] - seat["y"]
            distance = math.sqrt(dx * dx + dy * dy)
            minimum = PLAYER_RADIUS + BALL_RADIUS
            if distance >= minimum:
                continue
            nx, ny = _normalize(dx, dy, seat.get("facingX", 1.0), seat.get("facingY", 0.0))
            overlap = minimum - max(distance, 0.0001)
            ball["x"] += nx * overlap
            ball["y"] += ny * overlap
            relative_velocity = (ball["vx"] - seat["vx"]) * nx + (ball["vy"] - seat["vy"]) * ny
            if relative_velocity < 0:
                impulse = -(1.0 + BALL_BOUNCE) * relative_velocity
                ball["vx"] += impulse * nx
                ball["vy"] += impulse * ny
            self._set_event("touch")
            self._register_touch(seat)

    def _register_touch(self, seat: Dict[str, Any]) -> None:
        now = time.monotonic()
        team = seat.get("team")
        user_id = str(seat.get("userId"))
        if team not in TEAMS:
            return
        self._touches.append({"time": now, "team": team, "user_id": user_id})
        self._touches = [touch for touch in self._touches if now - touch["time"] <= ASSIST_WINDOW_SECONDS]

    def _score_goal(self, scoring_team: str) -> None:
        if self.game_state.get("stage") not in {"playing", "overtime"}:
            return
        now = time.monotonic()
        touches = [touch for touch in self._touches if now - touch["time"] <= ASSIST_WINDOW_SECONDS]
        last_touch = touches[-1] if touches else None
        scorer = next(
            (seat for seat in self.seats if seat and str(seat.get("userId")) == str(last_touch.get("user_id"))),
            None,
        ) if last_touch else None
        own_goal = bool(last_touch and last_touch.get("team") != scoring_team)
        assister = None
        if last_touch and last_touch.get("team") == scoring_team:
            assister_touch = next(
                (
                    touch for touch in reversed(touches[:-1])
                    if touch.get("team") == scoring_team and touch.get("user_id") != last_touch.get("user_id")
                ),
                None,
            )
            if assister_touch:
                assister = next(
                    (seat for seat in self.seats if seat and str(seat.get("userId")) == str(assister_touch.get("user_id"))),
                    None,
                )

        self.game_state["score"][scoring_team] += 1
        if scorer:
            if own_goal:
                scorer["ownGoals"] = int(scorer.get("ownGoals", 0)) + 1
            else:
                scorer["goals"] = int(scorer.get("goals", 0)) + 1
        if assister and not own_goal:
            assister["assists"] = int(assister.get("assists", 0)) + 1

        goal = {
            "team": scoring_team,
            "scorer": scorer.get("name") if scorer else None,
            "scorer_id": str(scorer.get("userId")) if scorer and scorer.get("userId") else None,
            "assist": assister.get("name") if assister and not own_goal else None,
            "assist_id": str(assister.get("userId")) if assister and not own_goal and assister.get("userId") else None,
            "own_goal": own_goal,
            "score": copy.deepcopy(self.game_state["score"]),
            "at_ms": max(0, int(self.game_state.get("duration_min", 5) * 60_000 - self.game_state.get("remaining_ms", 0))),
        }
        self.game_state["goals"].append(goal)
        self.game_state["last_goal"] = goal
        self._set_event("goal")
        self._immediate_snapshot = True
        self._touches.clear()

        if self.game_state.get("stage") == "overtime":
            self._finish(scoring_team, "golden_goal")
            return

        self.game_state["kickoff_team"] = TEAM_BLUE if scoring_team == TEAM_RED else TEAM_RED
        self.game_state["countdown_ms"] = COUNTDOWN_SECONDS * 1000
        self._reset_round_positions()

    def _finish(self, winner_team: Optional[str], reason: str) -> None:
        if self.game_state.get("stage") == "finished":
            return
        score = copy.deepcopy(self.game_state["score"])
        result = {
            "match_id": self.game_state.get("match_id"),
            "winner_team": winner_team,
            "score": score,
            "reason": reason,
            "map_id": self.map_id,
            "mode": self.mode,
            "duration_min": self.duration_min,
            "players": [
                {
                    "userId": str(seat.get("userId")),
                    "name": seat.get("name") or "GOSC",
                    "team": seat.get("team"),
                    "goals": int(seat.get("goals", 0)),
                    "assists": int(seat.get("assists", 0)),
                    "ownGoals": int(seat.get("ownGoals", 0)),
                }
                for seat in self.seats if seat
            ],
        }
        self.game_state["result"] = result
        self.game_state["stage"] = "finished"
        self.game_state["countdown_ms"] = None
        self.game_state["overtime_remaining_ms"] = None
        self._pending_result = result


__all__ = [
    "HAXBALL_MAPS",
    "HaxballGame",
    "VALID_DURATIONS",
    "VALID_MODES",
]

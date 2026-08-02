from __future__ import annotations

from uuid import uuid4

from flask import Blueprint, jsonify

from api_utils import error_response, json_body

snake = Blueprint("snake", __name__)

games: dict[str, dict] = {}
BOARD_WIDTH = 9
BOARD_HEIGHT = 9


@snake.route("/start", methods=["POST"])
def start():
    game_uuid = str(uuid4())
    games[game_uuid] = {"uuid": game_uuid, "maxFoodsEaten": 0, "status": "STARTED"}
    return jsonify({
        "uuid": game_uuid,
        "boardWidth": BOARD_WIDTH,
        "boardHeight": BOARD_HEIGHT,
        "gameStatus": "STARTED",
    }), 201


@snake.route("/finish", methods=["POST"])
def finish():
    data = json_body()
    game_uuid = data.get("uuid")
    foods_eaten = data.get("foodsEaten")
    if foods_eaten is None and data.get("length") is not None:
        foods_eaten = data.get("length")
        try:
            foods_eaten = int(foods_eaten) - 3
        except (TypeError, ValueError):
            foods_eaten = None

    if not isinstance(game_uuid, str) or not game_uuid or foods_eaten is None:
        return error_response("Id gry i liczba zjedzonych pokarmow sa wymagane.", 400)
    if isinstance(foods_eaten, bool):
        return error_response("Liczba zjedzonych pokarmow musi byc liczba calkowita.", 400)
    try:
        foods_eaten = int(foods_eaten)
    except (TypeError, ValueError):
        return error_response("Liczba zjedzonych pokarmow musi byc liczba calkowita.", 400)
    if foods_eaten < 0 or foods_eaten > BOARD_WIDTH * BOARD_HEIGHT:
        return error_response("Wynik jest poza dozwolonym zakresem.", 400)

    game = games.pop(game_uuid, None)
    if game is None:
        return error_response("Gra nie istnieje lub zostala zakonczona.", 404)

    score = foods_eaten * 100
    return jsonify({
        "uuid": game_uuid,
        "foodsEaten": foods_eaten,
        "score": score,
        "gameStatus": "FINISHED",
    }), 200

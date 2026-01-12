from flask import Blueprint, request, jsonify
from uuid import uuid4

snake = Blueprint("snake", __name__)

games = []


def create_game():
    game_uuid = str(uuid4())
    game = {
        "uuid": game_uuid,
        "maxFoodsEaten": 0,
        "status": "CREATED",
    }
    games.append(game)
    return game


def find_game(uuid: str):
    return next((g for g in games if g["uuid"] == uuid), None)


@snake.route("/start", methods=["POST"])
def start():

    game = create_game()

    return jsonify({
        "uuid": game["uuid"],
        "boardWidth": 9,
        "boardHeight": 9,
        "gameStatus": "NOT-STARTED",
    }), 201


@snake.route("/finish", methods=["POST"])
def finish():

    data = request.get_json() or {}
    uuid = data.get("uuid")
    foods_eaten = data.get("foodsEaten")

    if foods_eaten is None and data.get("length") is not None:
        try:
            foods_eaten = max(0, int(data["length"]) - 3)
        except Exception:
            foods_eaten = None

    if uuid is None or foods_eaten is None:
        return jsonify({"error": "uuid and foodsEaten are required"}), 400

    game = find_game(uuid)
    if game is None:
        return jsonify({"error": "Game not found"}), 404

    foods_eaten = int(foods_eaten)

    game["maxFoodsEaten"] = max(game.get("maxFoodsEaten", 0), foods_eaten)
    game["status"] = "FINISHED"

    score = foods_eaten * 100

    return jsonify({
        "uuid": uuid,
        "foodsEaten": foods_eaten,
        "score": score,
        "gameStatus": "FINISHED",
    }), 200

from __future__ import annotations

from uuid import uuid4

from flask import Blueprint, jsonify

from api_utils import error_response, json_body

tictactoe = Blueprint("tictactoe", __name__)
games: dict[str, dict] = {}

WINNING_LINES = (
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6),
)


def _winner(board):
    for a, b, c in WINNING_LINES:
        if board[a] and board[a] == board[b] == board[c]:
            return board[a]
    return None


@tictactoe.route("/create", methods=["POST"])
def create_game():
    player1 = json_body().get("player_id")
    if not isinstance(player1, str) or not player1.strip():
        return error_response("Id gracza jest wymagane.", 400)

    game_id = str(uuid4())
    games[game_id] = {
        "board": [""] * 9,
        "players": [player1.strip()],
        "current_player": player1.strip(),
        "status": "ACTIVE",
        "winner": None,
    }
    return jsonify({"game_id": game_id, "success": True}), 201


@tictactoe.route("/move/<game_id>", methods=["POST"])
def make_move(game_id):
    data = json_body()
    position = data.get("position")
    player_id = data.get("player_id")
    if not isinstance(position, int) or isinstance(position, bool) or not 0 <= position < 9:
        return error_response("Pozycja ruchu jest nieprawidlowa.", 400)
    if not isinstance(player_id, str) or not player_id.strip():
        return error_response("Id gracza jest wymagane.", 400)

    game = games.get(game_id)
    if not game:
        return error_response("Gra nie istnieje.", 404)
    if game["status"] != "ACTIVE":
        return error_response("Gra zostala zakonczona.", 409)

    player_id = player_id.strip()
    if player_id not in game["players"]:
        if len(game["players"]) >= 2:
            return error_response("Gra ma juz dwoch graczy.", 403)
        game["players"].append(player_id)
    if player_id != game["current_player"]:
        return error_response("To nie jest Twoja kolej.", 409)
    if game["board"][position]:
        return error_response("To pole jest juz zajete.", 400)

    symbol = "X" if game["players"][0] == player_id else "O"
    game["board"][position] = symbol
    winner = _winner(game["board"])
    if winner:
        game["status"] = "FINISHED"
        game["winner"] = winner
    elif all(game["board"]):
        game["status"] = "DRAW"
    else:
        game["current_player"] = game["players"][1] if symbol == "X" else game["players"][0]

    response = {"success": True, **game}
    if game["status"] != "ACTIVE":
        games.pop(game_id, None)
    return jsonify(response)


@tictactoe.route("/state/<game_id>", methods=["GET"])
def get_state(game_id):
    game = games.get(game_id)
    if not game:
        return error_response("Gra nie istnieje.", 404)
    return jsonify({"success": True, **game})

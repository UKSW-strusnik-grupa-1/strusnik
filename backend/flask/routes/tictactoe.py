from flask import Blueprint, request, jsonify
from uuid import uuid4

tictactoe = Blueprint("tictactoe", __name__)

games = {}

@tictactoe.route("/create", methods=["POST"])
def create_game():
    data = request.json
    game_id = str(uuid4())
    player1 = data.get("player_id")
    
    games[game_id] = {
        "board": [""] * 9,
        "players": [player1],
        "current_player": player1
    }
    
    return jsonify({"game_id": game_id, "success": True})

@tictactoe.route("/move/<game_id>", methods=["POST"])
def make_move(game_id):
    data = request.json
    position = data.get("position")
    player_id = data.get("player_id")
    
    game = games.get(game_id)
    if not game:
        return jsonify({"success": False, "msg": "Game not found"}), 404
    
    if game["board"][position] != "":
        return jsonify({"success": False, "msg": "Invalid move"}), 400
    
    symbol = "X" if game["players"][0] == player_id else "O"
    game["board"][position] = symbol
    game["current_player"] = game["players"][1] if player_id == game["players"][0] else game["players"][0]
    
    return jsonify({"success": True, "board": game["board"]})

@tictactoe.route("/state/<game_id>", methods=["GET"])
def get_state(game_id):
    game = games.get(game_id)
    if not game:
        return jsonify({"success": False, "msg": "Game not found"}), 404
    
    return jsonify(game)

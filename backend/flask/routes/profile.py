from flask import Blueprint, request, jsonify
from models import db, User, GameStats, SinglePlayerStats
from utils import parse_jwt_token, is_token_valid

profile = Blueprint("profile", __name__)

# MAPOWANIE: Nazwa w bazie danych -> Nazwa oczekiwana przez frontend
# Jeśli Twoja baza ma inne nazwy (np. "SetGame"), to tutaj je tłumaczymy.
DB_TO_FRONTEND_MAP = {
    "Thousand": "tysiac",
    "Tysiac": "tysiac",
    "Battleships": "battleships",
    "Stratego": "stratego",
    "TicTacToe": "tictactoe",
    "Chess": "chess",
    "SetGame": "set",
    "Set": "set",
    "Snake": "snake",
    "Blackjack": "blackjack"
}


def get_current_user():
    token = request.cookies.get("jwtToken")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token or not is_token_valid(token):
        return None

    try:
        payload = parse_jwt_token(token)
        user_id = payload.get("user_id")
        return User.query.get(user_id)
    except:
        return None


@profile.route("/me", methods=["GET"])
def get_my_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    return get_profile_data(user)


@profile.route("/<username>", methods=["GET"])
def get_user_profile(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    return get_profile_data(user)


def get_profile_data(user):
    multiplayer_stats = GameStats.query.filter_by(user_id=user.id).all()
    total_multiplayer_wins = sum(stat.wins for stat in multiplayer_stats)

    multiplayer_by_game = {}
    for stat in multiplayer_stats:
        # Używamy mapy, a jeśli nazwy nie ma w mapie - domyślnie małe litery
        game_key = DB_TO_FRONTEND_MAP.get(stat.game_name, stat.game_name.lower())

        multiplayer_by_game[game_key] = {
            "wins": stat.wins
        }

    singleplayer_stats = SinglePlayerStats.query.filter_by(user_id=user.id).all()
    singleplayer_by_game = {}
    for stat in singleplayer_stats:
        # Tutaj również stosujemy mapowanie dla spójności
        game_key = DB_TO_FRONTEND_MAP.get(stat.game_name, stat.game_name.lower())

        singleplayer_by_game[game_key] = {
            "best_score": stat.best_score,
            "games_played": stat.games_played
        }

    return jsonify({
        "username": user.username,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "multiplayer": {
            "total_wins": total_multiplayer_wins,
            "by_game": multiplayer_by_game
        },
        "singleplayer": {
            "by_game": singleplayer_by_game
        }
    })


@profile.route("/singleplayer/score", methods=["POST"])
def update_singleplayer_score():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    game_name = data.get("game_name")
    score = data.get("score", 0)

    if not game_name:
        return jsonify({"error": "game_name required"}), 400

    stat = SinglePlayerStats.query.filter_by(user_id=user.id, game_name=game_name).first()

    if not stat:
        stat = SinglePlayerStats(user_id=user.id, game_name=game_name, best_score=score, games_played=1)
        db.session.add(stat)
    else:
        stat.games_played += 1
        if score > stat.best_score:
            stat.best_score = score

    db.session.commit()

    return jsonify({
        "message": "Score updated",
        "best_score": stat.best_score,
        "games_played": stat.games_played
    })
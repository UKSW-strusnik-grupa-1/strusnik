from flask import Blueprint, jsonify, request
from models import db, User, GameStats
from sqlalchemy import desc

rankings = Blueprint("rankings", __name__)

@rankings.route("/<game_name>", methods=["GET"])
def get_ranking(game_name):
    try:
        stats = GameStats.query \
            .filter_by(game_name=game_name) \
            .join(User) \
            .order_by(desc(GameStats.wins)) \
            .limit(10) \
            .all()

        return jsonify([stat.to_dict() for stat in stats]), 200
    except Exception as e:
        print(f"Error fetching ranking: {e}")
        return jsonify({"error": str(e)}), 500


@rankings.route("/add_win", methods=["POST"])
def add_win():
    data = request.json
    username = data.get("username")
    game_name = data.get("game_name")

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    stat = GameStats.query.filter_by(user_id=user.id, game_name=game_name).first()

    if not stat:
        stat = GameStats(user_id=user.id, game_name=game_name, wins=1)
        db.session.add(stat)
    else:
        stat.wins += 1

    db.session.commit()
    return jsonify({"message": "Win added", "new_wins": stat.wins}), 200
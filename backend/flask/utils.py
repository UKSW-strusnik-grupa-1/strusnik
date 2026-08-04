from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app


def create_jwt_token(user_id: int, login: str):
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "login": login,
        "iat": now,
        "exp": now + timedelta(seconds=current_app.config["TOKEN_MAX_AGE"]),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def parse_jwt_token(token: str):
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def record_multiplayer_result(game_name, seats, winner_indices=None, draw=False):
    """Persist one completed multiplayer result for every authenticated seat."""
    from models import GameStats, User, db

    winner_indices = set(winner_indices or [])
    for index, seat in enumerate(seats):
        if not seat or not seat.get("userId"):
            continue

        user = User.query.get(seat.get("userId"))
        if not user:
            continue

        stat = GameStats.query.filter_by(user_id=user.id, game_name=game_name).first()
        if not stat:
            stat = GameStats(user_id=user.id, game_name=game_name)
            db.session.add(stat)

        if draw:
            stat.draws = (stat.draws or 0) + 1
            stat.points = (stat.points or 0) + 1
        elif index in winner_indices:
            stat.wins = (stat.wins or 0) + 1
            stat.points = (stat.points or 0) + 3
        else:
            stat.losses = (stat.losses or 0) + 1

    db.session.commit()


def record_haxball_match(
    match_id,
    room_id,
    map_id,
    mode,
    duration_min,
    score,
    winner_team,
    reason,
    participants,
    started_at=None,
):
    """Persist one Haxball match and its aggregate stats exactly once."""
    from sqlalchemy.exc import IntegrityError

    from models import GameStats, HaxballMatch, HaxballMatchParticipant, User, db

    if not match_id:
        return False

    if HaxballMatch.query.filter_by(match_id=str(match_id)).first():
        return False

    score = score if isinstance(score, dict) else {}
    winner_team = winner_team if winner_team in {"red", "blue"} else None
    match = HaxballMatch(
        match_id=str(match_id),
        room_id=str(room_id) if room_id else None,
        map_id=str(map_id or "classic-arena"),
        mode=str(mode or "1v1"),
        duration_min=int(duration_min or 5),
        score_red=int(score.get("red", 0) or 0),
        score_blue=int(score.get("blue", 0) or 0),
        winner_team=winner_team,
        reason=str(reason or "time"),
        started_at=datetime.fromtimestamp(float(started_at)) if started_at else None,
    )
    db.session.add(match)

    for participant in participants or []:
        user_id = participant.get("userId")
        user = None
        try:
            if user_id is not None and not str(user_id).startswith("guest_"):
                user = db.session.get(User, int(user_id))
        except (TypeError, ValueError):
            user = None

        team = participant.get("team") if participant.get("team") in {"red", "blue"} else "red"
        result = "draw" if winner_team is None else ("win" if team == winner_team else "loss")
        goals = int(participant.get("goals", 0) or 0)
        assists = int(participant.get("assists", 0) or 0)
        own_goals = int(participant.get("ownGoals", 0) or 0)

        db.session.add(HaxballMatchParticipant(
            match=match,
            user=user,
            player_name=str(participant.get("name") or "GOSC")[:100],
            team=team,
            goals=goals,
            assists=assists,
            own_goals=own_goals,
            result=result,
        ))

        if not user:
            continue

        stat = GameStats.query.filter_by(user_id=user.id, game_name="Haxball").first()
        if not stat:
            stat = GameStats(user_id=user.id, game_name="Haxball")
            db.session.add(stat)

        if result == "win":
            stat.wins = (stat.wins or 0) + 1
            stat.points = (stat.points or 0) + 3
        elif result == "draw":
            stat.draws = (stat.draws or 0) + 1
            stat.points = (stat.points or 0) + 1
        else:
            stat.losses = (stat.losses or 0) + 1
        stat.goals = (stat.goals or 0) + goals
        stat.assists = (stat.assists or 0) + assists

    try:
        db.session.commit()
        return True
    except IntegrityError:
        db.session.rollback()
        return False
    except Exception:
        db.session.rollback()
        raise


def is_token_valid(token: str):
    if not isinstance(token, str) or not token:
        return False

    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        if "exp" in payload:
            return True

        # Accept tokens issued by the previous version while they are still valid.
        expires = payload.get("expires")
        if not expires:
            return False
        expires_at = datetime.fromisoformat(expires)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) < expires_at
    except (jwt.InvalidTokenError, TypeError, ValueError):
        return False

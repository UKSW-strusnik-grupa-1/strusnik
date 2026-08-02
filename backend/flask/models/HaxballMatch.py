from datetime import datetime

from models import db


class HaxballMatch(db.Model):
    __tablename__ = "haxball_matches"

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    room_id = db.Column(db.String(64), nullable=True)
    map_id = db.Column(db.String(64), nullable=False)
    mode = db.Column(db.String(8), nullable=False)
    duration_min = db.Column(db.Integer, nullable=False)
    score_red = db.Column(db.Integer, nullable=False, default=0)
    score_blue = db.Column(db.Integer, nullable=False, default=0)
    winner_team = db.Column(db.String(8), nullable=True)
    reason = db.Column(db.String(64), nullable=False, default="time")
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, default=datetime.now, nullable=False)

    participants = db.relationship(
        "HaxballMatchParticipant",
        backref="match",
        cascade="all, delete-orphan",
        lazy="joined",
    )

    def to_dict(self):
        return {
            "match_id": self.match_id,
            "room_id": self.room_id,
            "map_id": self.map_id,
            "mode": self.mode,
            "duration_min": self.duration_min,
            "score": {"red": self.score_red, "blue": self.score_blue},
            "winner_team": self.winner_team,
            "reason": self.reason,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "participants": [participant.to_dict() for participant in self.participants],
        }


class HaxballMatchParticipant(db.Model):
    __tablename__ = "haxball_match_participants"

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey("haxball_matches.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    player_name = db.Column(db.String(100), nullable=False)
    team = db.Column(db.String(8), nullable=False)
    goals = db.Column(db.Integer, nullable=False, default=0)
    assists = db.Column(db.Integer, nullable=False, default=0)
    own_goals = db.Column(db.Integer, nullable=False, default=0)
    result = db.Column(db.String(8), nullable=False, default="draw")

    user = db.relationship("User", backref="haxball_match_participations")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "player_name": self.player_name,
            "team": self.team,
            "goals": self.goals,
            "assists": self.assists,
            "own_goals": self.own_goals,
            "result": self.result,
        }

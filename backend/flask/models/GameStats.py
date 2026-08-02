from datetime import datetime

from sqlalchemy import UniqueConstraint

from models import db


class GameStats(db.Model):
    __tablename__ = "game_stats"
    __table_args__ = (UniqueConstraint("user_id", "game_name", name="uq_game_stats_user_game"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    game_name = db.Column(db.String(50), nullable=False)
    wins = db.Column(db.Integer, default=0, nullable=False)
    losses = db.Column(db.Integer, default=0, nullable=False)
    draws = db.Column(db.Integer, default=0, nullable=False)
    points = db.Column(db.Integer, default=0, nullable=False)
    goals = db.Column(db.Integer, default=0, nullable=False)
    assists = db.Column(db.Integer, default=0, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    user = db.relationship("User", backref="stats")

    def to_dict(self):
        return {
            "user_id": self.user.id,
            "username": self.user.username,
            "avatar_url": self.user.avatar_url,
            "game_name": self.game_name,
            "wins": self.wins,
            "losses": self.losses,
            "draws": self.draws,
            "points": self.points or 0,
            "score": self.points or 0,
            "goals": self.goals or 0,
            "assists": self.assists or 0,
        }

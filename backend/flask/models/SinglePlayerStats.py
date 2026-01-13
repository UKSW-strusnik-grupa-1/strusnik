from models import db
from datetime import datetime

class SinglePlayerStats(db.Model):
    __tablename__ = "singleplayer_stats"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_name = db.Column(db.String(50), nullable=False)
    best_score = db.Column(db.Integer, default=0)
    games_played = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    user = db.relationship("User", backref="singleplayer_stats")

    def to_dict(self):
        return {
            "game_name": self.game_name,
            "best_score": self.best_score,
            "games_played": self.games_played
        }

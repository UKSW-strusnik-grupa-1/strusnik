from datetime import datetime

from models import db


class FriendRequest(db.Model):
    __tablename__ = "friend_requests"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    created_at = db.Column(db.DateTime, default=datetime.now, nullable=False)
    responded_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self, user):
        return {
            "id": self.id,
            "user_id": user.id,
            "username": user.username,
            "has_avatar": bool(user.avatar_url),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

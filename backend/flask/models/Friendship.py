from datetime import datetime

from sqlalchemy import CheckConstraint, UniqueConstraint

from models import db


class Friendship(db.Model):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("user_one_id", "user_two_id", name="uq_friendship_pair"),
        CheckConstraint("user_one_id < user_two_id", name="ck_friendship_order"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_one_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    user_two_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.now, nullable=False)

    @classmethod
    def pair(cls, first_id, second_id):
        first_id, second_id = sorted((int(first_id), int(second_id)))
        return first_id, second_id

    def other_user_id(self, user_id):
        return self.user_two_id if self.user_one_id == user_id else self.user_one_id

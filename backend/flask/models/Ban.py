from models import db
from datetime import datetime

class Ban(db.Model):
    __tablename__ = "bans"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    banned_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.String(500), nullable=True)
    banned_at = db.Column(db.DateTime, default=datetime.now)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    unbanned_at = db.Column(db.DateTime, nullable=True)
    unbanned_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    user = db.relationship('User', foreign_keys=[user_id], backref='bans_received')
    banned_by = db.relationship('User', foreign_keys=[banned_by_id])
    unbanned_by = db.relationship('User', foreign_keys=[unbanned_by_id])
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.username if self.user else None,
            "banned_by_id": self.banned_by_id,
            "banned_by_name": self.banned_by.username if self.banned_by else None,
            "reason": self.reason,
            "banned_at": self.banned_at.isoformat() if self.banned_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_active": self.is_active,
            "unbanned_at": self.unbanned_at.isoformat() if self.unbanned_at else None,
            "unbanned_by_id": self.unbanned_by_id,
            "unbanned_by_name": self.unbanned_by.username if self.unbanned_by else None,
        }

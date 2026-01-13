from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.User import User
from models.GameStats import GameStats
from models.Ban import Ban
from models.AdminLog import AdminLog

__all__ = ["db", "User", "GameStats", "Ban", "AdminLog"]
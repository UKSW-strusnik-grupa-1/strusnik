from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.User import User
from models.GameStats import GameStats

__all__ = ["db", "User", "GameStats"]
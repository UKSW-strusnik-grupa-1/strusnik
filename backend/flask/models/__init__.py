from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.User import User

__all__ = ["db", "User"]
import jwt

from flask import current_app
from datetime import datetime, timedelta, timezone

def create_jwt_token(user_id: int, login: str):
    payload = {
        "user_id": user_id,
        "login": login,
        "expires": (datetime.now(timezone.utc) + timedelta(seconds=current_app.config["TOKEN_MAX_AGE"])).isoformat(),
        "issued_at": datetime.now(timezone.utc).isoformat()
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

def parse_jwt_token(token: str):
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])

def is_token_valid(token: str):
    if not token: return False
    
    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        
        if not payload:
            return False
        
        return datetime.now(timezone.utc) < datetime.fromisoformat(payload["expires"])
    except (jwt.InvalidSignatureError, jwt.InvalidTokenError, jwt.DecodeError, Exception):
        return False
    
    
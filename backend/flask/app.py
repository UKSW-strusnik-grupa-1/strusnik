from flask import Flask, jsonify, session, request
from flask_cors import CORS
from config import Config

from routes.auth import authentication
from routes.blackjack import blackjack
from routes.snake import snake
from routes.rankings import rankings
from routes.tictactoe import tictactoe
from models import db

from sockets.socket_manager import socket
import time

app = Flask(__name__)
app.config.from_object(Config)

CORS(
    app, 
    origins=['http://localhost:3000'], 
    supports_credentials=True
)

socket.init_app(app)
db.init_app(app)

@app.post("/api/auth/validate")
def auth_validate():

    user_id = session.get("user_id") or session.get("userId") or session.get("id")
    username = session.get("username") or session.get("nickname") or session.get("name")
    if user_id or username:
        return jsonify({"valid": True, "user_id": user_id, "username": username, "via": "session"}), 200

    auth_header = request.headers.get("Authorization") or ""
    bearer = ""
    if auth_header.lower().startswith("bearer "):
        bearer = auth_header.split(" ", 1)[1].strip()

    token_cookie = (
        request.cookies.get("token")
        or request.cookies.get("access_token")
        or request.cookies.get("accessToken")
        or request.cookies.get("jwt")
        or request.cookies.get("auth")
        or request.cookies.get("authToken")
    )

    body = request.get_json(silent=True) or {}
    token_body = (
        body.get("token")
        or body.get("access_token")
        or body.get("accessToken")
        or body.get("jwt")
        or body.get("authToken")
    )

    token = bearer or token_cookie or token_body
    if token:
        return jsonify({"valid": True, "via": "token"}), 200

    return jsonify({"valid": False}), 401


app.register_blueprint(authentication, url_prefix="/api/auth")
app.register_blueprint(blackjack, url_prefix="/api/games/blackjack")
app.register_blueprint(rankings, url_prefix="/api/rankings")
app.register_blueprint(snake, url_prefix="/api/snake")
app.register_blueprint(tictactoe, url_prefix="/api/games/tictactoe")

with app.app_context():
    for i in range(5):
        try:
            db.create_all()
            break
        except Exception as e:
            time.sleep(2)

if __name__ == '__main__':
    socket.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
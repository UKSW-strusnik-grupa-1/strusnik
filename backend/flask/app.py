from flask import Flask
from flask_cors import CORS
from config import Config

from routes.auth import authentication
from routes.blackjack import blackjack

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

app.register_blueprint(authentication, url_prefix="/api/auth")
app.register_blueprint(blackjack, url_prefix="/api/games/blackjack")

with app.app_context():
    for i in range(5):
        try:
            db.create_all()
            break
        except Exception as e:
            time.sleep(2)

if __name__ == '__main__':
    socket.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
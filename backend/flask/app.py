from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

from routes.auth import authentication
from routes.blackjack import blackjack

from models import db

import time

app = Flask(__name__)
app.config.from_object(Config)
CORS(
    app, 
    origins=['http://localhost:3000'],
    supports_credentials=True
)

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
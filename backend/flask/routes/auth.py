from flask import Blueprint, current_app, request, Response, jsonify, make_response
from models import db, User, Ban
from werkzeug.security import generate_password_hash, check_password_hash
from utils import create_jwt_token, parse_jwt_token, is_token_valid
from datetime import datetime

authentication = Blueprint("authentication", __name__)

@authentication.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password required."}), 400
    
    try:
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "User already exists."}), 400
        
        hashed = generate_password_hash(password)
        user = User(username=username, password=hashed)
        db.session.add(user)
        db.session.commit()
        
        token = create_jwt_token(user.id, username)
        return jsonify({"token": token, "user": user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@authentication.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Username and password required."}), 400
        
    try:
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({"error": "User does not exists."}), 401
        
        if not check_password_hash(user.password, password):
            return jsonify({"error": "Invalid credentials."}), 401
        
        if user.is_banned:
            active_ban = Ban.query.filter_by(user_id=user.id, is_active=True).first()
            if active_ban:
                if active_ban.expires_at and active_ban.expires_at < datetime.now():
                    active_ban.is_active = False
                    user.is_banned = False
                    db.session.commit()
                else:
                    ban_msg = f"Konto zbanowane. Powód: {active_ban.reason or 'Brak podanego powodu'}."
                    if active_ban.expires_at:
                        ban_msg += f" Wygasa: {active_ban.expires_at.strftime('%Y-%m-%d %H:%M')}"
                    else:
                        ban_msg += " Ban permanentny."
                    return jsonify({"error": ban_msg}), 403
        
        user.last_login = datetime.now()
        db.session.commit()
        
        token = create_jwt_token(user.id, username)
        
        response = make_response(
            jsonify({
                "message": "Login successful.",
                "is_admin": user.is_admin
            }), 200
        )
        
        response.set_cookie(
            "jwtToken",
            value=token,
            max_age=current_app.config["TOKEN_MAX_AGE"],
            httponly=True,
            secure=False,
            samesite="Lax"
        )
        
        return response
        
    except Exception as e:
        pass


@authentication.route("/token", methods=["GET"])
def parse_token_claims():
    token = None

    if request.is_json:
        data = request.get_json(silent=True)
        if data:
            token = data.get("token")

    if not token:
        token = request.cookies.get("jwtToken")

    if not token:
        return jsonify({"error": "Token required (not found in json or cookies)."}), 400

    try:
        parsed_token = parse_jwt_token(token)
        return jsonify(parsed_token), 200
    except Exception as e:
        print(f"DEBUG: Exception: {e}", flush=True)
        return jsonify({"error": str(e)}), 400

@authentication.route("/validate", methods=["POST"])
def validate_token():
    token = None

    if request.is_json:
        data = request.json
        if data:
            token = data.get("token")

    if not token:
        token = request.cookies.get("jwtToken")

    if not token:
        return jsonify({"error": "Token required", "valid": False}), 400

    try:
        valid = is_token_valid(token)
        return jsonify({"valid": valid}), 200 if valid else 400
    except Exception as e:
        return jsonify({"error": str(e), "valid": False}), 400


@authentication.route("/logout", methods=["POST"])
def logout():
    response = make_response(jsonify({"message": "Logged out successfully."}), 200)
    response.delete_cookie("jwtToken")
    return response

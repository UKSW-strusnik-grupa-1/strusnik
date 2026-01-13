from flask import Blueprint, request, jsonify
from functools import wraps
from datetime import datetime, timedelta
from models import db, User, Ban, AdminLog
from utils import parse_jwt_token, is_token_valid

admin = Blueprint("admin", __name__)

def get_current_user():
    token = request.cookies.get("jwtToken")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
    
    if not token or not is_token_valid(token):
        return None
    
    try:
        payload = parse_jwt_token(token)
        user_id = payload.get("user_id")
        return User.query.get(user_id)
    except:
        return None

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        if not user.is_admin:
            return jsonify({"error": "Admin privileges required"}), 403
        return f(*args, **kwargs)
    return decorated_function

def log_admin_action(admin_id, action, target_user_id=None, details=None):
    try:
        log = AdminLog(
            admin_id=admin_id,
            action=action,
            target_user_id=target_user_id,
            details=details,
            ip_address=request.remote_addr
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Failed to log admin action: {e}")

@admin.route("/users", methods=["GET"])
@admin_required
def get_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search", "")
    
    query = User.query
    if search:
        query = query.filter(User.username.ilike(f"%{search}%"))
    
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "users": [u.to_dict() for u in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    })

@admin.route("/users/<int:user_id>", methods=["GET"])
@admin_required
def get_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    bans = Ban.query.filter_by(user_id=user_id).order_by(Ban.banned_at.desc()).all()
    
    return jsonify({
        "user": user.to_dict(),
        "ban_history": [b.to_dict() for b in bans]
    })

@admin.route("/ban", methods=["POST"])
@admin_required
def ban_user():
    current_user = get_current_user()
    data = request.json
    
    user_id = data.get("user_id")
    reason = data.get("reason", "")
    duration_hours = data.get("duration_hours")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    if user.is_admin:
        return jsonify({"error": "Cannot ban admin users"}), 400
    
    Ban.query.filter_by(user_id=user_id, is_active=True).update({"is_active": False})
    
    expires_at = None
    if duration_hours:
        expires_at = datetime.now() + timedelta(hours=duration_hours)
    
    ban = Ban(
        user_id=user_id,
        banned_by_id=current_user.id,
        reason=reason,
        expires_at=expires_at
    )
    
    user.is_banned = True
    
    db.session.add(ban)
    db.session.commit()
    
    log_admin_action(
        current_user.id, 
        "ban", 
        user_id, 
        f"Reason: {reason}. Duration: {'permanent' if not duration_hours else f'{duration_hours}h'}"
    )
    
    return jsonify({
        "message": f"User {user.username} has been banned",
        "ban": ban.to_dict()
    })

@admin.route("/unban", methods=["POST"])
@admin_required
def unban_user():
    current_user = get_current_user()
    data = request.json
    
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    active_bans = Ban.query.filter_by(user_id=user_id, is_active=True).all()
    for ban in active_bans:
        ban.is_active = False
        ban.unbanned_at = datetime.now()
        ban.unbanned_by_id = current_user.id
    
    user.is_banned = False
    db.session.commit()
    
    log_admin_action(current_user.id, "unban", user_id, "User unbanned")
    
    return jsonify({"message": f"User {user.username} has been unbanned"})

@admin.route("/kick", methods=["POST"])
@admin_required
def kick_user():
    current_user = get_current_user()
    data = request.json
    
    user_id = data.get("user_id")
    room_id = data.get("room_id")
    reason = data.get("reason", "Kicked by admin")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    from sockets.socket_manager import socket
    
    socket.emit('admin_kick', {
        'user_id': str(user_id),
        'reason': reason,
        'room_id': room_id
    }, broadcast=True)
    
    log_admin_action(
        current_user.id, 
        "kick", 
        user_id, 
        f"Reason: {reason}. Room: {room_id or 'all'}"
    )
    
    return jsonify({"message": f"User {user.username} has been kicked"})

@admin.route("/bans", methods=["GET"])
@admin_required
def get_bans():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    active_only = request.args.get("active_only", "false").lower() == "true"
    
    query = Ban.query
    if active_only:
        query = query.filter_by(is_active=True)
    
    pagination = query.order_by(Ban.banned_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "bans": [b.to_dict() for b in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    })

@admin.route("/logs", methods=["GET"])
@admin_required
def get_logs():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    action_filter = request.args.get("action")
    
    query = AdminLog.query
    if action_filter:
        query = query.filter_by(action=action_filter)
    
    pagination = query.order_by(AdminLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "logs": [l.to_dict() for l in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    })

@admin.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    total_users = User.query.count()
    banned_users = User.query.filter_by(is_banned=True).count()
    active_bans = Ban.query.filter_by(is_active=True).count()
    
    yesterday = datetime.now() - timedelta(hours=24)
    recent_bans = Ban.query.filter(Ban.banned_at >= yesterday).count()
    recent_logs = AdminLog.query.filter(AdminLog.created_at >= yesterday).count()
    new_users = User.query.filter(User.created_at >= yesterday).count()
    
    return jsonify({
        "total_users": total_users,
        "banned_users": banned_users,
        "active_bans": active_bans,
        "recent_bans_24h": recent_bans,
        "recent_actions_24h": recent_logs,
        "new_users_24h": new_users
    })

@admin.route("/make-admin", methods=["POST"])
@admin_required
def make_admin():
    current_user = get_current_user()
    data = request.json
    
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.is_admin = True
    db.session.commit()
    
    log_admin_action(current_user.id, "make_admin", user_id, "Granted admin privileges")
    
    return jsonify({"message": f"User {user.username} is now an admin"})

@admin.route("/revoke-admin", methods=["POST"])
@admin_required
def revoke_admin():
    current_user = get_current_user()
    data = request.json
    
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    if user_id == current_user.id:
        return jsonify({"error": "Cannot revoke your own admin privileges"}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.is_admin = False
    db.session.commit()
    
    log_admin_action(current_user.id, "revoke_admin", user_id, "Revoked admin privileges")
    
    return jsonify({"message": f"Admin privileges revoked from {user.username}"})

@admin.route("/check", methods=["GET"])
def check_admin():
    user = get_current_user()
    if not user:
        return jsonify({"is_admin": False}), 200
    return jsonify({"is_admin": user.is_admin, "user_id": user.id, "username": user.username})

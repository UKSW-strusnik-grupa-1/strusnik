from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import and_, func, or_

from api_utils import error_response, json_body, log_exception
from models import FriendRequest, Friendship, User, db
from routes.profile import get_current_user

friends = Blueprint("friends", __name__)

FRIEND_LIMIT = 500
PENDING_LIMIT = 100
HOURLY_REQUEST_LIMIT = 20
REJECT_RETRY_HOURS = 24
PENDING_STATUS = "pending"


def _user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "has_avatar": bool(user.avatar_url),
    }


def _friendship_for(first_id, second_id):
    user_one_id, user_two_id = Friendship.pair(first_id, second_id)
    return Friendship.query.filter_by(
        user_one_id=user_one_id,
        user_two_id=user_two_id,
    ).first()


def _pending_requests_for(user_id):
    return FriendRequest.query.filter(
        FriendRequest.status == PENDING_STATUS,
        or_(FriendRequest.sender_id == user_id, FriendRequest.recipient_id == user_id),
    ).all()


def _emit_to_user(user_id, event, payload):
    try:
        from sockets.socket_manager import active_sessions, socket

        session = active_sessions.get(str(user_id))
        if session and session.get("connected") and session.get("sid"):
            socket.emit(event, payload, to=session["sid"])
    except Exception:
        # Database operations must not fail when the optional live notification does.
        return


def _emit_refresh(user_ids):
    for user_id in set(user_ids):
        pending_count = FriendRequest.query.filter_by(
            recipient_id=user_id,
            status=PENDING_STATUS,
        ).count()
        _emit_to_user(user_id, "friends_updated", {"pendingCount": pending_count})


def _pair_requests(first_id, second_id):
    return FriendRequest.query.filter(
        or_(
            and_(FriendRequest.sender_id == first_id, FriendRequest.recipient_id == second_id),
            and_(FriendRequest.sender_id == second_id, FriendRequest.recipient_id == first_id),
        )
    )


def _parse_user_id(value):
    try:
        user_id = int(value)
    except (TypeError, ValueError):
        return None
    return user_id if user_id > 0 else None


def _find_user(user_id):
    return db.session.get(User, user_id) if user_id else None


@friends.route("", methods=["GET"])
def get_friends():
    user = get_current_user()
    if not user:
        return error_response("Brak autoryzacji.", 401)

    relationships = Friendship.query.filter(
        or_(Friendship.user_one_id == user.id, Friendship.user_two_id == user.id)
    ).order_by(Friendship.created_at.asc()).all()
    friend_ids = [relationship.other_user_id(user.id) for relationship in relationships]
    friend_users = User.query.filter(User.id.in_(friend_ids)).all() if friend_ids else []
    friend_by_id = {friend.id: friend for friend in friend_users}

    incoming = FriendRequest.query.filter_by(
        recipient_id=user.id,
        status=PENDING_STATUS,
    ).order_by(FriendRequest.created_at.desc()).all()
    outgoing = FriendRequest.query.filter_by(
        sender_id=user.id,
        status=PENDING_STATUS,
    ).order_by(FriendRequest.created_at.desc()).all()

    incoming_users = {
        item.id: item
        for item in User.query.filter(User.id.in_([item.sender_id for item in incoming])).all()
    } if incoming else {}
    outgoing_users = {
        item.id: item
        for item in User.query.filter(User.id.in_([item.recipient_id for item in outgoing])).all()
    } if outgoing else {}

    return jsonify({
        "friends": [
            _user_payload(friend_by_id[friend_id])
            for friend_id in friend_ids
            if friend_id in friend_by_id
        ],
        "incoming": [
            item.to_dict(incoming_users[item.sender_id])
            for item in incoming
            if item.sender_id in incoming_users
        ],
        "outgoing": [
            item.to_dict(outgoing_users[item.recipient_id])
            for item in outgoing
            if item.recipient_id in outgoing_users
        ],
        "pending_count": len(incoming),
    })


@friends.route("/search", methods=["GET"])
def search_users():
    user = get_current_user()
    if not user:
        return error_response("Brak autoryzacji.", 401)

    query = request.args.get("q", "").strip()
    if len(query) < 3:
        return jsonify({"results": []})

    relationships = Friendship.query.filter(
        or_(Friendship.user_one_id == user.id, Friendship.user_two_id == user.id)
    ).all()
    excluded_ids = {relationship.other_user_id(user.id) for relationship in relationships}
    for item in _pending_requests_for(user.id):
        excluded_ids.add(item.sender_id if item.sender_id != user.id else item.recipient_id)
    excluded_ids.add(user.id)

    pattern = f"%{query.lower()}%"
    candidates = User.query.filter(
        func.lower(User.username).like(pattern),
        ~User.id.in_(excluded_ids),
    ).order_by(User.username.asc()).limit(10).all()
    return jsonify({"results": [_user_payload(candidate) for candidate in candidates]})


@friends.route("/requests", methods=["POST"])
def create_friend_request():
    user = get_current_user()
    if not user:
        return error_response("Brak autoryzacji.", 401)

    target_id = _parse_user_id(json_body().get("recipient_id"))
    target = _find_user(target_id)
    if not target:
        return error_response("Nie znaleziono uzytkownika.", 404)
    if target.id == user.id:
        return error_response("Nie mozesz dodac siebie do znajomych.", 400)
    if _friendship_for(user.id, target.id):
        return error_response("To juz jest Twoj znajomy.", 409)

    user_friend_count = Friendship.query.filter(
        or_(Friendship.user_one_id == user.id, Friendship.user_two_id == user.id)
    ).count()
    target_friend_count = Friendship.query.filter(
        or_(Friendship.user_one_id == target.id, Friendship.user_two_id == target.id)
    ).count()
    if user_friend_count >= FRIEND_LIMIT or target_friend_count >= FRIEND_LIMIT:
        return error_response("Osiagnieto limit znajomych.", 429)

    if FriendRequest.query.filter(
        FriendRequest.status == PENDING_STATUS,
        or_(
            and_(FriendRequest.sender_id == user.id, FriendRequest.recipient_id == target.id),
            and_(FriendRequest.sender_id == target.id, FriendRequest.recipient_id == user.id),
        ),
    ).first():
        return error_response("Zaproszenie juz oczekuje na odpowiedz.", 409)

    now = datetime.now()
    recent_rejection = FriendRequest.query.filter_by(
        sender_id=user.id,
        recipient_id=target.id,
        status="rejected",
    ).filter(FriendRequest.responded_at >= now - timedelta(hours=REJECT_RETRY_HOURS)).first()
    if recent_rejection:
        return error_response("Ponowne zaproszenie bedzie mozliwe za 24 godziny.", 429)

    sent_last_hour = FriendRequest.query.filter(
        FriendRequest.sender_id == user.id,
        FriendRequest.created_at >= now - timedelta(hours=1),
    ).count()
    if sent_last_hour >= HOURLY_REQUEST_LIMIT:
        return error_response("Osiagnieto godzinny limit zaproszen.", 429)

    pending_sent = FriendRequest.query.filter_by(
        sender_id=user.id,
        status=PENDING_STATUS,
    ).count()
    pending_received = FriendRequest.query.filter_by(
        recipient_id=target.id,
        status=PENDING_STATUS,
    ).count()
    if pending_sent >= PENDING_LIMIT or pending_received >= PENDING_LIMIT:
        return error_response("Osiagnieto limit oczekujacych zaproszen.", 429)

    try:
        item = FriendRequest(sender_id=user.id, recipient_id=target.id)
        db.session.add(item)
        db.session.commit()
    except Exception as error:
        db.session.rollback()
        log_exception("Unable to create friend request", error)
        return error_response("Nie udalo sie wyslac zaproszenia.", 500)

    _emit_to_user(target.id, "friend_request_received", {
        "request": item.to_dict(user),
        "from": user.username,
    })
    _emit_refresh([user.id, target.id])
    return jsonify({"request": item.to_dict(target)}), 201


@friends.route("/requests/<int:request_id>/<action>", methods=["POST"])
def update_friend_request(request_id, action):
    user = get_current_user()
    if not user:
        return error_response("Brak autoryzacji.", 401)

    item = db.session.get(FriendRequest, request_id)
    if not item or item.status != PENDING_STATUS:
        return error_response("Zaproszenie nie jest juz aktywne.", 404)

    if action == "accept":
        if item.recipient_id != user.id:
            return error_response("Nie mozesz zaakceptowac tego zaproszenia.", 403)

        sender = _find_user(item.sender_id)
        if not sender:
            return error_response("Nie znaleziono uzytkownika.", 404)

        now = datetime.now()
        item.status = "accepted"
        item.responded_at = now
        opposite = FriendRequest.query.filter(
            FriendRequest.id != item.id,
            FriendRequest.status == PENDING_STATUS,
            or_(
                and_(FriendRequest.sender_id == item.sender_id, FriendRequest.recipient_id == item.recipient_id),
                and_(FriendRequest.sender_id == item.recipient_id, FriendRequest.recipient_id == item.sender_id),
            ),
        ).all()
        for other in opposite:
            other.status = "cancelled"
            other.responded_at = now

        friendship = _friendship_for(item.sender_id, item.recipient_id)
        if not friendship:
            first_id, second_id = Friendship.pair(item.sender_id, item.recipient_id)
            friendship = Friendship(user_one_id=first_id, user_two_id=second_id)
            db.session.add(friendship)

        try:
            db.session.commit()
        except Exception as error:
            db.session.rollback()
            log_exception("Unable to accept friend request", error)
            return error_response("Nie udalo sie zaakceptowac zaproszenia.", 500)

        friend = _user_payload(sender)
        _emit_to_user(item.sender_id, "friend_request_accepted", {
            "friend": _user_payload(user),
            "from": user.username,
        })
        _emit_refresh([item.sender_id, item.recipient_id])
        return jsonify({"friend": friend})

    if action == "reject":
        if item.recipient_id != user.id:
            return error_response("Nie mozesz odrzucic tego zaproszenia.", 403)
        item.status = "rejected"
        item.responded_at = datetime.now()
        try:
            db.session.commit()
        except Exception as error:
            db.session.rollback()
            log_exception("Unable to reject friend request", error)
            return error_response("Nie udalo sie odrzucic zaproszenia.", 500)
        _emit_refresh([item.sender_id, item.recipient_id])
        return jsonify({"success": True})

    if action == "cancel":
        if item.sender_id != user.id:
            return error_response("Nie mozesz anulowac tego zaproszenia.", 403)
        item.status = "cancelled"
        item.responded_at = datetime.now()
        try:
            db.session.commit()
        except Exception as error:
            db.session.rollback()
            log_exception("Unable to cancel friend request", error)
            return error_response("Nie udalo sie anulowac zaproszenia.", 500)
        _emit_refresh([item.sender_id, item.recipient_id])
        return jsonify({"success": True})

    return error_response("Nieznana operacja na zaproszeniu.", 400)


@friends.route("/<int:friend_id>", methods=["DELETE"])
def remove_friend(friend_id):
    user = get_current_user()
    if not user:
        return error_response("Brak autoryzacji.", 401)
    if friend_id == user.id:
        return error_response("Nieprawidlowa relacja znajomosci.", 400)

    friendship = _friendship_for(user.id, friend_id)
    if not friendship:
        return error_response("Nie znaleziono znajomego.", 404)

    try:
        db.session.delete(friendship)
        for item in _pair_requests(user.id, friend_id).filter(FriendRequest.status == PENDING_STATUS).all():
            item.status = "cancelled"
            item.responded_at = datetime.now()
        db.session.commit()
    except Exception as error:
        db.session.rollback()
        log_exception("Unable to remove friendship", error)
        return error_response("Nie udalo sie usunac znajomego.", 500)

    _emit_refresh([user.id, friend_id])
    return jsonify({"success": True})

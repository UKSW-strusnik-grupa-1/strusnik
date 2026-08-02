import eventlet
import time
import copy
import unicodedata
from datetime import datetime

from flask import Flask, current_app, request
from flask_socketio import SocketIO, emit, join_room, leave_room as socketio_leave_room

from games.handling_multiplayer import LobbyManager, GameType
from games.thousand import Thousand
from games.stratego import Stratego
from games.chess import chess
from games.battleships import Battleships
from games.setgame import SetGame
from games.haxball import HAXBALL_MAPS, HaxballGame, VALID_DURATIONS, VALID_MODES, normalize_duration, normalize_map_id, normalize_mode

try:
    from sockets.events_thousand import handle_thousand_move, get_thousand_state_for_player
    from sockets.events_stratego import handle_stratego_move, broadcast_stratego_state
except ImportError:
    from events_thousand import handle_thousand_move, get_thousand_state_for_player
    from events_stratego import handle_stratego_move, broadcast_stratego_state

socket = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

manager = LobbyManager()
manager.register_game("Tysiac", GameType.Multiplayer, Thousand)
manager.register_game("Stratego", GameType.Multiplayer, Stratego)
manager.register_game("Chess", GameType.Multiplayer, chess)
manager.register_game("Battleships", GameType.Multiplayer, Battleships)
manager.register_game("Set", GameType.Multiplayer, SetGame)
manager.register_game("Haxball", GameType.Multiplayer, HaxballGame)

active_sessions = {}
disconnect_timers = {}
room_deletion_timers = {}
guest_room_creations = {}
guest_chat_by_ip = {}
haxball_loops = {}
GUEST_TOKEN_PREFIX = "guest_"
GUEST_NAME_MIN_LENGTH = 3
GUEST_NAME_MAX_LENGTH = 20
GUEST_CHAT_WINDOW_SECONDS = 5
GUEST_CHAT_MAX_MESSAGES = 3
BLOCKED_GUEST_NAME_PARTS = ("kurwa", "chuj", "jebac", "jeba", "pizda")
TERMINAL_STAGES = {"game_over", "finished", "ended", "checkmate", "draw", "stalemate"}
TERMINAL_ROOM_GRACE_SECONDS = 30


def socket_payload(data):
    return data if isinstance(data, dict) else {}


def is_guest_token(token):
    return isinstance(token, str) and token.startswith(GUEST_TOKEN_PREFIX)


def get_active_guest_ban(guest_token):
    try:
        from models import GuestBan, db

        ban = GuestBan.query.filter_by(guest_token=guest_token, is_active=True).first()
        if ban and ban.expires_at and ban.expires_at <= datetime.now():
            ban.is_active = False
            ban.unbanned_at = datetime.now()
            db.session.commit()
            return None
        return ban
    except Exception as error:
        try:
            from flask import current_app
            current_app.logger.exception("Unable to check guest ban", exc_info=error)
        except Exception:
            pass
        return None


def is_valid_guest_name(name):
    if not isinstance(name, str):
        return False
    cleaned = name.strip()
    if not GUEST_NAME_MIN_LENGTH <= len(cleaned) <= GUEST_NAME_MAX_LENGTH:
        return False
    if any(ord(character) < 32 for character in cleaned):
        return False
    lowered = cleaned.lower()
    folded = unicodedata.normalize("NFKD", lowered).encode("ascii", "ignore").decode("ascii")
    return (
        lowered not in {"admin", "administrator", "system", "moderator", "host"}
        and not lowered.startswith("admin[")
        and not any(part in folded for part in BLOCKED_GUEST_NAME_PARTS)
    )


def guest_rate_key():
    return request.remote_addr or "unknown"


def guest_can_create_room(user_token):
    now = time.time()
    keys = [guest_rate_key(), f"{guest_rate_key()}:{user_token}"]
    recent_by_key = {}
    for key in keys:
        recent = [stamp for stamp in guest_room_creations.get(key, []) if now - stamp < 60]
        recent_by_key[key] = recent
        if len(recent) >= 3:
            guest_room_creations[key] = recent
            return False
    for key, recent in recent_by_key.items():
        recent.append(now)
        guest_room_creations[key] = recent
    return True


def unique_room_player_name(game, name):
    base_name = str(name or "GOSC").strip() or "GOSC"
    existing_names = {
        str(seat.get("name", "")).lower()
        for seat in getattr(game, "seats", []) or []
        if seat
    }
    if base_name.lower() not in existing_names:
        return base_name
    suffix = 2
    while f"{base_name} #{suffix}".lower() in existing_names:
        suffix += 1
    return f"{base_name} #{suffix}"


def can_send_chat(session_data):
    now = time.time()
    timestamps = [
        stamp for stamp in session_data.get("chat_timestamps", [])
        if now - stamp < GUEST_CHAT_WINDOW_SECONDS
    ]
    max_messages = GUEST_CHAT_MAX_MESSAGES if session_data.get("is_guest") else 8
    if len(timestamps) >= max_messages:
        session_data["chat_timestamps"] = timestamps
        return False

    if session_data.get("is_guest"):
        ip_key = session_data.get("ip", "unknown")
        ip_timestamps = [
            stamp for stamp in guest_chat_by_ip.get(ip_key, [])
            if now - stamp < GUEST_CHAT_WINDOW_SECONDS
        ]
        if len(ip_timestamps) >= GUEST_CHAT_MAX_MESSAGES:
            guest_chat_by_ip[ip_key] = ip_timestamps
            session_data["chat_timestamps"] = timestamps
            return False
        ip_timestamps.append(now)
        guest_chat_by_ip[ip_key] = ip_timestamps

    timestamps.append(now)
    session_data["chat_timestamps"] = timestamps
    return True


def game_stage(game):
    return (getattr(game, "game_state", {}) or {}).get("stage")


def is_terminal_game(game):
    if getattr(game, "keep_room_after_finish", False) and game_stage(game) == "finished":
        return False
    return game_stage(game) in TERMINAL_STAGES or bool((getattr(game, "game_state", {}) or {}).get("ended"))


def schedule_room_deletion(room_id, delay=TERMINAL_ROOM_GRACE_SECONDS):
    existing = room_deletion_timers.get(room_id)
    if existing:
        existing.cancel()
    room_deletion_timers[room_id] = eventlet.spawn_after(delay, delete_room, room_id)


def start_haxball_loop(room):
    if not room or not isinstance(room.game_instance, HaxballGame):
        return
    existing = haxball_loops.get(room.uuid)
    if existing and not existing.dead:
        return
    app = current_app._get_current_object()
    haxball_loops[room.uuid] = eventlet.spawn(_run_haxball_loop, room.uuid, app)


def _run_haxball_loop(room_id, app):
    from utils import record_haxball_match

    with app.app_context():
        last_tick = time.monotonic()
        snapshot_counter = 0
        try:
            while True:
                _lobby, room = find_room(room_id)
                if not room or not isinstance(room.game_instance, HaxballGame):
                    return

                now = time.monotonic()
                dt = min(max(now - last_tick, 0.0), 0.1)
                last_tick = now
                result = room.game_instance.tick(dt)
                snapshot_counter += 1
                if snapshot_counter >= 2 or result.get("finished") or result.get("immediate_snapshot"):
                    emit_game_state_to_room(room)
                    snapshot_counter = 0

                completed = room.game_instance.consume_match_result()
                if completed:
                    record_haxball_match(
                        match_id=completed.get("match_id"),
                        room_id=room.uuid,
                        map_id=completed.get("map_id"),
                        mode=completed.get("mode"),
                        duration_min=completed.get("duration_min"),
                        score=completed.get("score"),
                        winner_team=completed.get("winner_team"),
                        reason=completed.get("reason"),
                        participants=completed.get("players"),
                        started_at=room.game_instance.game_state.get("started_at"),
                    )
                    emit_room_presence(room)
                    broadcast_player_list()

                eventlet.sleep(1 / 60)
        except Exception as error:
            app.logger.exception("Haxball simulation stopped for room %s", room_id, exc_info=error)
        finally:
            haxball_loops.pop(room_id, None)


def get_player_room(session_data):
    room_id = session_data.get('room_id')
    if not room_id:
        return None

    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            return lobby.rooms[room_id]

    return None


def get_player_status(session_data):
    found_room = get_player_room(session_data)

    if found_room:
        if found_room.game_instance and game_stage(found_room.game_instance) != 'waiting_for_players':
            return 'in_game'
        return 'in_lobby'

    return 'available'


def get_online_players_list():
    players = []
    seen_tokens = set()

    for token, data in active_sessions.items():
        if data.get('connected', False) and data.get('username') and token not in seen_tokens:
            status = get_player_status(data)
            room = get_player_room(data)
            players.append({
                'userId': token,
                'username': data.get('username'),
                'hasAvatar': bool(data.get('has_avatar', False)),
                'status': status,
                'gameName': room.game_name if room else None,
                'isGuest': bool(data.get('is_guest', False)),
            })
            seen_tokens.add(token)
    return players


def broadcast_player_list():
    players = get_online_players_list()
    socket.emit('online_players_update', players)


def get_game_state_safe(game, player_sid, user_token=None, is_observer=False):
    if isinstance(game, Thousand):
        return get_thousand_state_for_player(game, player_sid)

    if isinstance(game, Stratego):
        if hasattr(game, 'get_player_view'):
            return game.get_player_view(player_sid, user_token=user_token)
        return game.get_state()

    if isinstance(game, Battleships):
        state_for_player = copy.deepcopy(game.get_state())
        if is_observer:
            # Spectators get the public match view, including both boards.
            return state_for_player

        requesting_player_idx = game._get_player_idx(player_sid)
        boards = state_for_player['boards']
        for i in range(2):
            can_see_own_board = requesting_player_idx == i
            if not can_see_own_board:
                for r in range(10):
                    for c in range(10):
                        if boards[i][r][c] == 1:
                            boards[i][r][c] = 0
        return state_for_player

    return game.get_state()


def room_presence_payload(room):
    game = room.game_instance
    players = []
    if game and hasattr(game, 'seats'):
        for seat in game.seats:
            if not seat:
                continue
            token = str(seat.get('userId', ''))
            session = active_sessions.get(token, {})
            player = {
                'userId': token,
                'name': seat.get('name') or session.get('username') or 'GOSC',
                'socketId': seat.get('socketId'),
                'connected': seat.get('connected', True),
                'hasAvatar': bool(session.get('has_avatar', False)),
                'isHost': token == str(room.host_user_token),
            }
            players.append(player)

    observers = []
    for token, observer in room.observers.items():
        session = active_sessions.get(str(token), {})
        observers.append({
            'userId': str(token),
            'name': observer.get('name') or session.get('username') or 'GOSC',
            'socketId': observer.get('socketId'),
            'connected': observer.get('connected', True),
            'hasAvatar': bool(observer.get('hasAvatar', session.get('has_avatar', False))),
            'isHost': str(token) == str(room.host_user_token),
        })

    return {
        'roomId': room.uuid,
        'players': players,
        'observers': observers,
        'observersAllowed': bool(room.observers_allowed),
        'observersCount': len(observers),
        'maxObservers': room.max_observers,
        'stage': game_stage(game) if game else None,
        'hostUserId': room.host_user_token,
        'hostId': room.host_id,
    }


def emit_room_presence(room):
    if room:
        socket.emit('room_presence_update', room_presence_payload(room), to=room.uuid)


def room_recipient_sessions(room):
    recipients = []
    for token in room.player_tokens:
        session = active_sessions.get(str(token))
        if session and session.get('connected') and session.get('room_id') == room.uuid and session.get('sid'):
            recipients.append((str(token), session['sid'], 'player'))
    for token, observer in room.observers.items():
        if observer.get('connected') and observer.get('socketId'):
            recipients.append((str(token), observer['socketId'], 'observer'))
    return recipients


def emit_game_state_to_room(room):
    game = room.game_instance if room else None
    if not game:
        return
    for token, sid, role in room_recipient_sessions(room):
        state = copy.deepcopy(get_game_state_safe(
            game,
            sid,
            user_token=token,
            is_observer=role == 'observer',
        ))
        if role == 'player':
            seat = next((seat for seat in getattr(game, 'seats', []) or [] if seat and str(seat.get('userId')) == token), None)
            if seat and 'hand' in seat and isinstance(state, dict):
                state['my_hand'] = list(seat.get('hand') or [])
        socket.emit('game_state_update', state, to=sid)


def emit_room_update(room):
    emit_room_presence(room)
    emit_game_state_to_room(room)


def find_room(room_id):
    if not room_id:
        return None, None
    for lobby in manager.lobbies.values():
        room = lobby.rooms.get(room_id)
        if room:
            return lobby, room
    return None, None


def transfer_host(room, lobby=None):
    if not room:
        return None
    next_token = next((str(token) for token in room.player_tokens if active_sessions.get(str(token), {}).get('connected')), None)
    if next_token is None:
        next_token = next((str(token) for token in room.player_tokens), None)
    room.host_user_token = next_token
    if next_token:
        session = active_sessions.get(str(next_token), {})
        room.host_id = session.get('sid') or room.host_id
    else:
        room.host_id = ''
    if room.game_instance and hasattr(room.game_instance, 'seats'):
        for index, seat in enumerate(room.game_instance.seats):
            if seat and str(seat.get('userId')) == str(next_token):
                room.host_seat_index = index
                break
    return next_token


def get_lobby_case_insensitive(game_name):
    if not game_name: return None
    lobby = manager.get_lobby(game_name)
    if lobby: return lobby
    target = game_name.lower()
    for name, l in manager.lobbies.items():
        if name.lower() == target:
            return l
    return None


def delete_room(room_id):
    found_lobby = None
    found_room = None

    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            found_lobby = lobby
            break

    if found_room and found_lobby:
        loop = haxball_loops.pop(room_id, None)
        if loop and not loop.dead:
            loop.kill()
        socket.emit('room_closed', {'roomId': room_id}, to=room_id)
        socket.emit('game_ended_timeout', {'roomId': room_id}, to=room_id)

        member_tokens = set(found_room.player_tokens) | set(found_room.observers.keys())
        for token in list(member_tokens):
            session = active_sessions.get(str(token))
            if session and session.get('room_id') == room_id:
                session['room_id'] = None
                session['role'] = None

            if token in disconnect_timers:
                disconnect_timers[token].cancel()
                del disconnect_timers[token]

        del found_lobby.rooms[room_id]

        if room_id in room_deletion_timers:
            room_deletion_timers.pop(room_id, None)

        broadcast_player_list()


def remove_player_from_waiting_room(room, user_token):
    if room.game_instance and hasattr(room.game_instance, 'seats'):
        for index, seat in enumerate(room.game_instance.seats):
            if seat and str(seat.get('userId')) == str(user_token):
                room.game_instance.seats[index] = None
                if hasattr(room.game_instance, 'game_state'):
                    room.game_instance.game_state['seats'] = room.game_instance.seats
                break
    room.player_tokens.discard(user_token)
    session = active_sessions.get(str(user_token))
    if session and session.get('room_id') == room.uuid:
        session['room_id'] = None
        session['role'] = None
    if str(room.host_user_token) == str(user_token):
        transfer_host(room)


def forfeit_room_player(room, user_token, reason='disconnect_timeout'):
    game = room.game_instance
    if not game or not hasattr(game, 'forfeit_player'):
        return False
    result = game.forfeit_player(user_token, reason=reason)
    if not result.get('success'):
        return False
    for seat in getattr(game, 'seats', []) or []:
        if seat and str(seat.get('userId')) == str(user_token):
            seat['connected'] = False
            seat['explicitly_left'] = reason == 'resign'
            break
    room.player_tokens.discard(user_token)
    session = active_sessions.get(str(user_token))
    if session and session.get('room_id') == room.uuid:
        session['room_id'] = None
        session['role'] = None
    if str(room.host_user_token) == str(user_token):
        transfer_host(room)
    emit_room_update(room)
    socket.emit('player_forfeited', {
        'roomId': room.uuid,
        'playerId': str(user_token),
        'reason': reason,
    }, to=room.uuid)
    if not isinstance(game, HaxballGame):
        schedule_room_deletion(room.uuid)
    broadcast_player_list()
    return True


def close_room_due_to_timeout(room_id, user_token):
    disconnect_timers.pop(user_token, None)
    lobby, room = find_room(room_id)
    if not room:
        return
    if user_token in room.observers:
        room.observers.pop(user_token, None)
        session = active_sessions.get(str(user_token))
        if session and session.get('room_id') == room.uuid:
            session['room_id'] = None
            session['role'] = None
        emit_room_presence(room)
        if not room.player_tokens and not room.observers:
            delete_room(room.uuid)
        return

    game = room.game_instance
    if game and game_stage(game) != 'waiting_for_players':
        if forfeit_room_player(room, user_token, reason='disconnect_timeout'):
            return
    remove_player_from_waiting_room(room, user_token)
    emit_room_update(room)
    if not room.player_tokens and not room.observers:
        delete_room(room.uuid)
    else:
        broadcast_player_list()


def process_player_loss(sid):
    user_token = next((token for token, data in active_sessions.items() if data.get('sid') == sid), None)
    if not user_token:
        return
    session = active_sessions.get(user_token)
    session['connected'] = False
    room_id = session.get('room_id')
    lobby, room = find_room(room_id)

    if not room:
        for candidate_lobby in manager.lobbies.values():
            for candidate_room in candidate_lobby.rooms.values():
                if user_token in candidate_room.player_tokens or user_token in candidate_room.observers:
                    lobby, room = candidate_lobby, candidate_room
                    room_id = candidate_room.uuid
                    break
            if room:
                break
    if not room:
        return

    if user_token in room.observers:
        room.observers[user_token]['connected'] = False
        room.observers[user_token]['socketId'] = sid
        if user_token not in disconnect_timers:
            disconnect_timers[user_token] = eventlet.spawn_after(90, close_room_due_to_timeout, room.uuid, user_token)
        emit_room_presence(room)
        socket.emit('observer_disconnected', {'roomId': room.uuid, 'name': room.observers[user_token].get('name', 'GOSC'), 'waitTime': 90}, to=room.uuid)
        return

    if user_token not in room.player_tokens:
        return

    game = room.game_instance
    if game and hasattr(game, 'set_player_connection_status'):
        game.set_player_connection_status(user_token, False, sid=sid)

    if user_token not in disconnect_timers:
        disconnect_timers[user_token] = eventlet.spawn_after(90, close_room_due_to_timeout, room.uuid, user_token)

    disconnected_name = next((seat.get('name', 'GRACZ') for seat in getattr(game, 'seats', []) or [] if seat and str(seat.get('userId')) == str(user_token)), 'GRACZ')
    socket.emit('player_disconnected', {'roomId': room.uuid, 'playerName': disconnected_name, 'waitTime': 90}, to=room.uuid)
    emit_room_update(room)


@socket.on("disconnect")
def handle_disconnect():
    process_player_loss(request.sid)
    eventlet.sleep(0.1)
    broadcast_player_list()


@socket.on("leave_room")
def handle_explicit_leave_room(data):
    data = socket_payload(data)
    sender_sid = request.sid
    user_token = next((token for token, session in active_sessions.items() if session.get('sid') == sender_sid), None)
    requested_room_id = data.get('roomId')
    session = active_sessions.get(user_token, {}) if user_token else {}
    room_id = requested_room_id or session.get('room_id')
    lobby, room = find_room(room_id)

    if not room or not user_token:
        socketio_leave_room(room_id) if room_id else None
        return

    if user_token in room.observers:
        room.observers.pop(user_token, None)
        session['room_id'] = None
        session['role'] = None
        socket.emit('room_presence_update', room_presence_payload(room), to=room.uuid)
        socketio_leave_room(room.uuid)
        emit('your_active_game', None, to=sender_sid)
        broadcast_player_list()
        if not room.player_tokens and not room.observers:
            delete_room(room.uuid)
        return

    if user_token not in room.player_tokens:
        socketio_leave_room(room.uuid)
        session['room_id'] = None
        session['role'] = None
        emit('your_active_game', None, to=sender_sid)
        return

    game = room.game_instance
    stage = game_stage(game) if game else 'waiting_for_players'

    if user_token in disconnect_timers:
        disconnect_timers[user_token].cancel()
        disconnect_timers.pop(user_token, None)

    if stage == 'waiting_for_players':
        remove_player_from_waiting_room(room, user_token)
        session['connected'] = True
        socketio_leave_room(room.uuid)
        emit('your_active_game', None, to=sender_sid)
        if room.player_tokens or room.observers:
            emit_room_update(room)
            broadcast_player_list()
        else:
            delete_room(room.uuid)
        return

    if isinstance(game, HaxballGame) and stage == 'finished':
        game.remove_player(user_token)
        room.player_tokens.discard(user_token)
        if str(room.host_user_token) == str(user_token):
            transfer_host(room)
        session['room_id'] = None
        session['role'] = None
        emit_room_presence(room)
        if not room.player_tokens and not room.observers:
            delete_room(room.uuid)
        else:
            broadcast_player_list()
    elif not is_terminal_game(game):
        forfeit_room_player(room, user_token, reason='resign')
    else:
        room.player_tokens.discard(user_token)
        session['room_id'] = None
        session['role'] = None
        emit_room_presence(room)
        schedule_room_deletion(room.uuid)
        broadcast_player_list()

    socketio_leave_room(room.uuid)
    emit('your_active_game', None, to=sender_sid)


@socket.on("connect")
def handle_connect(auth):
    auth = socket_payload(auth)
    user_token = auth.get("token")
    username = auth.get("username")
    has_avatar = bool(auth.get("hasAvatar", False))
    if not user_token:
        return False

    user_token = str(user_token)
    is_guest = is_guest_token(user_token)
    if is_guest and not is_valid_guest_name(username):
        return False
    if is_guest and get_active_guest_ban(user_token):
        raise ConnectionRefusedError("GUEST_BANNED")

    username = str(username).strip() if username is not None else "GOSC"
    new_sid = request.sid
    session_data = active_sessions.get(user_token)

    if session_data:
        if user_token in disconnect_timers:
            disconnect_timers[user_token].cancel()
            del disconnect_timers[user_token]

        old_room_id = session_data.get("room_id")
        if old_room_id and old_room_id in room_deletion_timers:
            room_deletion_timers[old_room_id].cancel()
            del room_deletion_timers[old_room_id]

        found_room = None
        found_game_name = None
        for game_name, lobby in manager.lobbies.items():
            if old_room_id and old_room_id in lobby.rooms:
                found_room = lobby.rooms[old_room_id]
                found_game_name = game_name
                break

        active_sessions[user_token].update({
            "sid": new_sid,
            "username": username,
            "has_avatar": False if is_guest else has_avatar,
            "connected": True,
            "is_guest": is_guest,
            "ip": request.remote_addr or "unknown",
        })

        if found_room:
            join_room(old_room_id)
            if user_token in found_room.observers:
                found_room.observers[user_token].update({'socketId': new_sid, 'connected': True, 'hasAvatar': bool(active_sessions[user_token].get('has_avatar', False))})
            elif found_room.game_instance and hasattr(found_room.game_instance, 'set_player_connection_status'):
                found_room.game_instance.set_player_connection_status(user_token, True, sid=new_sid)
                for seat in getattr(found_room.game_instance, 'seats', []) or []:
                    if seat and str(seat.get('userId')) != str(user_token) and seat.get('socketId'):
                        socket.emit('opponent_reconnected', {'roomId': old_room_id, 'playerName': session_data.get('username', 'GRACZ')}, to=seat.get('socketId'))
            emit("your_active_game", {
                "roomId": old_room_id,
                "gameName": found_game_name,
                "roomName": found_room.room_name,
            })
            emit_room_presence(found_room)
            if found_room.game_instance:
                emit_game_state_to_room(found_room)
        else:
            active_sessions[user_token]["room_id"] = None
            emit("your_active_game", None)
    else:
        active_sessions[user_token] = {
            "sid": new_sid,
            "room_id": None,
            "username": username,
            "has_avatar": False if is_guest else has_avatar,
            "connected": True,
            "is_guest": is_guest,
            "role": None,
            "ip": request.remote_addr or "unknown",
        }
        emit("your_active_game", None)

    broadcast_player_list()


@socket.on("update_identity")
def handle_update_identity(data):
    data = socket_payload(data)
    username = data.get("username")
    user_token = next((token for token, session in active_sessions.items() if session.get("sid") == request.sid), None)
    if not user_token or not is_guest_token(user_token) or not is_valid_guest_name(username):
        emit("error", {"msg": "Nazwa goscia jest nieprawidlowa."}, to=request.sid)
        return

    username = username.strip()
    active_sessions[user_token]["username"] = username
    room_id = active_sessions[user_token].get("room_id")
    if room_id:
        for lobby in manager.lobbies.values():
            room = lobby.rooms.get(room_id)
            if not room:
                continue
            if user_token in room.observers:
                room.observers[user_token]['name'] = username
            elif room.game_instance:
                for seat in getattr(room.game_instance, "seats", []) or []:
                    if seat and str(seat.get("userId")) == str(user_token):
                        seat["name"] = unique_room_player_name(room.game_instance, username)
            emit_room_update(room)
            break

    broadcast_player_list()


@socket.on("update_room_settings")
def handle_update_room_settings(data):
    data = socket_payload(data)
    room_id = data.get('roomId')
    requested = data.get('observersAllowed')
    token = next((token for token, session in active_sessions.items() if session.get('sid') == request.sid), None)
    lobby, room = find_room(room_id)
    if not room or not token or str(token) != str(room.host_user_token):
        emit('error', {'msg': 'Tylko host moze zmieniac ustawienia pokoju.'}, to=request.sid)
        return
    if game_stage(room.game_instance) not in (None, 'waiting_for_players'):
        emit('error', {'msg': 'Ustawien obserwatorow nie mozna zmieniac po starcie gry.'}, to=request.sid)
        return
    if not isinstance(requested, bool):
        requested = str(requested).lower() not in {'false', '0', 'no'}
    room.observers_allowed = requested
    socket.emit('room_settings_update', {'roomId': room.uuid, 'observersAllowed': room.observers_allowed}, to=room.uuid)
    emit_room_presence(room)
    broadcast_player_list()


@socket.on("get_rooms")
def handle_get_rooms(data):
    data = socket_payload(data)
    game_name = data.get('game_name')
    lobby = get_lobby_case_insensitive(game_name)
    if not lobby:
        emit('error', {'msg': 'Nie znaleziono tej gry.'}, to=request.sid)
        return
    rooms_list = [r.to_dict() for r in lobby.rooms.values() if not is_terminal_game(r.game_instance)]
    emit('rooms_list', {"game": game_name, "rooms": rooms_list})


@socket.on("create_room")
def handle_create_room(data):
    data = socket_payload(data)
    game_name = data.get('game_name')
    room_name = data.get('room_name')
    try:
        max_players = int(data.get('max_players', 3))
    except (TypeError, ValueError):
        max_players = 3

    if str(game_name).lower() == "chess":
        max_players = 2

    password = data.get('password')
    observers_allowed = data.get('observers_allowed', True)
    if not isinstance(observers_allowed, bool):
        observers_allowed = str(observers_allowed).lower() not in {'false', '0', 'no'}
    if password is not None and not isinstance(password, str):
        emit('error', {'msg': 'Haslo pokoju jest nieprawidlowe.'}, to=request.sid)
        return
    if isinstance(password, str):
        password = password.strip() or None

    time_control_min = None
    host_color_pref = None
    host_seat_index = None
    haxball_map_id = None
    haxball_mode = None
    haxball_duration_min = None

    if str(game_name).lower() == "haxball":
        haxball_mode = normalize_mode(data.get("match_mode") or data.get("mode"))
        haxball_map_id = normalize_map_id(data.get("map_id") or data.get("mapId"))
        haxball_duration_min = normalize_duration(data.get("duration_min") or data.get("durationMin"))
        max_players = VALID_MODES[haxball_mode]

    if str(game_name).lower() == "chess":

        t = data.get("time_control_min")
        try:
            t = int(t)
        except Exception:
            t = 10
        if t not in (5, 10, 15):
            t = 10
        time_control_min = t

        pref = (data.get("color_preference") or data.get("colorPref") or "random")
        pref = str(pref).lower().strip()
        if pref not in ("white", "black", "random"):
            pref = "random"
        host_color_pref = pref

        import random
        if pref == "white":
            host_seat_index = 0
        elif pref == "black":
            host_seat_index = 1
        else:
            host_seat_index = random.choice([0, 1])

    host_id = request.sid
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == host_id), None)
    if not user_token:
        emit('error', {'msg': 'Brak autoryzacji.'}, to=request.sid)
        return

    if is_guest_token(user_token) and not guest_can_create_room(user_token):
        emit('error', {'msg': 'GOSCOWIE MOGA TWORZYC MAKSYMALNIE 3 POKOJE NA MINUTE.'}, to=request.sid)
        return

    lobby = get_lobby_case_insensitive(game_name)
    if not lobby:
        emit('error', {'msg': 'Nie znaleziono tej gry.'}, to=request.sid)
        return

    if not isinstance(room_name, str) or not room_name.strip() or len(room_name.strip()) > 80:
        emit('error', {'msg': 'Nazwa pokoju musi miec od 1 do 80 znakow.'}, to=request.sid)
        return

    allowed_players = getattr(lobby.game_class, 'player_range', [2, 3, 4])
    if max_players not in allowed_players:
        max_players = max(allowed_players)

    try:
        room = lobby.create_room(
            host_id,
            room_name,
            game_name,
            max_players,
            password,
            time_control_min=time_control_min,
            host_user_token=user_token,
            host_color_pref=host_color_pref,
            host_seat_index=host_seat_index,
            observers_allowed=observers_allowed,
            max_observers=20,
            map_id=haxball_map_id,
            match_mode=haxball_mode,
            duration_min=haxball_duration_min,
        )

        if str(game_name).lower() == "haxball":
            room.game_instance = HaxballGame(
                room.players,
                mode=haxball_mode or "1v1",
                map_id=haxball_map_id or "classic-arena",
                duration_min=haxball_duration_min or 5,
            )
            start_haxball_loop(room)

        if user_token:
            room.player_tokens.add(user_token)
            if user_token in active_sessions:
                active_sessions[user_token].update({'room_id': room.uuid, 'role': 'player', 'connected': True})
            else:
                active_sessions[user_token] = {
                    'sid': host_id,
                    'room_id': room.uuid,
                    'username': 'Host',
                    'connected': True,
                    'role': 'player'
                }

        join_room(room.uuid)

        if str(game_name).lower() == "battleships":
            if room.game_instance is None:
                room.game_instance = lobby.game_class(room.players)
            game = room.game_instance
            player_name = unique_room_player_name(
                game,
                active_sessions.get(user_token, {}).get("username") or "GOSC",
            )
            res = game.sit_player(host_id, player_name, 0, user_token)
            if res.get('success'):
                state = get_game_state_safe(game, host_id)
                emit('game_state_update', state, to=host_id)

        emit('room_created', {'room_id': room.uuid, 'game': game_name}, to=host_id)
        broadcast_player_list()

    except Exception as error:
        current_app.logger.exception("Unable to create room", exc_info=error)
        emit('error', {'msg': 'Nie udalo sie utworzyc pokoju.'}, to=host_id)


@socket.on("join_room")
def handle_join_game_room(data):
    data = socket_payload(data)
    game_name = data.get('game_name')
    room_id = str(data.get('room_id')).strip() if data.get('room_id') else None
    provided_password = data.get('password')
    requested_role = 'observer' if str(data.get('role', 'player')).lower() == 'observer' else 'player'
    current_sid = request.sid

    user_token = next((token for token, d in active_sessions.items() if d['sid'] == current_sid), None)

    if not user_token:
        emit('join_room_response', {'success': False, 'message': 'BLAD AUTORYZACJI'})
        return

    if user_token in disconnect_timers:
        disconnect_timers[user_token].cancel()
        del disconnect_timers[user_token]

    lobby = get_lobby_case_insensitive(game_name)
    if not lobby and room_id:
        for l_name, l in manager.lobbies.items():
            if room_id in l.rooms:
                lobby = l
                break

    if not lobby:
        emit('join_room_response', {'success': False, 'message': f'LOBBY GRY NIE ISTNIEJE ({game_name})'})
        return

    found_room = lobby.rooms.get(room_id)
    if not found_room:
        emit('join_room_response', {'success': False, 'message': 'POKOJ NIE ISTNIEJE LUB ZOSTAL USUNIETY.'})
        return

    game_name = found_room.game_name
    is_terminal_room = bool(found_room.game_instance and is_terminal_game(found_room.game_instance))
    if is_terminal_room and requested_role != 'observer':
        emit('join_room_response', {'success': False, 'message': 'Gra zostala zakonczona. Mozesz dolaczyc jako obserwator.'})
        return

    is_returning_player = user_token in found_room.player_tokens
    is_returning_observer = user_token in found_room.observers
    is_returning_member = is_returning_player or is_returning_observer

    if user_token in disconnect_timers:
        disconnect_timers[user_token].cancel()
        del disconnect_timers[user_token]

    if room_id in room_deletion_timers and not is_terminal_room:
        room_deletion_timers[room_id].cancel()
        del room_deletion_timers[room_id]

    if found_room.password and not is_returning_member:
        if not provided_password or provided_password != found_room.password:
            emit('join_room_response', {
                'success': False,
                'message': 'WYMAGANE HASLO' if not provided_password else 'BLEDNE HASLO',
                'error_code': 'PASSWORD_REQUIRED'
            })
            return

    if requested_role == 'observer':
        if is_returning_player:
            emit('join_room_response', {'success': False, 'message': 'Gracz nie moze obserwowac w tej samej sesji.'})
            return
        room = lobby.join_observer(
            room_id,
            current_sid,
            user_token,
            active_sessions.get(user_token, {}).get('username') or 'GOSC',
            bool(active_sessions.get(user_token, {}).get('has_avatar', False)),
        )
        if not room:
            message = 'Obserwatorzy nie moga dolaczac do tego pokoju.' if not found_room.observers_allowed else 'Limit obserwatorow zostal osiagniety.'
            emit('join_room_response', {'success': False, 'message': message, 'error_code': 'OBSERVERS_UNAVAILABLE'})
            return
    else:
        if found_room.game_instance and game_stage(found_room.game_instance) != 'waiting_for_players' and not is_returning_player:
            emit('join_room_response', {'success': False, 'message': 'Gra juz sie rozpoczela. Dolacz jako obserwator.'})
            return
        if is_returning_observer:
            lobby.remove_observer(room_id, user_token)
        room = lobby.join_room(room_id, current_sid, user_token)
        if not room:
            emit('join_room_response', {'success': False, 'message': 'NIE UDALO SIE DOLACZYC DO POKOJU.'})
            return

    join_room(room_id)

    session = active_sessions.setdefault(user_token, {'sid': current_sid, 'room_id': room_id, 'connected': True})
    session.update({'sid': current_sid, 'room_id': room_id, 'connected': True, 'role': requested_role})

    if requested_role == 'player':
        room.player_tokens.add(user_token)
        if room.host_user_token == user_token:
            room.host_id = current_sid

    if requested_role == 'player' and str(game_name).lower() == "chess":

        if room.game_instance is None:
            room.game_instance = lobby.game_class(room.players)

            if getattr(room, "time_control_min", None) and hasattr(room.game_instance, "set_time_control"):
                try:
                    room.game_instance.set_time_control(int(room.time_control_min))
                except Exception:
                    pass

        game = room.game_instance

        try:
            from games.chess import chess as _chess
        except Exception:
            _chess = None

        if _chess is not None and isinstance(game, _chess):

            player_name = unique_room_player_name(
                game,
                active_sessions.get(user_token, {}).get("username") or "GOSC",
            )

            already_idx = None
            for i, s in enumerate(getattr(game, "seats", []) or []):
                if s and str(s.get("userId")) == str(user_token):
                    already_idx = i
                    break

            if already_idx is None:

                host_token = getattr(room, "host_user_token", None)
                host_idx = getattr(room, "host_seat_index", None)
                if host_idx not in (0, 1):
                    host_idx = 0

                if host_token and str(user_token) == str(host_token):
                    seat_index = int(host_idx)
                else:
                    seat_index = 1 - int(host_idx)

                res = game.sit_player(current_sid, player_name, seat_index, user_token)
                if not res.get("success"):
                    alt = 1 - seat_index
                    game.sit_player(current_sid, player_name, alt, user_token)
            else:
                if hasattr(game, "set_player_connection_status"):
                    game.set_player_connection_status(user_token, True, current_sid)

    emit('join_room_response', {'success': True, 'role': requested_role, 'room_data': room.to_dict()})

    try:
        emit('your_active_game', {
            'gameName': room.game_name,
            'roomId': room.uuid,
            'roomName': room.room_name,
        }, to=current_sid)
    except Exception:
        pass

    if room.game_instance:
        game = room.game_instance

        if is_returning_player and hasattr(game, 'set_player_connection_status'):
            game.set_player_connection_status(user_token, True, current_sid)

            was_explicitly_left = False
            reconnected_name = None
            if hasattr(game, 'seats'):
                for i, s in enumerate(game.seats):
                    if s and s.get('userId') == user_token:
                        was_explicitly_left = s.get('explicitly_left', False)
                        reconnected_name = s.get('name', 'PLAYER')

                        game.seats[i]['explicitly_left'] = False
                        break

            if hasattr(game, 'seats'):
                for s in game.seats:
                    if s and s.get('socketId') and s.get('socketId') != current_sid:
                        if was_explicitly_left:

                            emit('opponent_returned', {
                                'roomId': room_id,
                                'playerName': reconnected_name
                            }, to=s.get('socketId'))
                        else:

                            emit('opponent_reconnected', {
                                'roomId': room_id,
                                'playerName': reconnected_name
                            }, to=s.get('socketId'))

        emit_game_state_to_room(room)
        emit_room_presence(room)

    emit_room_presence(room)
    broadcast_player_list()


@socket.on("haxball_input")
def handle_haxball_input(data):
    data = socket_payload(data)
    room_id = data.get("roomId")
    user_token = next((token for token, session in active_sessions.items() if session.get("sid") == request.sid), None)
    _lobby, room = find_room(room_id)
    if not room or not user_token or not isinstance(room.game_instance, HaxballGame):
        return
    if user_token not in room.player_tokens or user_token in room.observers:
        return
    room.game_instance.handle_input(request.sid, data.get("input", data))


@socket.on("haxball_choose_team")
def handle_haxball_choose_team(data):
    data = socket_payload(data)
    room_id = data.get("roomId")
    user_token = next((token for token, session in active_sessions.items() if session.get("sid") == request.sid), None)
    _lobby, room = find_room(room_id)
    if not room or not user_token or not isinstance(room.game_instance, HaxballGame):
        emit("error", {"msg": "Pokoj Haxball nie istnieje."}, to=request.sid)
        return
    if user_token not in room.player_tokens or user_token in room.observers:
        emit("error", {"msg": "Najpierw dolacz jako gracz."}, to=request.sid)
        return
    session = active_sessions.get(user_token, {})
    result = room.game_instance.choose_team(
        str(user_token),
        request.sid,
        session.get("username") or "GOSC",
        data.get("team"),
    )
    if not result.get("success"):
        emit("error", {"msg": result.get("msg", "Nie mozna wybrac druzyny.")}, to=request.sid)
        return
    emit_room_update(room)


@socket.on("haxball_ready")
def handle_haxball_ready(data):
    data = socket_payload(data)
    room_id = data.get("roomId")
    user_token = next((token for token, session in active_sessions.items() if session.get("sid") == request.sid), None)
    _lobby, room = find_room(room_id)
    if not room or not user_token or not isinstance(room.game_instance, HaxballGame):
        return
    if user_token not in room.player_tokens or user_token in room.observers:
        return
    requested_ready = data.get("ready", True)
    if not isinstance(requested_ready, bool):
        requested_ready = str(requested_ready).lower() not in {"false", "0", "no"}
    result = room.game_instance.set_ready(user_token, requested_ready)
    if not result.get("success"):
        emit("error", {"msg": result.get("msg", "Nie mozna zmienic gotowosci.")}, to=request.sid)
        return
    emit_room_update(room)


@socket.on("haxball_update_settings")
def handle_haxball_update_settings(data):
    data = socket_payload(data)
    room_id = data.get("roomId")
    user_token = next((token for token, session in active_sessions.items() if session.get("sid") == request.sid), None)
    _lobby, room = find_room(room_id)
    if not room or not user_token or not isinstance(room.game_instance, HaxballGame):
        return
    if str(user_token) != str(room.host_user_token):
        emit("error", {"msg": "Tylko host moze zmieniac ustawienia Haxball."}, to=request.sid)
        return
    result = room.game_instance.update_settings(
        user_token,
        map_id=data.get("map_id") if "map_id" in data else None,
        duration_min=data.get("duration_min") if "duration_min" in data else None,
    )
    if not result.get("success"):
        emit("error", {"msg": result.get("msg", "Nie mozna zmienic ustawien.")}, to=request.sid)
        return
    room.map_id = room.game_instance.map_id
    room.duration_min = room.game_instance.duration_min
    emit_room_update(room)


@socket.on("haxball_rematch")
def handle_haxball_rematch(data):
    data = socket_payload(data)
    room_id = data.get("roomId")
    user_token = next((token for token, session in active_sessions.items() if session.get("sid") == request.sid), None)
    _lobby, room = find_room(room_id)
    if not room or not user_token or not isinstance(room.game_instance, HaxballGame):
        return
    if str(user_token) != str(room.host_user_token):
        emit("error", {"msg": "Tylko host moze rozpoczac rewanz."}, to=request.sid)
        return
    if len(room.player_tokens) < room.maxPlayers or any(
        not seat or str(seat.get("userId")) not in {str(token) for token in room.player_tokens}
        for seat in room.game_instance.seats
    ):
        emit("error", {"msg": "Wszyscy gracze musza pozostac w pokoju, aby zagrac rewanz."}, to=request.sid)
        return
    result = room.game_instance.prepare_rematch(user_token)
    if not result.get("success"):
        emit("error", {"msg": result.get("msg", "Nie mozna przygotowac rewanzu.")}, to=request.sid)
        return
    emit_room_update(room)
    broadcast_player_list()


@socket.on('sit_down')
def handle_sit_down(data):
    data = socket_payload(data)
    room_id = data.get('roomId')
    seat_index = data.get('seatIndex')
    try:
        seat_index = int(seat_index)
    except (TypeError, ValueError):
        emit('error', {'msg': 'Nieprawidlowe miejsce.'}, to=request.sid)
        return
    player_id = request.sid
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == player_id), None)
    session_data = active_sessions.get(user_token, {}) if user_token else {}
    player_name = session_data.get('username') if is_guest_token(user_token) else data.get('playerName')
    if not player_name:
        player_name = session_data.get('username') or f"Gracz {player_id[:4]}"

    found_room = None
    found_lobby = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            found_lobby = lobby
            break

    if not found_room:
        emit('error', {'msg': 'Pokoj nie istnieje lub zostal zamkniety.'}, to=player_id)
        return
    if game_stage(found_room.game_instance) not in (None, 'waiting_for_players'):
        emit('error', {'msg': 'Nie mozna zajac miejsca po rozpoczeciu gry.'}, to=player_id)
        return
    if user_token not in found_room.player_tokens and user_token not in found_room.observers:
        emit('error', {'msg': 'Najpierw dolacz do pokoju.'}, to=player_id)
        return
    if user_token in found_room.observers:
        found_room.observers.pop(user_token, None)
        found_room.player_tokens.add(user_token)
        if user_token in active_sessions:
            active_sessions[user_token]['role'] = 'player'
        if not found_room.host_user_token:
            transfer_host(found_room)
    if found_room.game_instance is None:
        found_room.game_instance = found_lobby.game_class(found_room.players)

    game = found_room.game_instance

    # Room creation can seat a host before the client finishes its automatic
    # join flow. Treat a repeated request for that player as a reconnect/no-op
    # instead of asking the game to occupy an already occupied seat.
    existing_seat = None
    if user_token and hasattr(game, 'seats'):
        for seat in game.seats:
            if seat and (str(seat.get('userId')) == str(user_token) or str(seat.get('socketId')) == str(player_id)):
                existing_seat = seat
                break

    if existing_seat is not None:
        existing_seat['socketId'] = player_id
        existing_seat['connected'] = True
        if hasattr(game, 'set_player_connection_status') and user_token:
            game.set_player_connection_status(user_token, True, sid=player_id)
        res = {'success': True, 'msg': 'Juz siedzisz przy stole.'}
    else:
        # Auto-join links prefer seat zero, but that seat may already belong
        # to the room creator. Select the first free seat only for this
        # explicit automatic flow; manual seat choices remain authoritative.
        if data.get('autoJoin') and hasattr(game, 'seats') and 0 <= seat_index < len(game.seats) and game.seats[seat_index] is not None:
            fallback_seat = next((index for index, seat in enumerate(game.seats) if seat is None), None)
            if fallback_seat is not None:
                seat_index = fallback_seat

        player_name = unique_room_player_name(game, player_name)
        res = game.sit_player(player_id, player_name, seat_index, user_token) if user_token else {
            'success': False,
            'msg': 'Brak autoryzacji.'
        }

    if res['success']:
        emit_room_update(found_room)
        broadcast_player_list()
    else:
        emit('error', {'msg': res['msg']}, to=player_id)


@socket.on('start_game')
def handle_start_game(data):
    data = socket_payload(data)
    room_id = data.get('roomId')
    requesting_player_id = request.sid

    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    requesting_token = next((token for token, data in active_sessions.items() if data.get('sid') == requesting_player_id), None)
    is_host = found_room and (
        found_room.host_id == requesting_player_id
        or (requesting_token and requesting_token == found_room.host_user_token)
    )
    if not is_host or not found_room.game_instance:
        emit('error', {'msg': 'Tylko gospodarz moze rozpoczac gre.'}, to=requesting_player_id)
        return

    game = found_room.game_instance
    seats = getattr(game, 'seats', []) or []
    required_players = int(found_room.maxPlayers or 0)
    seated_players = [seat for seat in seats if seat is not None]
    if game_stage(game) != 'waiting_for_players' or len(seated_players) != required_players or any(not seat.get('connected', True) for seat in seated_players):
        emit('error', {'msg': 'Wszyscy wymagani gracze musza byc polaczeni przed startem.'}, to=requesting_player_id)
        return

    if isinstance(game, chess) and getattr(found_room, "time_control_min", None):
        game.set_time_control(found_room.time_control_min)
    res = game.start_game()

    if res['success']:
        emit_room_update(found_room)
        broadcast_player_list()
    else:
        emit('error', {'msg': res['msg']}, to=requesting_player_id)


def get_room_state_for_socket(room_id, player_id):
    """Send a state snapshot only to a current room member.

    Sync requests can arrive while a page is being torn down. They are
    intentionally silent for stale/non-member sockets; otherwise the client
    can answer the error with another sync request and create an error loop.
    """
    if not room_id:
        return

    user_token = next((token for token, data in active_sessions.items() if data.get('sid') == player_id), None)
    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    if not found_room or not found_room.game_instance or not user_token:
        return

    is_observer = user_token in found_room.observers
    if user_token not in found_room.player_tokens and not is_observer:
        return

    game = found_room.game_instance
    state = get_game_state_safe(
        game,
        player_id,
        user_token=user_token,
        is_observer=is_observer,
    )
    emit('game_state_update', state, to=player_id)
    if user_token in found_room.player_tokens and hasattr(game, 'get_player_hand_by_token'):
        hand = game.get_player_hand_by_token(user_token)
        if hand:
            emit('game_state_update', {'my_hand': hand}, to=player_id)


@socket.on('sync_state')
def handle_sync_state(data):
    data = socket_payload(data)
    get_room_state_for_socket(data.get('roomId'), request.sid)


@socket.on('get_game_state')
def handle_get_game_state(data):
    data = socket_payload(data)
    get_room_state_for_socket(data.get('roomId'), request.sid)


@socket.on('player_move')
def handle_player_move(data):
    data = socket_payload(data)
    room_id = data.get('roomId')
    move_data = data.get('move')
    player_id = request.sid

    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    if not found_room or not found_room.game_instance:
        emit('error', {'msg': 'Gra nie istnieje lub zostala zakonczona.'}, to=player_id)
        return
    user_token = next((token for token, session in active_sessions.items() if session.get('sid') == player_id), None)
    if not user_token or str(user_token) not in {str(token) for token in found_room.player_tokens}:
        emit('error', {'msg': 'Obserwator nie moze wykonywac ruchow.'}, to=player_id)
        return
    game = found_room.game_instance

    if isinstance(game, Thousand):
        handle_thousand_move(game, found_room, player_id, move_data)
        if is_terminal_game(game):
            broadcast_player_list()
            schedule_room_deletion(room_id)

    elif isinstance(game, Stratego):
        handle_stratego_move(game, found_room, player_id, move_data, socket)
        emit_game_state_to_room(found_room)

        if is_terminal_game(game):
            broadcast_player_list()
            schedule_room_deletion(room_id)

    elif isinstance(game, Battleships):
        res = game.handle_move(player_id, move_data)
        if res['success']:
            emit_game_state_to_room(found_room)

            if is_terminal_game(game):
                broadcast_player_list()
                schedule_room_deletion(room_id)

            if game.game_state.get('stage') == 'playing' and len(game.game_state.get('ready_players', [])) == 2:
                emit('game_stage_changed', {
                    'stage': 'playing'
                }, to=room_id)
                for i, seat in enumerate(game.seats):
                    if seat and seat['socketId']:
                        state = get_game_state_safe(game, seat['socketId'])
                        emit('game_state_update', state, to=seat['socketId'])
        else:
            emit('error', {'msg': res['msg']}, to=player_id)

    elif isinstance(game, SetGame):
        res = game.handle_move(player_id, move_data)
        if res.get('success'):
            emit_game_state_to_room(found_room)
            if is_terminal_game(game):
                broadcast_player_list()
                schedule_room_deletion(room_id)
        else:
            emit('error', {'msg': res.get('msg', 'Nieprawidlowy ruch.')}, to=player_id)

    else:
        res = game.handle_move(player_id, move_data)
        if res['success']:
            emit_game_state_to_room(found_room)
            if is_terminal_game(game):
                broadcast_player_list()
                schedule_room_deletion(room_id)
        else:
            emit('error', {'msg': res['msg']}, to=player_id)


@socket.on("get_online_players")
def handle_get_online_players():
    players = get_online_players_list()
    emit('online_players_update', players)


@socket.on("validate_invite_room")
def handle_validate_invite_room(data):
    data = socket_payload(data)
    room_id = str(data.get('roomId') or '').strip()
    game_name = data.get('gameName')
    lobby = get_lobby_case_insensitive(game_name)
    room = lobby.rooms.get(room_id) if lobby else None

    if not room or (room.game_instance and game_stage(room.game_instance) != 'waiting_for_players'):
        return {'available': False}
    if len(room.player_tokens) >= max(1, int(room.maxPlayers or 0)):
        return {'available': False}
    return {'available': True}


@socket.on("send_invite")
def handle_send_invite(data):
    data = socket_payload(data)
    target_user_id = data.get('targetUserId')
    sender_sid = request.sid

    sender_token = next((token for token, d in active_sessions.items() if d['sid'] == sender_sid), None)

    if not sender_token:
        return

    sender_data = active_sessions[sender_token]
    sender_name = sender_data.get('username', 'Nieznajomy')
    sender_room_id = sender_data.get('room_id')

    game_name = "Nieznana gra"
    if sender_room_id:
        for name, lobby in manager.lobbies.items():
            if sender_room_id in lobby.rooms:
                game_name = name
                break

    target_session = None

    if target_user_id in active_sessions:
        target_session = active_sessions[target_user_id]
    else:
        for token, session in active_sessions.items():
            if str(token) == str(target_user_id):
                target_session = session
                break

    if target_session and target_session.get('connected') and str(target_user_id) != str(sender_token):
        target_sid = target_session.get('sid')
        if not target_sid:
            return

        socket.emit('incoming_invite', {
            'hostName': sender_name,
            'gameName': game_name,
            'roomId': sender_room_id
        }, to=target_sid)


@socket.on("send_friend_invite")
def handle_send_friend_invite(data):
    data = socket_payload(data)
    target_user_id = data.get("targetUserId")
    sender_sid = request.sid
    sender_token = next((token for token, session in active_sessions.items() if session.get('sid') == sender_sid), None)

    try:
        target_user_id = str(int(target_user_id))
    except (TypeError, ValueError):
        socket.emit('friend_invite_error', {'code': 'INVALID_TARGET'}, to=sender_sid)
        return

    if not sender_token or is_guest_token(sender_token) or sender_token == target_user_id:
        socket.emit('friend_invite_error', {'code': 'UNAUTHORIZED'}, to=sender_sid)
        return

    from models import Friendship, User, db

    try:
        sender_id, target_id = sorted((int(sender_token), int(target_user_id)))
    except ValueError:
        socket.emit('friend_invite_error', {'code': 'UNAUTHORIZED'}, to=sender_sid)
        return

    if not db.session.get(User, target_id) or not Friendship.query.filter_by(
        user_one_id=sender_id,
        user_two_id=target_id,
    ).first():
        socket.emit('friend_invite_error', {'code': 'NOT_FRIENDS'}, to=sender_sid)
        return

    sender_data = active_sessions.get(sender_token, {})
    sender_room_id = sender_data.get('room_id')
    room = None
    lobby = None
    for game_lobby in manager.lobbies.values():
        if sender_room_id and sender_room_id in game_lobby.rooms:
            lobby = game_lobby
            room = game_lobby.rooms[sender_room_id]
            break

    if not room or sender_token not in room.player_tokens:
        socket.emit('friend_invite_error', {'code': 'WAITING_ROOM_REQUIRED'}, to=sender_sid)
        return

    if room.game_instance and game_stage(room.game_instance) != 'waiting_for_players':
        socket.emit('friend_invite_error', {'code': 'WAITING_ROOM_REQUIRED'}, to=sender_sid)
        return

    if len(room.player_tokens) >= max(1, int(room.maxPlayers or 0)):
        socket.emit('friend_invite_error', {'code': 'ROOM_FULL'}, to=sender_sid)
        return

    target_session = active_sessions.get(target_user_id)
    if not target_session or not target_session.get('connected') or get_player_status(target_session) != 'available':
        socket.emit('friend_invite_error', {'code': 'TARGET_UNAVAILABLE'}, to=sender_sid)
        return

    socket.emit('incoming_invite', {
        'hostName': sender_data.get('username', 'Nieznajomy'),
        'gameName': lobby.game.name,
        'roomId': room.uuid,
        'password': room.password,
    }, to=target_session.get('sid'))
    socket.emit('friend_invite_sent', {'targetUserId': target_user_id}, to=sender_sid)


@socket.on("get_game_info")
def handle_get_game_info(data):
    data = socket_payload(data)
    game_name = data.get('game_name')
    lobby = get_lobby_case_insensitive(game_name)
    if lobby:
        player_range = getattr(lobby.game_class, 'player_range', [2, 3, 4])
        emit('game_info', {
            "game_name": game_name,
            "player_range": player_range
        })


@socket.on("send_chat_message")
def handle_chat_message(data):
    data = socket_payload(data)
    room_id = data.get('roomId')
    message = data.get('message')
    sender_sid = request.sid

    if not isinstance(room_id, str) or not room_id or not isinstance(message, str):
        emit('error', {'msg': 'Wiadomosc jest nieprawidlowa.'}, to=sender_sid)
        return
    message = message.strip()
    if not message:
        return
    if len(message) > 500:
        emit('error', {'msg': 'Wiadomosc jest za dluga.'}, to=sender_sid)
        return

    sender_token = next((token for token, d in active_sessions.items() if d['sid'] == sender_sid), None)
    if not sender_token or active_sessions.get(sender_token, {}).get('room_id') != room_id:
        # A queued chat packet may arrive while the room page is unmounting.
        # It is stale input, not a user-facing error.
        return

    session_data = active_sessions[sender_token]
    if not can_send_chat(session_data):
        emit('error', {'msg': 'Limit wiadomosci zostal chwilowo przekroczony.'}, to=sender_sid)
        return

    sender_name = "Nieznajomy"

    if sender_token and sender_token in active_sessions:
        sender_name = active_sessions[sender_token].get('username', 'Gracz')

    timestamp = time.time()
    msg_payload = {
        'sender': sender_name,
        'text': message,
        'timestamp': timestamp,
        'isSystem': False,
        'sid': sender_sid
    }

    emit('chat_message_update', msg_payload, to=room_id)
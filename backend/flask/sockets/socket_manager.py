import eventlet
import time
import copy

eventlet.monkey_patch()

from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room as socketio_leave_room

from games.handling_multiplayer import LobbyManager, GameType
from games.thousand import Thousand
from games.stratego import Stratego
from games.chess import chess
from games.battleships import Battleships
from games.setgame import SetGame

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

active_sessions = {}
disconnect_timers = {}
room_deletion_timers = {}


def get_player_status(session_data):
    room_id = session_data.get('room_id')

    if not room_id:
        return 'available'

    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    if found_room:
        if found_room.game_instance:
            return 'in_game'
        return 'in_lobby'

    return 'available'


def get_online_players_list():
    players = []
    seen_tokens = set()

    for token, data in active_sessions.items():
        if data.get('connected', False) and data.get('username') and token not in seen_tokens:
            status = get_player_status(data)
            players.append({
                'userId': token,
                'username': data.get('username'),
                'status': status
            })
            seen_tokens.add(token)
    return players


def broadcast_player_list():
    players = get_online_players_list()
    socket.emit('online_players_update', players)


def get_game_state_safe(game, player_sid, user_token=None):
    if isinstance(game, Thousand):
        return get_thousand_state_for_player(game, player_sid)

    if isinstance(game, Stratego):
        if hasattr(game, 'get_player_view'):
            return game.get_player_view(player_sid, user_token=user_token)
        return game.get_state()

    if isinstance(game, Battleships):
        full_state = game.get_state()
        state_for_player = copy.deepcopy(full_state)

        requesting_player_idx = game._get_player_idx(player_sid)

        if state_for_player['stage'] == 'playing' and requesting_player_idx != -1:
            boards = state_for_player['boards']
            for i in range(2):
                if i != requesting_player_idx:
                    for r in range(10):
                        for c in range(10):
                            if boards[i][r][c] == 1:
                                boards[i][r][c] = 0
        return state_for_player

    return game.get_state()


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
        socket.emit('error', {'msg': 'POKOJ ZOSTAL ZAMKNIETY.'}, to=room_id)
        socket.emit('game_ended_timeout', {'roomId': room_id}, to=room_id)

        for token in list(found_room.player_tokens):
            if token in active_sessions and active_sessions[token].get('room_id') == room_id:
                active_sessions[token]['room_id'] = None

            if token in disconnect_timers:
                disconnect_timers[token].cancel()
                del disconnect_timers[token]

        del found_lobby.rooms[room_id]

        if room_id in room_deletion_timers:
            room_deletion_timers.pop(room_id, None)

        broadcast_player_list()


def close_room_due_to_timeout(room_id, user_token):
    if user_token in disconnect_timers:
        del disconnect_timers[user_token]
    delete_room(room_id)


def process_player_loss(sid):
    print(f"[DEBUG] process_player_loss called with sid={sid}")
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == sid), None)
    print(f"[DEBUG] user_token from active_sessions: {user_token}")

    if user_token and user_token in active_sessions:
        active_sessions[user_token]['connected'] = False

    room_id = None
    found_room = None

    if user_token and user_token in active_sessions:
        room_id = active_sessions[user_token].get('room_id')
        print(f"[DEBUG] room_id from active_sessions: {room_id}")

    if not room_id:
        for lobby in manager.lobbies.values():
            for r_id, r in lobby.rooms.items():
                if r.game_instance and hasattr(r.game_instance, 'seats'):
                    for seat in r.game_instance.seats:
                        if seat and seat.get('socketId') == sid:
                            found_room = r
                            room_id = r_id
                            if not user_token: user_token = seat.get('userId')
                            break
                if found_room: break
            if found_room: break

    if room_id and not found_room:
        for lobby in manager.lobbies.values():
            if room_id in lobby.rooms:
                found_room = lobby.rooms[room_id]
                break

    if found_room and found_room.game_instance and user_token:
        game = found_room.game_instance

        # --- FIX START ---
        # Sprawdzamy, czy gra jest już zakończona
        current_stage = game.game_state.get('stage')
        is_game_over = current_stage in ['game_over', 'finished', 'checkmate', 'draw', 'stalemate', 'ended']
        # --- FIX END ---

        if hasattr(game, 'set_player_connection_status'):
            game.set_player_connection_status(user_token, False, sid=sid)

        if isinstance(game, Stratego):
            broadcast_stratego_state(game, room_id, socket)
        else:
            emit('game_state_update', game.get_state(), to=room_id)

        still_seated = False
        if hasattr(game, 'seats'):
            for s in game.seats:
                if s and s.get('userId') == user_token:
                    still_seated = True
                    break

        print(f"[DEBUG] still_seated={still_seated}, user_token in disconnect_timers={user_token in disconnect_timers}")

        # --- FIX START ---
        # Dodany warunek "and not is_game_over" - nie uruchamiamy procedury rozłączenia, jeśli gra się skończyła
        if still_seated and user_token not in disconnect_timers and not is_game_over:
            print(f"[DEBUG] Starting disconnect timer for {user_token}")
            timer = eventlet.spawn_after(90, close_room_due_to_timeout, room_id, user_token)
            disconnect_timers[user_token] = timer

            disconnected_name = None
            for s in game.seats:
                if s and s.get('userId') == user_token:
                    disconnected_name = s.get('name', 'OPPONENT')
                    break

            print(f"[DEBUG] disconnected_name={disconnected_name}")
            print(f"[DEBUG] All seats: {game.seats}")

            for s in game.seats:
                print(f"[DEBUG] Checking seat: {s}")
                if s and s.get('socketId') and s.get('userId') != user_token:
                    print(
                        f"[DEBUG] Emitting opponent_disconnected to socketId={s.get('socketId')}, name={s.get('name')}")
                    socket.emit('opponent_disconnected', {
                        'roomId': room_id,
                        'playerName': disconnected_name,
                        'waitTime': 90
                    }, to=s.get('socketId'))
                else:
                    if s:
                        print(
                            f"[DEBUG] SKIP seat - socketId={s.get('socketId')}, userId={s.get('userId')}, user_token={user_token}")
        # --- FIX END ---

        connected_count = 0
        seated_count = 0
        if hasattr(game, 'seats'):
            connected_count = len([s for s in game.seats if s is not None and s.get('connected', False)])
            seated_count = len([s for s in game.seats if s is not None])

        if connected_count == 0:

            for token in list(disconnect_timers.keys()):
                if token in disconnect_timers:
                    disconnect_timers[token].cancel()
                    del disconnect_timers[token]

            if room_id in room_deletion_timers:
                room_deletion_timers[room_id].cancel()
                del room_deletion_timers[room_id]

            delay = 5 if seated_count == 0 else 10
            t = eventlet.spawn_after(delay, delete_room, room_id)
            room_deletion_timers[room_id] = t
    else:
        pass


@socket.on("disconnect")
def handle_disconnect():
    process_player_loss(request.sid)
    eventlet.sleep(0.1)
    broadcast_player_list()


@socket.on("leave_room")
def handle_explicit_leave_room(data):
    sender_sid = request.sid
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == sender_sid), None)

    roomId = data.get('roomId')

    found_room = None
    found_lobby = None

    if roomId:
        for lobby in manager.lobbies.values():
            if roomId in lobby.rooms:
                found_room = lobby.rooms[roomId]
                found_lobby = lobby
                break

    if not found_room and user_token and active_sessions[user_token].get('room_id'):
        rid = active_sessions[user_token]['room_id']
        for lobby in manager.lobbies.values():
            if rid in lobby.rooms:
                found_room = lobby.rooms[rid]
                found_lobby = lobby
                roomId = rid
                break

    if found_room and found_lobby:
        if user_token:
            found_lobby.remove_player(roomId, sender_sid, user_token)

        if found_room.game_instance:
            game = found_room.game_instance
            disconnected_name = None

            if hasattr(game, 'seats'):
                for i, seat in enumerate(game.seats):
                    if seat and (seat.get('socketId') == sender_sid or seat.get('userId') == user_token):
                        disconnected_name = seat.get('name', 'OPPONENT')
                        if game.game_state.get('stage') == 'waiting_for_players':
                            game.seats[i] = None
                        else:
                            # --- FIX START ---
                            # Sprawdzamy czy gra zakończona
                            current_stage = game.game_state.get('stage')
                            is_game_over = current_stage in ['game_over', 'finished', 'checkmate', 'draw', 'stalemate',
                                                             'ended']

                            if hasattr(game, 'set_player_connection_status'):
                                game.set_player_connection_status(user_token, False, sid=sender_sid)

                            # Oznaczamy wyjście i wysyłamy powiadomienie TYLKO jeśli gra wciąż trwa
                            if not is_game_over:
                                game.seats[i]['explicitly_left'] = True

                                if user_token and user_token not in disconnect_timers:
                                    timer = eventlet.spawn_after(90, close_room_due_to_timeout, roomId, user_token)
                                    disconnect_timers[user_token] = timer

                                    for s in game.seats:
                                        if s and s.get('socketId') and s.get('userId') != user_token:
                                            emit('opponent_disconnected', {
                                                'roomId': roomId,
                                                'playerName': disconnected_name,
                                                'waitTime': 90
                                            }, to=s.get('socketId'))
                            # --- FIX END ---
                        break

            if isinstance(game, Stratego):
                broadcast_stratego_state(game, roomId, socket)
            else:
                emit('game_state_update', game.get_state(), to=roomId)

            connected_count = 0
            if hasattr(game, 'seats'):
                connected_count = len([s for s in game.seats if s is not None and s.get('connected', False)])

            seated_count = len([s for s in game.seats if s is not None]) if hasattr(game, 'seats') else 0

            if connected_count == 0 or seated_count == 0:

                for token in list(disconnect_timers.keys()):
                    if token in disconnect_timers:
                        disconnect_timers[token].cancel()
                        del disconnect_timers[token]

                if roomId in room_deletion_timers:
                    room_deletion_timers[roomId].cancel()
                    del room_deletion_timers[roomId]

                if seated_count == 0:
                    delete_room(roomId)
                else:
                    t = eventlet.spawn_after(5, delete_room, roomId)
                    room_deletion_timers[roomId] = t

        remaining_players_count = len(found_room.player_tokens)

        if remaining_players_count == 0:
            if roomId in room_deletion_timers:
                room_deletion_timers[roomId].cancel()
                del room_deletion_timers[roomId]
            delete_room(roomId)
        else:

            if found_room.game_instance and hasattr(found_room.game_instance, 'seats'):

                seated_count = len([s for s in found_room.game_instance.seats if s is not None])
                if seated_count > 0:
                    emit('your_active_game', {
                        'roomId': roomId,
                        'gameName': found_room.game_name,
                        'roomName': found_room.room_name
                    }, to=sender_sid)

    if user_token and user_token in active_sessions:
        active_sessions[user_token]['room_id'] = None
        active_sessions[user_token]['connected'] = True

    if found_room is None or not (found_room.game_instance and hasattr(found_room.game_instance, 'seats') and
                                  len([s for s in found_room.game_instance.seats if s is not None]) > 0):
        try:
            emit('your_active_game', None, to=sender_sid)
        except Exception:
            pass

    if found_room:
        socketio_leave_room(roomId)

    eventlet.sleep(0.1)
    broadcast_player_list()


@socket.on("connect")
def handle_connect(auth):
    if not auth: return
    user_token = auth.get('token')
    username = auth.get('username')
    new_sid = request.sid
    session_data = active_sessions.get(user_token)

    if session_data:

        if user_token in disconnect_timers:
            disconnect_timers[user_token].cancel()
            del disconnect_timers[user_token]

        old_room_id = session_data.get('room_id')

        if old_room_id and old_room_id in room_deletion_timers:
            room_deletion_timers[old_room_id].cancel()
            del room_deletion_timers[old_room_id]

        found_room = None
        found_game_name = None
        for game_name, lobby in manager.lobbies.items():
            if old_room_id in lobby.rooms:
                found_room = lobby.rooms[old_room_id]
                found_game_name = game_name
                break

        active_sessions[user_token]['sid'] = new_sid
        active_sessions[user_token]['username'] = username
        active_sessions[user_token]['connected'] = True

        if found_room:

            emit('your_active_game', {
                'roomId': old_room_id,
                'gameName': found_game_name,
                'roomName': found_room.room_name
            })

            active_sessions[user_token]['sid'] = new_sid
        else:
            active_sessions[user_token] = {'sid': new_sid, 'room_id': None, 'username': username, 'connected': True}
            emit('your_active_game', None)
    else:
        if user_token:
            active_sessions[user_token] = {'sid': new_sid, 'room_id': None, 'username': username, 'connected': True}
        emit('your_active_game', None)

    broadcast_player_list()


@socket.on("get_rooms")
def handle_get_rooms(data):
    game_name = data.get('game_name')
    lobby = get_lobby_case_insensitive(game_name)
    if lobby:
        rooms_list = [r.to_dict() for r in lobby.rooms.values()]
        emit('rooms_list', {"game": game_name, "rooms": rooms_list})


@socket.on("create_room")
def handle_create_room(data):
    game_name = data.get('game_name')
    room_name = data.get('room_name')
    max_players = data.get('max_players', 3)

    if str(game_name).lower() == "chess":
        max_players = 2

    password = data.get('password')

    time_control_min = None
    host_color_pref = None
    host_seat_index = None

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
        user_token = data.get('userToken')

    lobby = get_lobby_case_insensitive(game_name)
    if not lobby:
        return

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
        )

        if user_token:
            room.player_tokens.add(user_token)
            if user_token in active_sessions:
                active_sessions[user_token]['room_id'] = room.uuid
            else:
                active_sessions[user_token] = {
                    'sid': host_id,
                    'room_id': room.uuid,
                    'username': 'Host',
                    'connected': True
                }

        join_room(room.uuid)

        if str(game_name).lower() == "battleships":
            if room.game_instance is None:
                room.game_instance = lobby.game_class(room.players)
            game = room.game_instance
            player_name = active_sessions.get(user_token, {}).get("username") or "Host"
            res = game.sit_player(host_id, player_name, 0, user_token)
            if res.get('success'):
                state = get_game_state_safe(game, host_id)
                emit('game_state_update', state, to=host_id)

        emit('room_created', {'room_id': room.uuid, 'game': game_name}, to=host_id)
        broadcast_player_list()

    except Exception:
        import traceback
        traceback.print_exc()


@socket.on("join_room")
def handle_join_game_room(data):
    game_name = data.get('game_name')
    room_id = str(data.get('room_id')).strip() if data.get('room_id') else None
    provided_password = data.get('password')
    current_sid = request.sid

    user_token = next((token for token, d in active_sessions.items() if d['sid'] == current_sid), None)

    if not user_token:
        user_token = data.get('userToken')
        if user_token:
            if user_token not in active_sessions:
                active_sessions[user_token] = {'sid': current_sid, 'room_id': None, 'connected': True}
            else:
                active_sessions[user_token]['sid'] = current_sid
                active_sessions[user_token]['connected'] = True

    if not user_token:
        emit('join_room_response', {'success': False, 'message': 'BLAD AUTORYZACJI'})
        return

    if user_token in disconnect_timers:
        disconnect_timers[user_token].cancel()
        del disconnect_timers[user_token]

    if room_id in room_deletion_timers:
        room_deletion_timers[room_id].cancel()
        del room_deletion_timers[room_id]

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

    is_returning_player = user_token in found_room.player_tokens

    if is_returning_player and user_token in disconnect_timers:
        disconnect_timers[user_token].cancel()
        del disconnect_timers[user_token]

    if room_id in room_deletion_timers:
        room_deletion_timers[room_id].cancel()
        del room_deletion_timers[room_id]

    if found_room.password and not is_returning_player:
        if not provided_password or provided_password != found_room.password:
            emit('join_room_response', {
                'success': False,
                'message': 'WYMAGANE HASLO' if not provided_password else 'BLEDNE HASLO',
                'error_code': 'PASSWORD_REQUIRED'
            })
            return

    room = lobby.join_room(room_id, current_sid, user_token)

    if not room:
        emit('join_room_response', {'success': False, 'message': 'NIE UDALO SIE DOLACZYC DO POKOJU.'})
        return

    join_room(room_id)

    if user_token not in active_sessions:
        active_sessions[user_token] = {'sid': current_sid, 'room_id': room_id, 'connected': True}
    else:
        active_sessions[user_token]['room_id'] = room_id

    room.player_tokens.add(user_token)

    if str(game_name).lower() == "chess":

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

            player_name = active_sessions.get(user_token, {}).get("username") or "Player"

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

            if game.game_state.get("stage") == "waiting_for_players":
                if len(game.seats) >= 2 and game.seats[0] is not None and game.seats[1] is not None:
                    game.start_game()

    emit('join_room_response', {'success': True, 'room_data': room.to_dict()})

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

        state = get_game_state_safe(game, current_sid, user_token=user_token)
        emit('game_state_update', state, to=current_sid)

        if isinstance(game, Battleships):
            for seat in game.seats:
                if seat and seat['socketId']:
                    safe_state = get_game_state_safe(game, seat['socketId'])
                    emit('game_state_update', safe_state, to=seat['socketId'])

        elif isinstance(game, Stratego):

            broadcast_stratego_state(game, room_id, socket)

        else:

            emit('game_state_update', game.get_state(), to=room_id)

    broadcast_player_list()


@socket.on('sit_down')
def handle_sit_down(data):
    room_id = data.get('roomId')
    seat_index = data.get('seatIndex')
    player_name = data.get('playerName')
    player_id = request.sid

    if not player_name: player_name = f"Gracz {player_id[:4]}"
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == player_id), None)

    found_room = None
    found_lobby = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            found_lobby = lobby
            break

    if not found_room: return
    if found_room.game_instance is None:
        found_room.game_instance = found_lobby.game_class(found_room.players)

    game = found_room.game_instance
    res = game.sit_player(player_id, player_name, seat_index, user_token) if user_token else {'success': False,
                                                                                              'msg': 'Auth err'}

    if res['success']:
        if isinstance(game, Stratego):
            broadcast_stratego_state(game, room_id, socket)
        elif isinstance(game, Battleships):

            for seat in game.seats:
                if seat and seat['socketId']:
                    safe_state = get_game_state_safe(game, seat['socketId'])
                    emit('game_state_update', safe_state, to=seat['socketId'])

            if game.game_state.get("stage") == "waiting_for_players":
                if len(game.seats) >= 2 and game.seats[0] is not None and game.seats[1] is not None:
                    game.start_game()

                    for seat in game.seats:
                        if seat and seat['socketId']:
                            safe_state = get_game_state_safe(game, seat['socketId'])
                            emit('game_state_update', safe_state, to=seat['socketId'])
        elif isinstance(game, SetGame):
            emit('game_state_update', game.get_state(), to=room_id)

            if game.game_state.get("stage") == "waiting_for_players":
                seated_count = len([s for s in game.seats if s is not None])
                max_players = found_room.maxPlayers or 4
                if seated_count >= max_players:
                    game.start_game()
                    emit('game_state_update', game.get_state(), to=room_id)
        else:
            emit('game_state_update', game.get_state(), to=room_id)
    else:
        emit('error', {'msg': res['msg']}, to=player_id)


@socket.on('start_game')
def handle_start_game(data):
    room_id = data.get('roomId')
    requesting_player_id = request.sid

    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    if not found_room or found_room.host_id != requesting_player_id or not found_room.game_instance: return

    game = found_room.game_instance
    if isinstance(game, chess) and getattr(found_room, "time_control_min", None):
        game.set_time_control(found_room.time_control_min)
    res = game.start_game()

    if res['success']:
        broadcast_player_list()

        if isinstance(game, Stratego):
            broadcast_stratego_state(game, room_id, socket)
        else:
            for seat in game.seats:
                if seat is not None:
                    player_state = get_game_state_safe(game, seat['socketId'])

                    if 'hand' in seat:
                        player_state['my_hand'] = seat['hand']
                    emit('game_state_update', player_state, to=seat['socketId'])
    else:
        emit('error', {'msg': res['msg']}, to=requesting_player_id)


@socket.on('sync_state')
def handle_sync_state(data):
    room_id = data.get('roomId')
    player_id = request.sid
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == player_id), None)
    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    if found_room and found_room.game_instance:
        game = found_room.game_instance
        state = get_game_state_safe(game, player_id)
        emit('game_state_update', state, to=player_id)
        if user_token and hasattr(game, 'get_player_hand_by_token'):
            hand = game.get_player_hand_by_token(user_token)
            if hand: emit('game_state_update', {'my_hand': hand}, to=player_id)


@socket.on('player_move')
def handle_player_move(data):
    room_id = data.get('roomId')
    move_data = data.get('move')
    player_id = request.sid

    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    if not found_room or not found_room.game_instance: return
    game = found_room.game_instance

    if isinstance(game, Thousand):
        handle_thousand_move(game, found_room, player_id, move_data)
        if game.game_state.get('stage') == 'game_over':
            broadcast_player_list()
            if room_id not in room_deletion_timers:
                t = eventlet.spawn_after(30, delete_room, room_id)
                room_deletion_timers[room_id] = t

    elif isinstance(game, Stratego):
        handle_stratego_move(game, found_room, player_id, move_data, socket)

        if game.game_state.get('stage') == 'game_over':
            broadcast_player_list()

            if room_id not in room_deletion_timers:
                t = eventlet.spawn_after(10, delete_room, room_id)
                room_deletion_timers[room_id] = t

    elif isinstance(game, Battleships):
        res = game.handle_move(player_id, move_data)
        if res['success']:
            for i, seat in enumerate(game.seats):
                if seat and seat['socketId']:
                    state = get_game_state_safe(game, seat['socketId'])
                    emit('game_state_update', state, to=seat['socketId'])

            if len(game.game_state.get('ready_players', [])) == 2:
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
        emit('game_state_update', game.get_state(), to=room_id)

        if game.game_state.get('stage') == 'finished':
            broadcast_player_list()
            if room_id not in room_deletion_timers:
                t = eventlet.spawn_after(30, delete_room, room_id)
                room_deletion_timers[room_id] = t

    else:
        res = game.handle_move(player_id, move_data)
        if res['success']:
            emit('game_state_update', game.get_state(), to=room_id)
        else:
            emit('error', {'msg': res['msg']}, to=player_id)


@socket.on("get_online_players")
def handle_get_online_players():
    players = get_online_players_list()
    emit('online_players_update', players)


@socket.on("send_invite")
def handle_send_invite(data):
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

    if target_session:
        if target_session.get('connected'):
            target_sid = target_session['sid']

            socket.emit('incoming_invite', {
                'hostName': sender_name,
                'gameName': game_name,
                'roomId': sender_room_id
            }, to=target_sid)


@socket.on("get_game_info")
def handle_get_game_info(data):
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
    room_id = data.get('roomId')
    message = data.get('message')
    sender_sid = request.sid

    if not room_id or not message:
        return

    sender_token = next((token for token, d in active_sessions.items() if d['sid'] == sender_sid), None)
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
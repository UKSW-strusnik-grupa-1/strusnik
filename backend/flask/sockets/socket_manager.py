import eventlet
import time

eventlet.monkey_patch()

from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room

from games.handling_multiplayer import LobbyManager, GameType
from games.thousand import Thousand
from games.stratego import Stratego

from sockets.events_thousand import handle_thousand_move, get_thousand_state_for_player

socket = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

manager = LobbyManager()
manager.register_game("Tysiac", GameType.Multiplayer, Thousand)
manager.register_game("Stratego", GameType.Multiplayer, Stratego)

active_sessions = {}
disconnect_timers = {}
room_deletion_timers = {}


def get_game_state_safe(game, player_sid):
    if isinstance(game, Thousand):
        return get_thousand_state_for_player(game, player_sid)
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
        socket.emit('error', {'msg': 'Pokój został zamknięty.'}, to=room_id)
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


def close_room_due_to_timeout(room_id, user_token):
    if user_token in disconnect_timers:
        del disconnect_timers[user_token]
    delete_room(room_id)


def process_player_loss(sid):
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == sid), None)

    room_id = None
    found_room = None

    if user_token and user_token in active_sessions:
        room_id = active_sessions[user_token].get('room_id')

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

        if hasattr(game, 'set_player_connection_status'):
            status_changed = game.set_player_connection_status(user_token, False, sid=sid)

            if status_changed:
                emit('game_state_update', game.get_state(), to=room_id)

                still_seated = False
                if hasattr(game, 'seats'):
                    for s in game.seats:
                        if s and s.get('userId') == user_token:
                            still_seated = True
                            break

                if still_seated and user_token not in disconnect_timers:
                    timer = eventlet.spawn_after(60, close_room_due_to_timeout, room_id, user_token)
                    disconnect_timers[user_token] = timer

        connected_count = 0
        if hasattr(game, 'seats'):
            connected_count = len([s for s in game.seats if s is not None and s.get('connected', True)])

        if connected_count == 0:
            if room_id not in room_deletion_timers:
                t = eventlet.spawn_after(10, delete_room, room_id)
                room_deletion_timers[room_id] = t
    else:
        pass


@socket.on("disconnect")
def handle_disconnect():
    process_player_loss(request.sid)


@socket.on("leave_room")
def handle_explicit_leave_room(data):
    process_player_loss(request.sid)


@socket.on("connect")
def handle_connect(auth):
    if not auth: return
    user_token = auth.get('token')
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
        for lobby in manager.lobbies.values():
            if old_room_id in lobby.rooms:
                found_room = lobby.rooms[old_room_id]
                break

        if found_room:
            join_room(old_room_id)
            if found_room.game_instance:
                game = found_room.game_instance

                if hasattr(game, 'set_player_connection_status'):
                    game.set_player_connection_status(user_token, True, new_sid)
                elif hasattr(game, 'update_player_sid'):
                    game.update_player_sid(user_token, new_sid)

                emit('join_room_response', {'success': True, 'room_data': found_room.to_dict()})

                state = get_game_state_safe(game, new_sid)
                emit('game_state_update', state)
                emit('game_state_update', game.get_state(), to=old_room_id)

                if hasattr(game, 'get_player_hand_by_token'):
                    hand = game.get_player_hand_by_token(user_token)
                    if hand: emit('game_state_update', {'my_hand': hand})
            active_sessions[user_token]['sid'] = new_sid
        else:
            active_sessions[user_token] = {'sid': new_sid, 'room_id': None}
    else:
        if user_token: active_sessions[user_token] = {'sid': new_sid, 'room_id': None}


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
    password = data.get('password')
    host_id = request.sid
    user_token = next((token for token, d in active_sessions.items() if d['sid'] == host_id), None)
    if not user_token: user_token = data.get('userToken')

    lobby = get_lobby_case_insensitive(game_name)
    if not lobby: return

    try:
        room = lobby.create_room(host_id, room_name, game_name, max_players, password)
        if user_token:
            room.player_tokens.add(user_token)
            if user_token in active_sessions:
                active_sessions[user_token]['room_id'] = room.uuid
            else:
                active_sessions[user_token] = {'sid': host_id, 'room_id': room.uuid}
        join_room(room.uuid)
        emit('room_created', {'room_id': room.uuid, 'game': game_name}, to=host_id)
    except Exception:
        import traceback;
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
                active_sessions[user_token] = {'sid': current_sid, 'room_id': None}
            else:
                active_sessions[user_token]['sid'] = current_sid

    if not user_token:
        emit('join_room_response', {'success': False, 'message': 'Błąd autoryzacji'})
        return

    if user_token in disconnect_timers:
        disconnect_timers[user_token].cancel()
        del disconnect_timers[user_token]

    if room_id in room_deletion_timers:
        room_deletion_timers[room_id].cancel()
        del room_deletion_timers[room_id]

    lobby = get_lobby_case_insensitive(game_name)
    if not lobby:
        emit('join_room_response', {'success': False, 'message': f'Lobby gry nie istnieje ({game_name})'})
        return

    found_room = lobby.rooms.get(room_id)

    if not found_room:
        emit('join_room_response', {'success': False, 'message': 'Pokoj nie istnieje lub został usuniety'})
        return

    is_returning_player = user_token in found_room.player_tokens

    if found_room.password and not is_returning_player:
        if not provided_password or provided_password != found_room.password:
            emit('join_room_response', {
                'success': False,
                'message': 'Wymagane hasło' if not provided_password else 'Błędne hasło',
                'error_code': 'PASSWORD_REQUIRED'
            })
            return

    room = lobby.join_room(room_id, current_sid, user_token)

    if room:
        join_room(room_id)
        active_sessions[user_token]['room_id'] = room_id

        if room.game_instance:
            game = room.game_instance

            if hasattr(game, 'set_player_connection_status'):
                game.set_player_connection_status(user_token, True, current_sid)
            elif hasattr(game, 'update_player_sid'):
                game.update_player_sid(user_token, current_sid)

            state = get_game_state_safe(game, current_sid)
            emit('game_state_update', state, to=current_sid)
            emit('game_state_update', game.get_state(), to=room_id)

            if hasattr(game, 'get_player_hand_by_token'):
                hand = game.get_player_hand_by_token(user_token)
                if hand: emit('game_state_update', {'my_hand': hand}, to=current_sid)

        emit('join_room_response', {'success': True, 'room_data': room.to_dict()})
    else:
        emit('join_room_response', {'success': False, 'message': 'Nie udało się dołączyć'})


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
    res = game.start_game()

    if res['success']:
        for seat in game.seats:
            if seat is not None:
                player_state = get_game_state_safe(game, seat['socketId'])
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
            if room_id not in room_deletion_timers:
                t = eventlet.spawn_after(30, delete_room, room_id)
                room_deletion_timers[room_id] = t
    else:
        res = game.handle_move(player_id, move_data)
        if res['success']:
            emit('game_state_update', game.get_state(), to=room_id)
        else:
            emit('error', {'msg': res['msg']}, to=player_id)
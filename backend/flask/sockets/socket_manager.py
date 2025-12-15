from flask import Flask, request
from flask_socketio import SocketIO, emit, join_room, leave_room

from games.handling_multiplayer import LobbyManager, GameType
from games.thousand import Thousand

from games.stratego import Stratego

socket = SocketIO(cors_allowed_origins="*")

manager = LobbyManager()
manager.register_game("Tysiac", GameType.Multiplayer, Thousand)
manager.register_game("Stratego", GameType.Multiplayer, Stratego)

@socket.on("get_rooms")
def handle_get_rooms(data):
    game_name = data.get('game_name')
    lobby = manager.get_lobby(game_name)
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

    lobby = manager.get_lobby(game_name)
    if not lobby:
        print(f"--- [ERROR] Lobby '{game_name}' nieznane. Dostępne: {list(manager.lobbies.keys())}")
        emit('error', {'msg': f'Game {game_name} not found'})
        return

    try:
        room = lobby.create_room(host_id, room_name, game_name, max_players, password)
        join_room(room.uuid)

        emit('room_created', {'room_id': room.uuid, 'game': game_name}, to=host_id)

    except Exception as e:
        print(e)
        import traceback
        traceback.print_exc()


@socket.on("join_room")
def handle_join_game_room(data):

    game_name = data.get('game_name')
    room_id = data.get('room_id')
    player_id = request.sid

    lobby = manager.get_lobby(game_name)
    if not lobby:
        emit('join_room_response', {'success': False, 'message': 'Gra nie istnieje'})
        return

    room = lobby.join_room(room_id, player_id)

    if room:
        join_room(room_id)

        emit('join_room_response', {
            'success': True,
            'room_data': room.to_dict()
        })

        if room.game_instance:
            emit('game_state_update', room.game_instance.get_state(), to=player_id)
    else:
        if room_id not in lobby.rooms:
            reason = "Pokój fizycznie nie istnieje w RAM"
        elif len(lobby.rooms[room_id].players) >= lobby.rooms[room_id].maxPlayers:
            reason = "Pokój jest pełny"
        else:
            reason = "Nieznany błąd"

        emit('join_room_response', {'success': False, 'message': reason})



@socket.on('get_game_state')
def handle_get_game_state(data):
    room_id = data.get('roomId')
    found_room = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            break

    if found_room and found_room.game_instance:
        emit('game_state_update', found_room.game_instance.get_state(), to=room_id)
    else:
        emit('game_state_update', {'seats': [None] * 4}, to=room_id)


@socket.on('sit_down')
def handle_sit_down(data):
    room_id = data.get('roomId')
    seat_index = data.get('seatIndex')
    player_id = request.sid
    player_name = f"Gracz {player_id[:4]}"

    found_room = None
    found_lobby = None
    for lobby in manager.lobbies.values():
        if room_id in lobby.rooms:
            found_room = lobby.rooms[room_id]
            found_lobby = lobby
            break

    if not found_room:
        return

    if found_room.game_instance is None:
        found_room.game_instance = found_lobby.game_class(found_room.players)

    game = found_room.game_instance
    res = game.sit_player(player_id, player_name, seat_index)

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

    if not found_room or not found_room.game_instance:
        return

    game = found_room.game_instance
    res = game.start_game()

    if res['success']:
        public_state = game.get_state()
        emit('game_state_update', public_state, to=room_id)

        for seat in game.seats:
            if seat is not None:
                emit('game_state_update', {'my_hand': seat['hand']}, to=seat['id'])
    else:
        emit('error', {'msg': res['msg']}, to=requesting_player_id)


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

    if not found_room or not found_room.game_instance:
        return

    game = found_room.game_instance
    res = game.handle_move(player_id, move_data)

    if res['success']:
        emit('game_state_update', game.get_state(), to=room_id)
    else:
        emit('error', {'msg': res['msg']}, to=player_id)
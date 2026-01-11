from flask_socketio import emit

def broadcast_stratego_state(game, room_id):
    for seat in game.seats:
        if seat and seat.get('connected'):
            sid = seat['socketId']
            if hasattr(game, 'get_player_view'):
                player_state = game.get_player_view(sid)
                emit('game_state_update', player_state, to=sid)


def handle_stratego_move(game, room, player_id, move_data):
    room_id = room.uuid
    res = game.handle_move(player_id, move_data)

    if res['success']:
        broadcast_stratego_state(game, room_id)
    else:
        emit('error', {'msg': res.get('msg', 'Błąd ruchu')}, to=player_id)


def broadcast_stratego_state(game, room_id, socket_instance=None):
    from flask_socketio import emit
    emit_fn = socket_instance.emit if socket_instance else emit
    
    for seat in game.seats:
        if seat and seat.get('connected'):
            sid = seat['socketId']
            user_token = seat.get('userId')
            if hasattr(game, 'get_player_view'):
                player_state = game.get_player_view(sid, user_token=user_token)
                emit_fn('game_state_update', player_state, to=sid)


def handle_stratego_move(game, room, player_id, move_data, socket_instance=None):
    from flask_socketio import emit
    emit_fn = socket_instance.emit if socket_instance else emit
    
    room_id = room.uuid
    res = game.handle_move(player_id, move_data)

    if res['success']:
        broadcast_stratego_state(game, room_id, socket_instance)
    else:
        emit_fn('error', {'msg': res.get('msg', 'Blad ruchu')}, to=player_id)
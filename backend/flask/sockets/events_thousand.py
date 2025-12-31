import eventlet
from flask_socketio import emit

def get_thousand_state_for_player(game, player_sid):
    state = game.get_state()

    if state['stage'] != 'bidding':
        return state

    seats = game.seats
    seated_count = len([s for s in seats if s])
    if seated_count != 4:
        return state

    dealer_idx = state.get('dealer_idx', 0)
    dealer_seat = seats[dealer_idx]

    if dealer_seat and dealer_seat['socketId'] == player_sid:
        state = state.copy()
        state['stock'] = game.game_state['stock']

    return state

def handle_thousand_move(game, room, player_id, move_data):
    room_id = room.uuid
    prev_stage = game.game_state['stage']

    res = game.handle_move(player_id, move_data)

    if res['success']:
        public_state = game.get_state()
        emit('game_state_update', public_state, to=room_id)

        current_stage = game.game_state['stage']

        seats = game.seats
        seated_count = len([s for s in seats if s is not None])

        if seated_count == 4 and current_stage == 'bidding':
            dealer_idx = game.game_state.get('dealer_idx', 0)
            dealer_seat = seats[dealer_idx]
            if dealer_seat:
                dealer_state = get_thousand_state_for_player(game, dealer_seat['socketId'])
                dealer_state['my_hand'] = []
                emit('game_state_update', dealer_state, to=dealer_seat['socketId'])

        if prev_stage == 'bidding' and current_stage == 'stock_reveal':
            eventlet.sleep(3.0)
            game.assign_stock_to_winner()
            new_state = game.get_state()
            emit('game_state_update', new_state, to=room_id)
            for seat in game.seats:
                if seat is not None:
                    emit('game_state_update', {'my_hand': seat['hand']}, to=seat['socketId'])
            return

        cards_on_table = game.game_state.get('cards_on_table', [])

        trick_size = 3 if seated_count == 4 else seated_count

        if len(cards_on_table) >= trick_size:
            eventlet.sleep(1.5)

            if hasattr(game, 'cleanup_table'):
                game.cleanup_table()

            if hasattr(game, 'is_round_over') and game.is_round_over():
                game.finalize_round()

                state_to_send = game.get_state()
                emit('game_state_update', state_to_send, to=room_id)

                new_dealer_idx = game.game_state.get('dealer_idx')

                final_seated_count = len([s for s in game.seats if s is not None])

                for i, seat in enumerate(game.seats):
                    if seat is not None:
                        p_state = get_thousand_state_for_player(game, seat['socketId'])
                        p_state['my_hand'] = seat['hand']

                        is_bidding = game.game_state['stage'] == 'bidding'
                        is_this_player_dealer = (i == new_dealer_idx)

                        if final_seated_count == 4 and is_this_player_dealer and is_bidding:
                            p_state['stock'] = game.game_state['stock']

                        emit('game_state_update', p_state, to=seat['socketId'])
            else:
                state_to_send = game.get_state()
                emit('game_state_update', state_to_send, to=room_id)

        if not (hasattr(game, 'is_round_over') and game.is_round_over()):
            for seat in game.seats:
                if seat is not None:
                    emit('game_state_update', {'my_hand': seat['hand']}, to=seat['socketId'])
    else:
        emit('error', {'msg': res.get('msg', 'Blad ruchu')}, to=player_id)
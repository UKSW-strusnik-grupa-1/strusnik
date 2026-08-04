from __future__ import annotations

import random
from uuid import uuid4

from flask import Blueprint, jsonify

from api_utils import error_response, json_body, log_exception

blackjack = Blueprint("blackjack", __name__)

games: dict[str, dict] = {}

CARDS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
SUITS = ["H", "D", "C", "S"]
DECK = [card + suit for card in CARDS for suit in SUITS]
HIDDEN_CARD = "cardBack"


def get_card_value(card: str) -> int:
    rank = card[:-1]
    if rank in {"J", "Q", "K", "10"}:
        return 10
    if rank == "A":
        return 11
    return int(rank)


def get_deck_value(cards: list[str]) -> int:
    value = sum(get_card_value(card) for card in cards if card != HIDDEN_CARD)
    aces = sum(card[:-1] == "A" for card in cards if card != HIDDEN_CARD)
    while value > 21 and aces:
        value -= 10
        aces -= 1
    return value


def _draw(game: dict) -> str:
    card = random.choice(tuple(game["deck"]))
    game["deck"].remove(card)
    return card


def _public_state(game: dict, reveal_dealer: bool = False) -> dict:
    dealer_deck = game["dealerDeck"] if reveal_dealer else [game["dealerDeck"][0], HIDDEN_CARD]
    return {
        "uuid": game["uuid"],
        "playerDeck": list(game["playerDeck"]),
        "dealerDeck": list(dealer_deck),
        "playerDeckValue": get_deck_value(game["playerDeck"]),
        "dealerDeckValue": get_deck_value(game["dealerDeck"] if reveal_dealer else [game["dealerDeck"][0]]),
        "bet": game["bet"],
        "gameStatus": game["gameStatus"],
    }


def _finish(game: dict, winner: str, cashout: int) -> dict:
    game["gameStatus"] = "FINISHED"
    state = _public_state(game, reveal_dealer=True)
    state.update({"winner": winner, "cashout": cashout})
    games.pop(game["uuid"], None)
    return state


def _find_game(data: dict):
    game_uuid = data.get("uuid")
    if not isinstance(game_uuid, str) or not game_uuid:
        return None, error_response("Identyfikator gry jest wymagany.", 400)
    game = games.get(game_uuid)
    if not game:
        return None, error_response("Gra nie istnieje lub zostala zakonczona.", 404)
    return game, None


def _resolve_after_player_action(game: dict) -> dict:
    while get_deck_value(game["dealerDeck"]) < 17:
        game["dealerDeck"].append(_draw(game))

    player_score = get_deck_value(game["playerDeck"])
    dealer_score = get_deck_value(game["dealerDeck"])
    bet = game["bet"]

    if dealer_score > 21 or player_score > dealer_score:
        winner, cashout = "PLAYER", bet * 2
    elif player_score < dealer_score:
        winner, cashout = "DEALER", 0
    else:
        winner, cashout = "DRAW", bet

    return _finish(game, winner, cashout)


@blackjack.route("/start", methods=["POST"])
def start_game():
    data = json_body()
    bet = data.get("bet", 0)
    if isinstance(bet, bool):
        return error_response("Zaklad musi byc liczba calkowita.", 400)
    try:
        bet = int(bet)
    except (TypeError, ValueError):
        return error_response("Zaklad musi byc liczba calkowita.", 400)
    if bet < 0 or bet > 2_147_483_647:
        return error_response("Zaklad jest poza dozwolonym zakresem.", 400)

    game_uuid = str(uuid4())
    game = {
        "uuid": game_uuid,
        "deck": set(DECK),
        "playerDeck": [],
        "dealerDeck": [],
        "bet": bet,
        "gameStatus": "STARTED",
    }
    game["playerDeck"] = [_draw(game), _draw(game)]
    game["dealerDeck"] = [_draw(game), _draw(game)]
    games[game_uuid] = game

    response = _public_state(game)
    response.pop("gameStatus", None)
    return jsonify(response), 201


@blackjack.route("/hit", methods=["POST"])
def hit():
    game, error = _find_game(json_body())
    if error:
        return error

    game["playerDeck"].append(_draw(game))
    player_score = get_deck_value(game["playerDeck"])
    if player_score > 21:
        state = _finish(game, "DEALER", 0)
        return jsonify(state), 200

    return jsonify(_public_state(game)), 200


@blackjack.route("/stand", methods=["POST"])
def stand():
    game, error = _find_game(json_body())
    if error:
        return error

    try:
        return jsonify(_resolve_after_player_action(game)), 200
    except Exception as error:
        log_exception("Unable to finish blackjack game", error)
        return error_response("Nie udalo sie zakonczyc gry.", 500)


@blackjack.route("/double", methods=["POST"])
def double_down():
    game, error = _find_game(json_body())
    if error:
        return error

    if len(game["playerDeck"]) != 2:
        return error_response("Podwojenie stawki jest dostepne tylko po rozdaniu poczatkowym.", 400)

    game["bet"] *= 2
    game["playerDeck"].append(_draw(game))

    try:
        if get_deck_value(game["playerDeck"]) > 21:
            return jsonify(_finish(game, "DEALER", 0)), 200
        return jsonify(_resolve_after_player_action(game)), 200
    except Exception as error:
        log_exception("Unable to double blackjack bet", error)
        return error_response("Nie udalo sie podwoic stawki.", 500)

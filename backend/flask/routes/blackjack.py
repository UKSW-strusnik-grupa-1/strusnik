from flask import Blueprint, current_app, request, Response, jsonify, make_response
from uuid import uuid4
import random

blackjack = Blueprint("blackjack", __name__)

games = []

cards = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
suits = ["H", "D", "C", "S"]
deck = [c + s for c in cards for s in suits]
hiddenCard = "cardBack"

def get_deck_value(deck: list[str]):
    value = 0
    aces = 0
    
    for card in deck:
        value += get_card_value(card)
        if card[:-1] == "A":
            aces += 1
            
    while value > 21 and aces > 0:
        value -= 10
        aces -= 1
        
    return value

def get_card_value(card: str):
    card = card[:-1]
    if card in ["J", "Q", "K", "10"]:
        return 10
    elif card == "A":
        return 11
    else:
        return int(card)
    
def is_ace_in_deck(deck: list[str]):
    for card in deck:
        if card[:-1] == "A":
            return True
    return False


def create_deck(deck: set[str]):
    cards = []
    
    for i in range(2):
        card = random.choice(tuple(deck))
        deck.remove(card)
        cards.append(card)
    
    return cards

@blackjack.route("/start", methods=["POST"])
def start_game():
    data = request.json
    bet = 0
    
    if data.get("bet"):
        bet = data.get("bet")
    
    game_uuid = str(uuid4())
    game_deck = set(deck)
    
    player_deck = create_deck(game_deck)
    dealer_deck = create_deck(game_deck)
    
    games.append({
        "uuid": game_uuid,
        "deck": game_deck,
        "playerDeck": player_deck,
        "dealerDeck": dealer_deck,
        "bet": bet,
        "gameStatus": "STARTED",
    })
    
    return jsonify({
        "uuid": game_uuid, 
        "playerDeck": player_deck, 
        "dealerDeck": [dealer_deck[0], hiddenCard],
        "playerDeckValue": get_deck_value(player_deck),
        "dealerDeckValue": get_deck_value([dealer_deck[0]])
    }), 201
    
@blackjack.route("/hit", methods=["POST"])
def hit():
    data = request.json
    game_uuid = data.get("uuid")
    
    if not game_uuid:
        return jsonify({"error": "UUID required."}), 400
    
    game = next((g for g in games if g["uuid"] == game_uuid), None)
    
    if not game:
        return jsonify({"error": "Game not found."}), 404
    
    if game["gameStatus"] == "FINISHED":
        return jsonify({"error": "Game already finished."}), 400
    
    card = random.choice(tuple(game["deck"]))
    game["deck"].remove(card)
    game["playerDeck"].append(card)
    
    player_score = get_deck_value(game["playerDeck"])
    
    if player_score > 21:
        game["gameStatus"] = "FINISHED"
        return jsonify({
            "playerDeck": game["playerDeck"], 
            "playerDeckValue": player_score,
            "dealerDeck": game["dealerDeck"], 
            "dealerDeckValue": get_deck_value(game["dealerDeck"]),
            "winner": "DEALER",
            "cashout": 0,
            "gameStatus": "FINISHED"
        }), 200
    
    return jsonify({
            "playerDeck": game["playerDeck"], 
            "playerDeckValue": get_deck_value(game["playerDeck"])
        }), 200
    
@blackjack.route("/stand", methods=["POST"])
def stand():
    data = request.json
    game_uuid = data.get("uuid")
    
    if not game_uuid:
        return jsonify({"error": "UUID required."}), 400
    
    game = next((g for g in games if g["uuid"] == game_uuid), None)
    
    if not game:
        return jsonify({"error": "Game not found."}), 404
    
    if game["gameStatus"] == "FINISHED":
        return jsonify({"error": "Game already finished."}), 400
    
    while get_deck_value(game["dealerDeck"]) < 17 or (get_deck_value(game["dealerDeck"]) == 17 and is_ace_in_deck(game["dealerDeck"])):
        card = random.choice(tuple(game["deck"]))
        game["deck"].remove(card)
        game["dealerDeck"].append(card)
        
    game["gameStatus"] = "FINISHED"
    player_score = get_deck_value(game["playerDeck"])
    dealer_score = get_deck_value(game["dealerDeck"])
    
    result = ""
    cashout = 0
    bet = game["bet"] or 0
    
    if dealer_score > 21:
        result = "PLAYER"
        cashout = bet * 2
    elif player_score > dealer_score:
        result = "PLAYER"
        cashout = bet * 2
    elif player_score < dealer_score:
        result = "DEALER"
        cashout = 0
    else:
        result = "DRAW"
        cashout = bet
        
    return jsonify({
        "dealerDeck": game["dealerDeck"],
        "dealerDeckValue": get_deck_value(game["dealerDeck"]),
        "winner": result,
        "cashout": cashout,
        "gameStatus": "FINISHED"
    }), 200
        
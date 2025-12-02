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


def create_deck():
    cards = []
    
    for i in range(2):
        cards.append(random.choice(deck))
    
    return cards

@blackjack.route("/start", methods=["POST"])
def start_game():
    data = request.json
    
    game_uuid = str(uuid4())
    player_deck = create_deck()
    dealer_deck = create_deck()
    
    games.append({
        "uuid": game_uuid,
        "playerDeck": player_deck,
        "dealerDeck": dealer_deck,
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
    
    game["playerDeck"].append(random.choice(deck))
    
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
    
    while get_deck_value(game["dealerDeck"]) < 17 or (get_deck_value(game["dealerDeck"]) == 17 and is_ace_in_deck(game["dealerDeck"])):
        game["dealerDeck"].append(random.choice(deck))
    
    return jsonify({
        "dealerDeck": game["dealerDeck"],
        "dealerDeckValue": get_deck_value(game["dealerDeck"]),
    }), 200
        
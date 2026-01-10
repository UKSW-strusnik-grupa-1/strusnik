import random
from typing import List, Dict, Any, Optional
from .base import MultiplayerGame


class Stratego(MultiplayerGame):
    player_range = [2]

    # Rangi i ich siła
    # F - Flaga, B - Bomba, S - Szpieg
    # Siła: im wyższa liczba, tym silniejsza jednostka (z wyjątkami specjalnymi)
    RANKS_STRENGTH = {
        'F': 0, 'B': 100, 'S': 1,
        '2': 2, '3': 3, '4': 4, '5': 5,
        '6': 6, '7': 7, '8': 8, '9': 9, '10': 10
    }

    # Konfiguracja armii (ilość sztuk)
    SETUP_COUNTS = {
        'F': 1, 'B': 6, '10': 1, '9': 1, '8': 2,
        '7': 3, '6': 4, '5': 4, '4': 4, '3': 5,
        '2': 8, 'S': 1
    }

    # Współrzędne jezior (nieprzekraczalne)
    LAKES = [
        (4, 2), (4, 3), (5, 2), (5, 3),
        (4, 6), (4, 7), (5, 6), (5, 7)
    ]

    def __init__(self, players: List[str]) -> None:
        super().__init__(players)
        self.seats = [None] * 2
        # board[row][col] = { 'player': 0/1, 'rank': '...', 'revealed': False }
        self.board = [[None for _ in range(10)] for _ in range(10)]

        self.game_state = {
            "stage": "waiting_for_players",
            "current_player_idx": 0,
            "setup_ready": [False, False],
            "winner": None,
            "last_move": None,
            "turn_count": 0
        }

    def init_board(self) -> Dict[str, Any]:
        return self.get_state()

    # --- Obsługa reconnecta ---
    def set_player_connection_status(self, user_token: str, is_connected: bool, sid: str = None):
        for i, seat in enumerate(self.seats):
            if seat and seat.get('userId') == user_token:
                seat['connected'] = is_connected
                if is_connected and sid:
                    seat['socketId'] = sid
                return True
        return False

    def sit_player(self, player_id: str, player_name: str, seat_index: int, user_token: str) -> Dict[str, Any]:
        if not (0 <= seat_index < 2):
            return {"success": False, "msg": "Nieprawidłowe miejsce."}
        if self.seats[seat_index] is not None:
            return {"success": False, "msg": "Miejsce zajęte."}

        for s in self.seats:
            if s and s.get('userId') == user_token:
                return {"success": False, "msg": "Już siedzisz."}

        self.seats[seat_index] = {
            "socketId": player_id,
            "userId": user_token,
            "name": player_name,
            "connected": True,
            "captured_pieces": []
        }

        if all(s is not None for s in self.seats) and self.game_state['stage'] == 'waiting_for_players':
            self.game_state['stage'] = 'setup'

        return {"success": True}

    def start_game(self) -> Dict[str, Any]:
        if self.game_state['stage'] == 'waiting_for_players' and all(s is not None for s in self.seats):
            self.game_state['stage'] = 'setup'
            return {"success": True}
        return {"success": False, "msg": "Czekamy na graczy."}

    def handle_move(self, player_id: str, move_data: Dict[str, Any]) -> Dict[str, Any]:
        player_idx = self._get_player_idx(player_id)
        if player_idx == -1:
            return {"success": False, "msg": "Nie jesteś graczem."}

        move_type = move_data.get('type')

        if self.game_state['stage'] == 'setup':
            if move_type == 'submit_setup':
                return self._handle_setup_submit(player_idx, move_data.get('pieces'))

        elif self.game_state['stage'] == 'playing':
            if move_type == 'move':
                return self._handle_game_move(player_idx, move_data)

        return {"success": False, "msg": "Nieprawidłowy ruch."}

    def _handle_setup_submit(self, player_idx: int, pieces: List[Dict]) -> Dict[str, Any]:
        if self.game_state['setup_ready'][player_idx]:
            return {"success": False, "msg": "Już zatwierdziłeś armię."}

        valid_rows = range(0, 4) if player_idx == 0 else range(6, 10)
        piece_counts = {k: 0 for k in self.SETUP_COUNTS.keys()}

        if len(pieces) != 40:
            return {"success": False, "msg": f"Musisz ustawić 40 pionków (masz {len(pieces)})."}

        # Czyścimy strefę
        for r in valid_rows:
            for c in range(10):
                if self.board[r][c] and self.board[r][c]['player'] == player_idx:
                    self.board[r][c] = None

        for p in pieces:
            r, c = p['r'], p['c']
            rank = p['rank']

            if r not in valid_rows:
                return {"success": False, "msg": f"Pionek poza strefą (r={r})."}
            if not (0 <= c < 10): return {"success": False, "msg": "Pionek poza planszą."}
            if rank not in piece_counts: return {"success": False, "msg": f"Nieznany pionek {rank}."}
            if self.board[r][c] is not None: return {"success": False, "msg": f"Pole {r},{c} zajęte."}

            piece_counts[rank] += 1
            self.board[r][c] = {'player': player_idx, 'rank': rank, 'revealed': False}

        for rank, count in piece_counts.items():
            if count != self.SETUP_COUNTS[rank]:
                return {"success": False, "msg": f"Błędna liczba pionków {rank}."}

        self.game_state['setup_ready'][player_idx] = True

        if all(self.game_state['setup_ready']):
            self.game_state['stage'] = 'playing'
            self.game_state['current_player_idx'] = 0

        return {"success": True}

    def _handle_game_move(self, player_idx: int, move_data: Dict) -> Dict[str, Any]:
        if player_idx != self.game_state['current_player_idx']:
            return {"success": False, "msg": "Nie Twoja tura."}

        start, end = move_data.get('from'), move_data.get('to')
        r1, c1 = start['r'], start['c']
        r2, c2 = end['r'], end['c']

        piece = self.board[r1][c1]
        if not piece or piece['player'] != player_idx:
            return {"success": False, "msg": "To nie Twój pionek."}

        # Flaga i Bomba nie mogą się ruszać
        if piece['rank'] in ['F', 'B']:
            return {"success": False, "msg": "Ta jednostka jest stacjonarna."}

        # Sprawdzenie czy nie wchodzimy do jeziora
        if (r2, c2) in self.LAKES:
            return {"success": False, "msg": "Nie można wejść do jeziora."}

        dist = abs(r2 - r1) + abs(c2 - c1)

        # --- ZASADA 3: ZWIADOWCA (2) ---
        if piece['rank'] == '2':
            if r1 != r2 and c1 != c2:
                return {"success": False, "msg": "Ruch tylko w linii prostej."}

            # Sprawdzenie ścieżki (czy nic nie blokuje)
            dr = 0 if r1 == r2 else (1 if r2 > r1 else -1)
            dc = 0 if c1 == c2 else (1 if c2 > c1 else -1)
            cr, cc = r1 + dr, c1 + dc

            # Pętla sprawdza pola POŚREDNIE (nie sprawdza pola docelowego r2,c2)
            while (cr, cc) != (r2, c2):
                if self.board[cr][cc] is not None:
                    return {"success": False, "msg": "Droga zablokowana przez inną jednostkę."}
                if (cr, cc) in self.LAKES:
                    return {"success": False, "msg": "Droga zablokowana przez jezioro."}
                cr += dr
                cc += dc

        # --- INNE JEDNOSTKI ---
        elif dist != 1:
            return {"success": False, "msg": "Za daleko. Zwykłe jednostki ruch o 1 pole."}

        # Sprawdzenie celu
        target = self.board[r2][c2]
        if target and target['player'] == player_idx:
            return {"success": False, "msg": "Pole zajęte przez Twoją jednostkę."}

        combat_info = None

        # WALKA
        if target:
            # Rozstrzygnięcie walki (uwzględnia Saper vs Bomba, Szpieg vs Marszałek)
            res = self._resolve_combat(piece['rank'], target['rank'])

            combat_info = {
                'attacker': {'rank': piece['rank'], 'player': player_idx},
                'defender': {'rank': target['rank'], 'player': target['player']},
                'result': res
            }

            piece['revealed'] = True
            target['revealed'] = True

            if res == 'win':
                # Atakujący wygrywa: zajmuje pole obrońcy
                self.board[r2][c2] = piece
                # Sprawdzenie czy zdobyto flagę
                if target['rank'] == 'F':
                    self._end_game(player_idx, "Zdobycie flagi")
            elif res == 'loss':
                # Atakujący przegrywa: znika, obrońca zostaje
                pass
            else:  # draw
                # Obaj giną
                self.board[r2][c2] = None

            # Pole startowe zawsze czyszczone przy ataku (atakujący albo ginie, albo się przesuwa)
            self.board[r1][c1] = None
        else:
            # RUCH NA PUSTE POLE
            self.board[r2][c2] = piece
            self.board[r1][c1] = None

        self.game_state['last_move'] = {'combat': combat_info, 'from': start, 'to': end}

        # Sprawdzenie czy przeciwnik ma ruchy (jeśli nie -> koniec gry)
        opp_idx = 1 - player_idx
        if not self._player_has_moves(opp_idx):
            self._end_game(player_idx, "Przeciwnik zablokowany (brak ruchów)")

        if self.game_state['stage'] == 'playing':
            self.game_state['current_player_idx'] = 1 - self.game_state['current_player_idx']
            self.game_state['turn_count'] += 1

        return {"success": True}

    def _resolve_combat(self, att, deff):
        """
        Zwraca wynik walki z perspektywy ATAKUJĄCEGO:
        'win'  - atakujący wygrywa (obrońca ginie)
        'loss' - atakujący przegrywa (atakujący ginie)
        'draw' - remis (obaj giną)
        """

        # --- ZASADA 1: SZPIEG (S) VS MARSZAŁEK (10) ---
        # Jeśli Szpieg ATAKUJE Marszałka -> Wygrywa Szpieg
        if att == 'S' and deff == '10':
            return 'win'

        # --- ZASADA 2: SAPER (3) VS BOMBA (B) ---
        # Jeśli Saper ATAKUJE Bombę -> Wygrywa Saper (rozbraja)
        if att == '3' and deff == 'B':
            return 'win'

        # Standardowe porównanie siły
        st_att = self.RANKS_STRENGTH[att]
        st_def = self.RANKS_STRENGTH[deff]

        if st_att > st_def: return 'win'
        if st_att < st_def: return 'loss'
        return 'draw'

    def _player_has_moves(self, p_idx):
        # Sprawdza czy gracz ma jakikolwiek legalny ruch
        # (Uproszczone: czy ma ruchome jednostki. Pełna wersja powinna sprawdzać blokady)
        for r in range(10):
            for c in range(10):
                pc = self.board[r][c]
                # Jeśli ma jednostkę, która nie jest Flagą ani Bombą, zakładamy że może mieć ruch
                # (Dla pełnej poprawności należałoby sprawdzić otoczenie każdej jednostki)
                if pc and pc['player'] == p_idx and pc['rank'] not in ['F', 'B']:
                    return True
        return False

    def _end_game(self, winner_idx, reason):
        self.game_state['stage'] = 'game_over'
        self.game_state['winner'] = {'name': self.seats[winner_idx]['name'], 'reason': reason}

    def _get_player_idx(self, sid):
        for i, seat in enumerate(self.seats):
            if seat and seat['socketId'] == sid: return i
        return -1

    def get_state(self) -> Dict[str, Any]:
        return {
            "board": self.board,
            "seats": self.seats,
            "stage": self.game_state['stage'],
            "current_player_idx": self.game_state['current_player_idx'],
            "setup_ready": self.game_state['setup_ready'],
            "last_move": self.game_state.get('last_move'),
            "winner": self.game_state.get('winner')
        }

    # Metoda maskująca widok dla klienta
    def get_player_view(self, player_sid: str):
        state = self.get_state()
        player_idx = self._get_player_idx(player_sid)

        masked = [[None for _ in range(10)] for _ in range(10)]
        for r in range(10):
            for c in range(10):
                p = self.board[r][c]
                if p:
                    pc = p.copy()
                    if state['stage'] != 'game_over':
                        # Ukrywamy rangę jeśli:
                        # 1. To pionek przeciwnika i nie jest jeszcze ujawniony
                        # 2. Jesteśmy obserwatorem (player_idx == -1)
                        if player_idx != -1 and p['player'] != player_idx and not p['revealed']:
                            pc['rank'] = '?'
                        if player_idx == -1 and not p['revealed']:
                            pc['rank'] = '?'
                    masked[r][c] = pc
        state['board'] = masked
        state['my_idx'] = player_idx
        return state
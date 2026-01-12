export type Lang = 'pl' | 'en';

export const I18N = {
	pl: {
		logging_in: {
			greeting: 'WITAJ NA STRUSNIKU!',
			name: 'LOGIN',
			password: 'HASLO',
			login: 'ZALOGUJ SIE',
			register: 'ZAREJESTRUJ SIE',
			guest: 'KONTYNUUJ JAKO GOSC',
		},

		arrow: 'WROC',
		loading: 'LADOWANIE...',

		home: {
			single: 'ZAGRAJ SAMEMU',
			multi: 'ZAGRAJ Z INNYMI',
			rankings: 'RANKINGI',
			logout: 'WYLOGUJ SIE',
		},

		rooms: {
			create: 'STWORZ POKOJ',
			join: 'DOLACZ',
			name: 'NAZWA POKOJU',
			players: 'ILOSC GRACZY',
			password: 'HASLO DO POKOJU',
			wtd_name: 'PODAJ NAZWE POKOJU...',
			wtd_password: 'UTWORZ HASLO...',
			time: 'CZAS TRWANIA PARTII',
			chess_color: {
				choice: 'WYBIERZ CZYM GRASZ',
				white: 'BIALE',
				random: 'LOSOWO',
				black: 'CZARNE',
			},
			lack: 'NIE ZNALEZIONO ZADNEGO POKOJU',
			private: 'POKOJ PRYWATNY',
			authentication: 'WYMAGANE UWIERZYTELNIENIE',
			cancel: 'ANULUJ',
			refresh: 'ODSWIEZ LISTE POKOI',

			// używane na screenie: ROOMS.SEARCH_PLACEHOLDER
			search_placeholder: 'WYSZUKAJ POKOJ...',
		},

		create_room: {
			room_name_label: 'NAZWA POKOJU',
			time_label: 'CZAS TRWANIA PARTII',
			time_5_min: '5 MIN',
			time_10_min: '10 MIN',
			time_15_min: '15 MIN',
			side_label: 'WYBIERZ STRONE',
			password_label: 'HASLO DO POKOJU',
			password_placeholder: 'WPISZ HASLO...',
		},

		invitation: {
			notification: 'OTRZYMALES NOWE ZAPROSZENIE!',
			contents: ' ZAPRASZA CIE DO GRY W: ',
			accept: 'AKCEPTUJ',
			decline: 'ODRZUC',
		},

		chess: {
			enemy: 'PRZECIWNIK',
			you: 'TY',
			draw: 'ZAPROPONUJ REMIS',
			proposed: 'ZAPROPONOWANO REMIS',
			accept: 'ZAAKCEPTUJ REMIS',
			decline: 'ODRZUC REMIS',
			surrender: 'PODDAJ SIE',
			loading: 'LACZENIE Z SERWEREM...',
			back: 'WROC DO POKOI',

			// na screenie: CHESS.HINT.WAITING_OPPONENT
			hint: {
				waiting_opponent: 'CZEKAMY NA PRZECIWNIKA...',
				active: 'GRA TRWA.',
				ended: 'GRA ZAKONCZONA.',
				starting: 'START...',
			},

			end: {
				game_over: 'KONIEC GRY',
				draw: 'REMIS',
				agreement: 'ZGODA',
				stalemate: 'PAT',
				insufficient: 'BRAK MATERIALU',
				time: 'CZAS',
				you_won: 'WYGRALES',
				you_lost: 'PRZEGRALES',
				opponent_time_over: 'PRZECIWNIKOWI SKONCZYL SIE CZAS',
				your_time_over: 'SKONCZYL CI SIE CZAS',
				resignation: 'PODDANIE',
				opponent_resigned: 'PRZECIWNIK SIE PODDAL',
				you_resigned: 'PODDALES SIE',
				checkmate: 'MAT',

				win: 'WYGRALES',
				lose: 'PRZEGRALES',

				opponent_time_out: 'PRZECIWNIKOWI SKONCZYL SIE CZAS',
				you_time_out: 'SKONCZYL CI SIE CZAS',

				insufficient_material: 'BRAK MATERIALU',
				mate: 'MAT',
			},

			error: {
				connection: 'BLAD POLACZENIA',
				generic: 'WYSTAPIL BLAD',
			},
		},

		lobby: {
			create_room_button_bg_alt: 'Przycisk stworzenia pokoju',
		},

		blackjack: {
			// żeby działały klucze typu: BLACKJACK.BALANCE oraz BLACKJACK.START
			balance: 'SALDO',
			start: 'ROZPOCZNIJ',

			dealer: 'KRUPIER',
			you: 'TY',
			actions: {
				hit: 'DOBIERZ',
				stand: 'PASS',
				play_again: 'ZAGRAJ PONOWNIE',
			},
			result: {
				win: 'UDALO CI SIE WYGRAC!',
				lose: 'NIESTETY PRZEGRALES',
				draw: 'REMIS',
				refund: 'ZWROT STAWKI',
			},
		},

		stratego: {
			board: {
				error: {
					title: 'BLAD POLACZENIA',
					no_room_id: 'BLAD: BRAK ID POKOJU.',
					wrong_password: 'BLEDNE HASLO, SPROBUJ PONOWNIE.',
					could_not_join: 'NIE UDALO SIE DOLACZYC DO POKOJU.',
				},
				back_to_lobby: 'WROC DO LOBBY',
				log: {
					socket_error: 'SOCKET ERROR:',
				},
			},
			waiting_room: {
				title: 'POCZEKALNIA',
				waiting: 'OCZEKIWANIE NA GRACZY...',
				room_full: 'POKOJ PELNY',
				min_required_prefix: 'WYMAGANE MIN.',
				start_game: 'START GRY',
				waiting_host: 'OCZEKIWANIE NA HOSTA...',
				waiting_players: 'OCZEKIWANIE NA RESZTE GRACZY...',
				ready: 'GOTOWY',
				join: 'DOLACZ',
				you: 'TY',
			},
		},

		tictactoe: {
			winner: 'ZWYCIEZCA',
			turn: 'KOLEJ GRACZA',
			draw: 'REMIS!',
			new_game: 'NOWA GRA',
		},

		battleships: {
			victory: 'ZWYCIESTWO!',
			winner: 'WYGRAL',
			place_ships: 'USTAW SWOJE STATKI',
			drag_hint: 'PRZECIAGNIJ STATKI NA PLANSZE',
			rotate_hint: 'NACISNIJ R ABY OBROCIC',
			fleet: 'FLOTA',
			progress: 'POSTEP',
			ship_4: '4-MASZTOWIEC',
			ship_3: '3-MASZTOWCE',
			ship_2: '2-MASZTOWCE',
			ship_1: '1-MASZTOWCE',
			cell: 'POLE',
			cells: 'POLA',
			hint_drag: 'PRZECIAGNIJ STATEK NA PLANSZE',
			hint_rotate: 'R - OBROC WYBRANY STATEK',
			hint_remove: 'PRZECIAGNIJ POZA - USUN',
			your_board: 'TWOJA PLANSZA',
			enemy_board: 'PLANSZA PRZECIWNIKA',
			ready: 'GOTOWY!',
			placing: 'USTAWIASZ...',
			enemy_ready: 'PRZECIWNIK GOTOWY!',
			enemy_placing: 'PRZECIWNIK USTAWIA...',
			waiting_enemy: 'CZEKAM NA PRZECIWNIKA...',
			confirm_fight: 'POTWIERDZ I WALCZ!',
			place_all: 'POSTAW WSZYSTKIE STATKI',
			your_turn: 'TWOJA TURA - STRZELAJ!',
			enemy_turn: 'TURA PRZECIWNIKA',
			drag_to_move: 'PRZECIAGNIJ ABY PRZENIESC',
			back_to_lobby: 'WROC DO LOBBY',
			holding: 'TRZYMASZ',
			opponent_left: 'PRZECIWNIK OPUSCIL GRE',
			disconnected: 'ROZLACZYL SIE',
			waiting_reconnect: 'OCZEKIWANIE NA PONOWNE POLACZENIE...',
		},

		common: {
			yes: 'TAK',
			no: 'NIE',
			cancel: 'ANULUJ',
			confirm: 'POTWIERDZ',
			back: 'WROC',
		},

		rankings: {
			title: 'RANKINGI',
			columns: {
				position: 'POZYCJA',
				player: 'GRACZ',
				wins: 'WYGRANE',
				points: 'PUNKTY',
			},
		},

		theme: {
			dark: 'CIEMNY',
			light: 'JASNY',
		},
	},

	en: {
		logging_in: {
			greeting: 'WELCOME TO STRUSNIK!',
			name: 'LOGIN',
			password: 'PASSWORD',
			login: 'LOG IN',
			register: 'REGISTER',
			guest: 'CONTINUE AS GUEST',
		},

		arrow: 'BACK',
		loading: 'LOADING...',

		home: {
			single: 'SINGLEPLAYER',
			multi: 'MULTIPLAYER',
			rankings: 'RANKINGS',
			logout: 'LOG OUT',
		},

		rooms: {
			create: 'CREATE ROOM',
			join: 'JOIN',
			name: 'ROOM NAME',
			players: 'NUMBER OF PLAYERS',
			password: 'PASSWORD',
			wtd_name: 'ENTER A ROOM NAME...',
			wtd_password: 'CREATE A PASSWORD...',
			time: 'DURATION OF THE GAME',
			chess_color: {
				choice: 'SELECT A SIDE',
				white: 'WHITE',
				random: 'RANDOM',
				black: 'BLACK',
			},
			lack: "COULDN'T FIND ANY ROOM",
			private: 'PRIVATE ROOM',
			authentication: 'AUTHENTICATION REQUIRED',
			cancel: 'CANCEL',
			refresh: 'REFRESH ROOMS LIST',

			search_placeholder: 'SEARCH ROOM...',
		},

		create_room: {
			room_name_label: 'ROOM NAME',
			time_label: 'GAME DURATION',
			time_5_min: '5 MIN',
			time_10_min: '10 MIN',
			time_15_min: '15 MIN',
			side_label: 'CHOOSE SIDE',
			password_label: 'ROOM PASSWORD',
			password_placeholder: 'ENTER PASWORD...',
		},

		invitation: {
			notification: "YOU'VE RECEIVED A NEW INVITATION",
			contents: ' INVITES YOU TO PLAY: ',
			accept: 'ACCEPT',
			decline: 'DECLINE',
		},

		chess: {
			enemy: 'OPPONENT',
			you: 'YOU',
			draw: 'OFFER DRAW',
			proposed: 'DRAW OFFERED',
			accept: 'ACCEPT DRAW',
			decline: 'DECLINE DRAW',
			surrender: 'SURRENDER',
			loading: 'CONNECTING TO SERVER...',
			back: 'BACK TO ROOMS',

			hint: {
				waiting_opponent: 'WAITING FOR OPPONENT...',
				active: 'GAME IN PROGRESS.',
				ended: 'GAME ENDED.',
				starting: 'START...',
			},

			end: {
				game_over: 'GAME OVER',
				draw: 'DRAW',
				agreement: 'AGREEMENT',
				stalemate: 'STALEMATE',
				insufficient: 'INSUFFICIENT MATERIAL',
				time: 'TIME',
				you_won: 'YOU WON',
				you_lost: 'YOU LOST',
				opponent_time_over: "OPPONENT'S TIME IS OVER",
				your_time_over: 'YOUR TIME IS OVER',
				resignation: 'RESIGNATION',
				opponent_resigned: 'OPPONENT RESIGNED',
				you_resigned: 'YOU RESIGNED',
				checkmate: 'CHECKMATE',
			},
		},

		lobby: {
			create_room_button_bg_alt: 'Create room button background',
		},

		blackjack: {
			balance: 'BALANCE',
			start: 'START',

			dealer: 'DEALER',
			you: 'YOU',
			actions: {
				hit: 'HIT',
				stand: 'STAND',
				play_again: 'PLAY AGAIN',
			},
			result: {
				win: 'YOU WON!',
				lose: 'YOU LOST',
				draw: 'DRAW',
				refund: 'BET REFUNDED',
			},
		},

		stratego: {
			board: {
				error: {
					title: 'CONNECTION ERROR',
					no_room_id: 'ERROR: MISSING ROOM ID.',
					wrong_password: 'WRONG PASSWORD, TRY AGAIN.',
					could_not_join: "COULDN'T JOIN THE ROOM.",
				},
				back_to_lobby: 'BACK TO LOBBY',
				log: {
					socket_error: 'SOCKET ERROR:',
				},
			},
			waiting_room: {
				title: 'WAITING ROOM',
				waiting: 'WAITING FOR PLAYERS...',
				room_full: 'ROOM IS FULL',
				min_required_prefix: 'MIN REQUIRED:',
				start_game: 'START GAME',
				waiting_host: 'WAITING FOR HOST...',
				waiting_players: 'WAITING FOR OTHER PLAYERS...',
				ready: 'READY',
				join: 'JOIN',
				you: 'YOU',
			},
		},

		tictactoe: {
			winner: 'WINNER',
			turn: 'PLAYER TURN',
			draw: 'DRAW!',
			new_game: 'NEW GAME',
		},

		battleships: {
			victory: 'VICTORY!',
			winner: 'WINNER',
			place_ships: 'PLACE YOUR SHIPS',
			drag_hint: 'DRAG SHIPS TO THE BOARD',
			rotate_hint: 'PRESS R TO ROTATE',
			fleet: 'FLEET',
			progress: 'PROGRESS',
			ship_4: '4-MAST SHIP',
			ship_3: '3-MAST SHIPS',
			ship_2: '2-MAST SHIPS',
			ship_1: '1-MAST SHIPS',
			cell: 'CELL',
			cells: 'CELLS',
			hint_drag: 'DRAG SHIP TO THE BOARD',
			hint_rotate: 'R - ROTATE SELECTED SHIP',
			hint_remove: 'DRAG OUTSIDE - REMOVE',
			your_board: 'YOUR BOARD',
			enemy_board: 'ENEMY BOARD',
			ready: 'READY!',
			placing: 'PLACING...',
			enemy_ready: 'ENEMY READY!',
			enemy_placing: 'ENEMY PLACING...',
			waiting_enemy: 'WAITING FOR ENEMY...',
			confirm_fight: 'CONFIRM AND FIGHT!',
			place_all: 'PLACE ALL SHIPS',
			your_turn: 'YOUR TURN - FIRE!',
			enemy_turn: 'ENEMY TURN',
			drag_to_move: 'DRAG TO MOVE',
			back_to_lobby: 'BACK TO LOBBY',
			holding: 'HOLDING',
			opponent_left: 'OPPONENT LEFT THE GAME',
			disconnected: 'DISCONNECTED',
			waiting_reconnect: 'WAITING FOR RECONNECTION...',
		},

		common: {
			yes: 'YES',
			no: 'NO',
			cancel: 'CANCEL',
			confirm: 'CONFIRM',
			back: 'BACK',
		},

		rankings: {
			title: 'RANKINGS',
			columns: {
				position: 'POSITION',
				player: 'PLAYER',
				wins: 'WINS',
				points: 'POINTS',
			},
		},

		theme: {
			dark: 'DARK',
			light: 'LIGHT',
		},
	},
} as const;

export function t(lang: Lang, key: string): string {
	const parts = key.split('.');
	let cur: any = I18N[lang];

	for (const raw of parts) {
		if (cur == null) return key;

		if (raw in cur) {
			cur = cur[raw];
			continue;
		}

		const low = raw.toLowerCase();
		if (low in cur) {
			cur = cur[low];
			continue;
		}

		const up = raw.toUpperCase();
		if (up in cur) {
			cur = cur[up];
			continue;
		}

		return key;
	}

	return typeof cur === 'string' ? cur : key;
}

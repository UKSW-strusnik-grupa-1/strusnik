export type Lang = 'pl' | 'en';

export const I18N = {
	pl: {
		games: {
			chess: "SZACHY",
			stratego: "STRATEGO",
			tysiac: "TYSIAC",
			battleships: "STATKI",
			set: "SET",
			blackjack: "BLACKJACK",
			snake: "SNAKE",
			tictactoe: "KOLKO I KRZYZYK",
		},

		common: {
			yes: 'TAK',
			no: 'NIE',
			cancel: 'ANULUJ',
			confirm: 'POTWIERDZ',
			back: 'WROC',
			opponent_disconnected: 'PRZECIWNIK SIE ROZLACZYL',
			waiting_reconnect: 'OCZEKIWANIE NA POLACZENIE',
		},

		logging_in: {
			greeting: 'WITAJ NA STRUSNIKU!',
			register_title: 'REJESTRACJA',
			name: 'LOGIN',
			password: 'HASLO',
			confirm_password: 'POTWIERDZ HASLO',
			login: 'ZALOGUJ SIE',
			register: 'ZAREJESTRUJ SIE',
			guest: 'KONTYNUUJ JAKO GOSC',
			back_to_login: 'POWROT DO LOGOWANIA',
			passwords_dont_match: 'HASLA NIE SA TAKIE SAME',
			register_success: 'REJESTRACJA UDANA! MOZESZ SIE ZALOGOWAC.',
		},

		arrow: 'WROC',
		loading: 'LADOWANIE...',

		home: {
			single: 'ZAGRAJ SAMEMU',
			multi: 'ZAGRAJ Z INNYMI',
			rankings: 'RANKINGI',
			profile: 'PROFIL',
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

			opponent_disconnected: 'PRZECIWNIK SIE ROZLACZYL',
			waiting_for_reconnect: 'OCZEKIWANIE NA POLACZENIE',
		},

		lobby: {
			create_room_button_bg_alt: 'PRZYCISK STWORZENIA POKOJU',
			active_game: 'MASZ AKTYWNA GRE',
			rejoin: 'DOLACZ',
			dismiss: 'ODRZUC',
			leave_game: 'OPUSC GRE',
			leave_game_confirm:
				'CZY NA PEWNO OPUSCIC GRE? NIE BEDZIESZ MOGL WROCIC PRZEZ BANER.',
		},

		snake: {
			score: 'WYNIK',
			play: 'GRAJ',
			play_again: 'ZAGRAJ PONOWNIE',
			submitting: '...',
			in_progress: 'W TRAKCIE GRY',
		},

		blackjack: {
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
					socket_error: 'BLAD SOCKET:',
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

			setup: {
				waiting_opponent: 'CZEKAM NA PRZECIWNIKA...',
			},

			game_over_title: 'KONIEC GRY',
			winner_label: 'WYGRAL',
			back_to_lobby: 'WROC DO LOBBY',
			combat_result_title: 'WYNIK WALKI',
			draw_result: 'REMIS',
			win_result: 'WYGRALES',
			lose_result: 'PRZEGRALES',
			your_turn: 'TWOJA TURA',
			opponent_turn: 'TURA PRZECIWNIKA',
			opponent_disconnected: 'PRZECIWNIK SIE ROZLACZYL',
			waiting_reconnect: 'OCZEKIWANIE NA POLACZENIE',
		},

		tictactoe: {
			winner: 'ZWYCIEZCA',
			turn: 'KOLEJ GRACZA',
			draw: 'REMIS!',
			new_game: 'NOWA GRA',
		},

		thousand: {
			you: 'TY',

			waiting_room: {
				title: 'POCZEKALNIA',
				waiting: 'OCZEKIWANIE NA GRACZY...',
				room_full: 'POKOJ PELNY',
				min_required: 'WYMAGANE MIN.',
				start_game: 'START GRY',
				waiting_host: 'OCZEKIWANIE NA HOSTA...',
				waiting_players: 'OCZEKIWANIE NA RESZTE GRACZY...',
				ready: 'GOTOWY',
			},

			board: {
				error: {
					title: 'BLAD POLACZENIA',
					no_room_id: 'BLAD: BRAK ID POKOJU.',
					wrong_password: 'BLEDNE HASLO, SPROBUJ PONOWNIE.',
					could_not_join: 'NIE UDALO SIE DOLACZYC DO POKOJU.',
				},
				back_to_lobby: 'WROC DO LOBBY',
				room_id_label: 'ID POKOJU',
				log: {
					socket_error: 'BLAD SOCKET:',
				},
			},

			disconnected: 'PRZECIWNIK SIE ROZLACZYL',
			opponent_disconnected: 'GRACZ SIE ROZLACZYL',
			waiting_reconnect: 'OCZEKIWANIE NA POLACZENIE',

			log: {
				game_error: 'BLAD GRY:',
				no_server_response_distribute: 'BRAK ODPOWIEDZI SERWERA DLA ROZDANIA',
				no_server_response_move: 'BRAK ODPOWIEDZI SERWERA DLA RUCHU',
			},

			alert: {
				game_ended_timeout: 'GRA ZAKONCZONA Z POWODU LIMITU CZASU',
			},

			empty: 'OCZEKIWANIE NA START GRY...',
			pausing: '(PAUZA)',
			points_short: 'PKT',
			in_round: 'W RUNDZIE',
			game_over: 'KONIEC GRY',
			winner_label: 'ZWYCIEZCA',
			score_label: 'WYNIK',
			back_to_lobby: 'WROC DO LOBBY',

			flying_card_alt: 'LECACA KARTA',
			trump: 'ATUT',
			dealer: 'ROZDAJACY',
			your_preview: 'TWOJE KARTY',
			stock_hidden_alt: 'UKRYTY STOS',
			stake: 'STAWKA',
			table_card_alt: 'KARTA NA STOLE',

			status: 'STATUS',
			observing: 'OBSERWUJESZ',
			your_turn: 'TWOJA TURA',
			wait: 'OCZEKIWANIE...',
			bid: 'LICYTUJ',
			pass: 'PAS',
			your_game: 'TWOJA GRA',
			confirm: 'POTWIERDZ',
			player_setting_score: 'GRACZ USTAWIA WYNIK...',
			fetching_stock: 'POBIERANIE STOSU...',
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
			waiting_room_title: 'POCZEKALNIA',
			waiting_for_players: 'OCZEKIWANIE NA GRACZY...',
			room_full_message: 'POKOJ PELNY',
			waiting_for_host: 'OCZEKIWANIE NA HOSTA...',
			waiting_for_others: 'OCZEKIWANIE NA RESZTE GRACZY...',
		},

		set: {
			error: {
				title: 'BLAD POLACZENIA',
				no_room_id: 'BLAD: BRAK ID POKOJU.',
				wrong_password: 'BLEDNE HASLO, SPROBUJ PONOWNIE.',
				could_not_join: 'NIE UDALO SIE DOLACZYC DO POKOJU.',
			},
			back_to_lobby: 'WROC DO LOBBY',
			room_id_label: 'ID POKOJU',
			waiting_for_players: 'OCZEKIWANIE NA GRACZY',
			seats: 'MIEJSCA',
			connected: 'POLACZONY',
			disconnected: 'ROZLACZONY',
			sit_here: 'USIADZ TUTAJ',
			auto_start_info: 'GRA ROZPOCZNIE SIE AUTOMATYCZNIE GDY DOLACZY {count} GRACZY',
			start_game: 'ROZPOCZNIJ GRE',
			cards_remaining: 'KART W TALII',
			claim_set: 'ZGLOS SET',
			no_set: 'NIE MA SETA',
			game_over: 'KONIEC GRY!',
			winner: 'ZWYCIEZCA',
			draw: 'REMIS',
			final_scores: 'WYNIKI KONCOWE',
			points: 'PKT',
			opponent_disconnected: '{name} ROZLACZYL SIE. OCZEKIWANIE: {time}S',
			opponent_disconnected_short: 'GRACZ SIE ROZLACZYL',
			waiting_reconnect: 'OCZEKIWANIE NA POLACZENIE',
			you: 'TY',
			ready: 'GOTOWY',
			join: 'DOLACZ',
			room_full: 'POKOJ PELNY - ROZPOCZYNANIE...',
			min_required: 'MIN. 2 GRACZY',
			waiting_host: 'OCZEKIWANIE NA HOSTA...',
			waiting_players: 'OCZEKIWANIE NA GRACZY...',
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

		profile: {
			title: 'PROFIL',
			member_since: 'CZLONEK OD',
			last_login: 'OSTATNIE LOGOWANIE',
			multiplayer_stats: 'STATYSTYKI MULTIPLAYER',
			singleplayer_stats: 'STATYSTYKI SINGLEPLAYER',
			total_wins: 'WSZYSTKIE WYGRANE',
			wins: 'WYGRANYCH',
			best_score: 'NAJLEPSZY WYNIK',
			games_played: 'ROZEGRANYCH GIER',
			error: {
				not_logged_in: 'MUSISZ BYC ZALOGOWANY',
				fetch_failed: 'NIE UDALO SIE POBRAC DANYCH',
				network: 'BLAD SIECI',
			},
		},
	},

	en: {
		games: {
			chess: "CHESS",
			stratego: "STRATEGO",
			tysiac: "THOUSAND",
			battleships: "BATTLESHIPS",
			set: "SET",
			blackjack: "BLACKJACK",
			snake: "SNAKE",
			tictactoe: "TIC TAC TOE",
		},

		common: {
			yes: 'YES',
			no: 'NO',
			cancel: 'CANCEL',
			confirm: 'CONFIRM',
			back: 'BACK',
			opponent_disconnected: 'OPPONENT DISCONNECTED',
			waiting_reconnect: 'WAITING FOR RECONNECTION',
		},

		logging_in: {
			greeting: 'WELCOME TO STRUSNIK!',
			register_title: 'REGISTRATION',
			name: 'LOGIN',
			password: 'PASSWORD',
			confirm_password: 'CONFIRM PASSWORD',
			login: 'LOG IN',
			register: 'REGISTER',
			guest: 'CONTINUE AS GUEST',
			back_to_login: 'BACK TO LOGIN',
			passwords_dont_match: 'PASSWORDS DO NOT MATCH',
			register_success: 'REGISTRATION SUCCESSFUL! YOU CAN NOW LOG IN.',
		},

		arrow: 'BACK',
		loading: 'LOADING...',

		home: {
			single: 'SINGLEPLAYER',
			multi: 'MULTIPLAYER',
			rankings: 'RANKINGS',
			profile: 'PROFILE',
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

			opponent_disconnected: 'OPPONENT DISCONNECTED',
			waiting_for_reconnect: 'WAITING FOR RECONNECTION',

			error: {
				connection: 'CONNECTION ERROR',
				generic: 'AN ERROR OCCURRED',
			},
		},

		lobby: {
			create_room_button_bg_alt: 'CREATE ROOM BUTTON BACKGROUND',
			active_game: 'YOU HAVE AN ACTIVE GAME',
			rejoin: 'REJOIN',
			dismiss: 'DISMISS',
			leave_game: 'LEAVE GAME',
			leave_game_confirm:
				'LEAVE THE GAME PERMANENTLY? YOU WILL NOT BE ABLE TO RETURN VIA THE BANNER.',
		},

		snake: {
			score: 'SCORE',
			play: 'PLAY',
			play_again: 'PLAY AGAIN',
			submitting: '...',
			in_progress: 'IN GAME',
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

			setup: {
				waiting_opponent: 'WAITING FOR OPPONENT...',
			},

			game_over_title: 'GAME OVER',
			winner_label: 'WINNER',
			back_to_lobby: 'BACK TO LOBBY',
			combat_result_title: 'COMBAT RESULT',
			draw_result: 'DRAW',
			win_result: 'YOU WON',
			lose_result: 'YOU LOST',
			your_turn: 'YOUR TURN',
			opponent_turn: 'OPPONENT TURN',
			opponent_disconnected: 'OPPONENT DISCONNECTED',
			waiting_reconnect: 'WAITING FOR RECONNECTION',
		},

		tictactoe: {
			winner: 'WINNER',
			turn: 'PLAYER TURN',
			draw: 'DRAW!',
			new_game: 'NEW GAME',
		},

		thousand: {
			you: 'YOU',

			waiting_room: {
				title: 'WAITING ROOM',
				waiting: 'WAITING FOR PLAYERS...',
				room_full: 'ROOM IS FULL',
				min_required: 'MIN REQUIRED:',
				start_game: 'START GAME',
				waiting_host: 'WAITING FOR HOST...',
				waiting_players: 'WAITING FOR OTHER PLAYERS...',
				ready: 'READY',
			},

			board: {
				error: {
					title: 'CONNECTION ERROR',
					no_room_id: 'ERROR: MISSING ROOM ID.',
					wrong_password: 'WRONG PASSWORD, TRY AGAIN.',
					could_not_join: "COULDN'T JOIN THE ROOM.",
				},
				back_to_lobby: 'BACK TO LOBBY',
				room_id_label: 'ROOM ID',
				log: {
					socket_error: 'SOCKET ERROR:',
				},
			},

			disconnected: 'OPPONENT DISCONNECTED',
			opponent_disconnected: 'PLAYER DISCONNECTED',
			waiting_reconnect: 'WAITING FOR RECONNECTION',

			log: {
				game_error: 'GAME ERROR:',
				no_server_response_distribute: 'NO SERVER RESPONSE FOR DISTRIBUTE',
				no_server_response_move: 'NO SERVER RESPONSE FOR MOVE',
			},

			alert: {
				game_ended_timeout: 'GAME ENDED DUE TO TIMEOUT',
			},

			empty: 'WAITING FOR GAME TO START...',
			pausing: '(OBSERVING)',
			points_short: 'PTS',
			in_round: 'IN ROUND',
			game_over: 'GAME OVER',
			winner_label: 'WINNER',
			score_label: 'SCORE',
			back_to_lobby: 'BACK TO LOBBY',

			flying_card_alt: 'FLYING CARD',
			trump: 'TRUMP',
			dealer: 'DEALER',
			your_preview: 'YOUR CARDS',
			stock_hidden_alt: 'HIDDEN STOCK',
			stake: 'STAKE',
			table_card_alt: 'CARD ON TABLE',

			status: 'STATUS',
			observing: 'OBSERVING',
			your_turn: 'YOUR TURN',
			wait: 'WAITING...',
			bid: 'BID',
			pass: 'PASS',
			your_game: 'YOUR GAME',
			confirm: 'CONFIRM',
			player_setting_score: 'PLAYER IS SETTING SCORE...',
			fetching_stock: 'FETCHING STOCK...',
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
			waiting_room_title: 'WAITING ROOM',
			waiting_for_players: 'WAITING FOR PLAYERS...',
			room_full_message: 'ROOM FULL',
			waiting_for_host: 'WAITING FOR HOST...',
			waiting_for_others: 'WAITING FOR OTHER PLAYERS...',
		},

		set: {
			error: {
				title: 'CONNECTION ERROR',
				no_room_id: 'ERROR: MISSING ROOM ID.',
				wrong_password: 'WRONG PASSWORD, TRY AGAIN.',
				could_not_join: "COULDN'T JOIN THE ROOM.",
			},
			back_to_lobby: 'BACK TO LOBBY',
			room_id_label: 'ROOM ID',
			waiting_for_players: 'WAITING FOR PLAYERS',
			seats: 'SEATS',
			connected: 'CONNECTED',
			disconnected: 'DISCONNECTED',
			sit_here: 'SIT HERE',
			auto_start_info: 'GAME WILL START AUTOMATICALLY WHEN {count} PLAYERS JOIN',
			start_game: 'START GAME',
			cards_remaining: 'CARDS IN DECK',
			claim_set: 'CLAIM SET',
			no_set: 'NO SET',
			game_over: 'GAME OVER!',
			winner: 'WINNER',
			draw: 'DRAW',
			final_scores: 'FINAL SCORES',
			points: 'PTS',
			opponent_disconnected: '{name} DISCONNECTED. WAITING: {time}S',
			opponent_disconnected_short: 'PLAYER DISCONNECTED',
			waiting_reconnect: 'WAITING FOR RECONNECTION',
			you: 'YOU',
			ready: 'READY',
			join: 'JOIN',
			room_full: 'ROOM FULL - STARTING...',
			min_required: 'MIN. 2 PLAYERS',
			waiting_host: 'WAITING FOR HOST...',
			waiting_players: 'WAITING FOR PLAYERS...',
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

		profile: {
			title: 'PROFILE',
			member_since: 'MEMBER SINCE',
			last_login: 'LAST LOGIN',
			multiplayer_stats: 'MULTIPLAYER STATS',
			singleplayer_stats: 'SINGLEPLAYER STATS',
			total_wins: 'TOTAL WINS',
			wins: 'WINS',
			best_score: 'BEST SCORE',
			games_played: 'GAMES PLAYED',
			error: {
				not_logged_in: 'YOU MUST BE LOGGED IN',
				fetch_failed: 'FAILED TO FETCH DATA',
				network: 'NETWORK ERROR',
			},
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
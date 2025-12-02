import { Game } from "./game";

export interface lobbyRoom {
    id: number;
    name: string;
    game: Game;
    currentPlayers: number;
    maxPlayers: number;
    password?: string;
}
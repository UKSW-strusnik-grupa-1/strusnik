'use client';

import ReturnArrow from "../components/lobby/returnArrow";
import Card from "../components/menu/card";
import CardContainer from "../components/menu/cardContainer";
import ActiveGameBanner from "../components/lobby/ActiveGameBanner";
import { useSocket } from "../hooks/useSocket";

export default function SingleplayerGamesPage() {
    const { activeGame, setActiveGame } = useSocket();

    return (
        <div>
            <ReturnArrow href="/" />

            {/* Banner powrotu do aktywnej gry multiplayer */}
            {activeGame && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                    <ActiveGameBanner
                        gameName={activeGame.gameName}
                        roomId={activeGame.roomId}
                        roomName={activeGame.roomName}
                        onDismiss={() => setActiveGame(null)}
                    />
                </div>
            )}

            <CardContainer>
                <Card imgSrc='/gameTiles/tile_blackjack.png' gameName='Blackjack' />
                <Card imgSrc='/gameTiles/tile_snake.png' gameName='Snake' />
                <Card imgSrc='/gameTiles/tile_tictactoe.png' gameName='TicTacToe' />
            </CardContainer>
        </div>
    )
}

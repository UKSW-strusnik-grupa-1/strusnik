'use client';

import ReturnArrow from "../components/lobby/returnArrow";
import Card from "../components/menu/card";
import CardContainer from "../components/menu/cardContainer";
import ActiveGameBanner from "../components/lobby/ActiveGameBanner";
import { useSocket } from "../hooks/useSocket";

export default function MultiplayerGamesPage() {
    const { activeGame, setActiveGame } = useSocket();

    return (
        <div>
            <ReturnArrow href="/" />

            {/* Banner powrotu do aktywnej gry */}
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
                <Card imgSrc='/gameTiles/tile_tysiac.png' gameName='Tysiac' />
                <Card imgSrc='/gameTiles/tile_stratego.png' gameName='Stratego' />
                <Card imgSrc='/gameTiles/tile_chess.png' gameName='Chess' />
                <Card imgSrc='/gameTiles/tile_battleships.png' gameName='Battleships' />
                <Card imgSrc='/gameTiles/tile_set.png' gameName='Set' />
            </CardContainer>
        </div>
    )
}

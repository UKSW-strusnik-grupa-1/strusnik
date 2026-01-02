import ReturnArrow from "../components/lobby/returnArrow";
import Card from "../components/menu/card";
import CardContainer from "../components/menu/cardContainer";

export default function SingleplayerGamesPage() {
    return (
        <div>
            <ReturnArrow href="/"/>
            <CardContainer>
                <Card imgSrc='/gameTiles/tile_blackjack.png' gameName='Blackjack'/>
                <Card imgSrc='/gameTiles/tile_snake.png' gameName='Snake'/>
            </CardContainer>
        </div>
    )
}

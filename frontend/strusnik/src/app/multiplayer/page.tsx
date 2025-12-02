import ReturnArrow from "../components/lobby/returnArrow";
import Card from "../components/menu/card";
import CardContainer from "../components/menu/cardContainer";

export default function MultiplayerGamesPage() {
    return (
        <div>
            <ReturnArrow href="/"/>
            <CardContainer>
                <Card imgSrc='/gameTiles/tile_stratego.png' gameName='Stratego'/>
                <Card imgSrc='/gameTiles/tile_stratego.png' gameName='Tysiac'/>
            </CardContainer>
        </div>
    )
}

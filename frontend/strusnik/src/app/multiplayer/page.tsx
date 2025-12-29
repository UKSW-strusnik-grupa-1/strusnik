import ReturnArrow from "../components/lobby/returnArrow";
import Card from "../components/menu/card";
import CardContainer from "../components/menu/cardContainer";

export default function MultiplayerGamesPage() {
    return (
        <div>
            <ReturnArrow href="/"/>
            <CardContainer>
                <Card imgSrc='/gameTiles/tile_tysiac.webp' gameName='Tysiac'/>
                <Card imgSrc='/gameTiles/tile_stratego.webp' gameName='Stratego'/>
            </CardContainer>
        </div>
    )
}

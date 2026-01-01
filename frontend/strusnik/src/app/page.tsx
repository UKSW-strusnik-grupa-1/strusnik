import Button from "./components/main/button";
import Card from "./components/menu/card";

export default function HomePage() {
    return (
        <div className='relative w-full h-screen flex items-center justify-center'>
            <img
                alt="Tło"
                src="/main/background.png"
                className="absolute w-full h-full object-cover -z-10"
            />

            <div className="z-10 flex flex-col gap-3">
                <Button 
                    alt="Gry jednoosobowe" 
                    text="Zagraj samemu" 
                    title="(Gry singleplayer)" 
                    href="/singleplayer"
                />
                <Button 
                    alt="Gry wieloosobowe" 
                    text="Zagraj z innymi"
                    title="(Gry multiplayer)"
                    href="/multiplayer" 
                    active={true} 
                    inactiveText="Tryb multiplayer jest nieaktywny."
                />
                <Button 
                    alt="Rankingi" 
                    text="Rankingi"
                    href="/rankings"
                    active={true}
                    inactiveText="Rankingi sa nieaktywne."    
                />
                <span 
                    className="text-center font-bold cursor-pointer transition-all hover:brightness-75">
                    Wyloguj
                </span>
            </div>

        </div>
    )
}

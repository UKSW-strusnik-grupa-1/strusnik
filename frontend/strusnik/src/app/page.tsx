import Button from "./components/main/button";

export default function HomePage() {
  return (
    <main className="center">
      <nav className="menu-cta" aria-label="glowne menu">
        <Button
          alt="gry jednoosobowe"
          text="ZAGRAJ SAMEMU"
          href="/singleplayer"
        />
        <Button
          alt="gry wieloosobowe"
          text="ZAGRAJ Z INNYMI"
          href="/multiplayer"
        />
        <Button 
            alt="rankingi" 
            text="RANKINGI"
            href="/rankings"
        />
        <button type="button" className="menu-logout">
          WYLOGUJ
        </button>
      </nav>
    </main>
  );
}

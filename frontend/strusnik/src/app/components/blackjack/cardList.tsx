import { useBlackjack } from "@/app/hooks/useBlackjack";
import React from "react";
import GameCard from "./gameCard";

interface CardListProps {
  dealerDeck: string[],
  dealerDeckValue: number | string,
  playerDeck: string[],
  playerDeckValue: number,
  hit: () => void,
  stand: () => void,
}

export default function CardList({dealerDeck, dealerDeckValue = 0, playerDeck, playerDeckValue = 0, hit, stand} : CardListProps) {
  return (
    <div className="flex flex-row h-full w-full">
      <div className="w-full flex flex-col items-center justify-start pt-32 pb-4">
        <p className="text-white font-bold text-sm uppercase tracking-wider mb-2">
          Karty krupiera (wartosc: {dealerDeckValue})
        </p>
        <div className="flex flex-row flex-wrap gap-4 min-h-48 max-w-xl">
          {dealerDeck.map((card, index) => {
            return (
              <div key={card + "-" + index}>
                <GameCard cardName={card} className="w-30" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full grow flex flex-col items-center justify-start pt-32">
        <p className="text-white font-bold text-sm uppercase mb-2">
          Twoje karty (wartosc: {playerDeckValue})
        </p>
        <div className="flex flex-row flex-wrap gap-4 mb-2 min-h-48 max-w-xl">
          {playerDeck.map((card, index) => {
            return (
              <div key={card + "-" + index}>
                <GameCard cardName={card} className="w-30" />
              </div>
            );
          })}
        </div>
        <div className="flex flex-row gap-4">
          <div
            className="relative w-20 flex items-center justify-center group cursor-pointer"
            onClick={hit}
          >
            <img
              src="/blackjack/button.webp"
              className="transition-all group-hover:scale-105 group-hover:brightness-110"
            />
            <p className="absolute font-bold transition-all group-hover:scale-105">
              Dobierz
            </p>
          </div>

          <div 
            className="relative w-20 flex items-center justify-center group cursor-pointer"
            onClick={stand}
            >
            <img
              src="/blackjack/button.webp"
              className="transition-all group-hover:scale-105 group-hover:brightness-110"
            />
            <p className="absolute font-bold transition-all group-hover:scale-105">
              Pass
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
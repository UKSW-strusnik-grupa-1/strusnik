'use client';

import React from 'react';
import GameCard from './gameCard';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface CardListProps {
  dealerDeck: string[];
  dealerDeckValue: number | string;
  playerDeck: string[];
  playerDeckValue: number;
  gameStatus: 'NOT-STARTED' | 'STARTED' | 'FINISHED';
  winner?: 'PLAYER' | 'DEALER' | 'DRAW' | null;
  cashout?: number;
  hit: () => void;
  stand: () => void;
  playAgain: () => void;
}

export default function CardList({
  dealerDeck,
  dealerDeckValue = 0,
  playerDeck,
  playerDeckValue = 0,
  gameStatus,
  winner,
  cashout = 0,
  hit,
  stand,
  playAgain,
}: CardListProps) {
  const { lang } = useLang();

  const renderResult = () => {
    if (winner === 'PLAYER') {
      return (
        <div className="flex flex-col items-center animate-in zoom-in duration-300">
          <h2 className="text-xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-linear-to-b from-green-300 to-green-600 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
            {t(lang, 'blackjack.result.win')}
          </h2>
          <p className="text-white font-bold text-xl mt-2 drop-shadow-md">+{cashout}$</p>
        </div>
      );
    }

    if (winner === 'DEALER') {
      return (
        <div className="flex flex-col items-center animate-in zoom-in duration-300">
          <h3 className="text-xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-linear-to-b from-red-400 to-red-700 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
            {t(lang, 'blackjack.result.lose')}
          </h3>
        </div>
      );
    }

    if (winner === 'DRAW') {
      return (
        <div className="flex flex-col items-center animate-in zoom-in duration-300">
          <h2 className="text-xl md:text-5xl font-black uppercase text-transparent bg-clip-text bg-linear-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]">
            {t(lang, 'blackjack.result.draw')}
          </h2>
          <p className="text-white font-bold text-xl mt-2 drop-shadow-md">{t(lang, 'blackjack.result.refund')}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full w-full justify-between py-12 px-4 md:px-8">
      <div className="w-full flex flex-col items-center justify-center">
        <p className="text-white font-bold text-lg uppercase tracking-widest mb-4 drop-shadow-md bg-black/40 px-4 py-1 rounded-full border border-white/10">
          {t(lang, 'blackjack.dealer')} ({dealerDeckValue})
        </p>

        <div className="flex flex-row flex-wrap justify-center gap-2 md:gap-4 min-h-40">
          {dealerDeck.map((card, index) => (
            <div key={card + '-' + index} className="animate-in fade-in zoom-in duration-300">
              <GameCard cardName={card} className="w-24 md:w-32 shadow-2xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="w-full flex flex-col items-center justify-center gap-6">
        <p className="text-white font-bold text-lg uppercase tracking-widest drop-shadow-md bg-black/40 px-4 py-1 rounded-full border border-white/10">
          {t(lang, 'blackjack.you')} ({playerDeckValue})
        </p>

        <div className="flex flex-row flex-wrap justify-center gap-2 md:gap-4 min-h-40">
          {playerDeck.map((card, index) => (
            <div
              key={card + '-' + index}
              className="animate-in fade-in zoom-in duration-300 slide-in-from-bottom-10"
            >
              <GameCard cardName={card} className="w-24 md:w-32 shadow-2xl" />
            </div>
          ))}
        </div>

        <div className="h-24 flex items-center justify-center mt-4">
          {gameStatus === 'STARTED' ? (
            <div className="flex flex-row gap-6">
              <div
                className="relative w-24 md:w-28 flex items-center justify-center group cursor-pointer"
                onClick={hit}
              >
                <img
                  src="/blackjack/button.webp"
                  className="w-full transition-all group-hover:scale-105 group-hover:brightness-110 drop-shadow-xl"
                  alt={t(lang, 'blackjack.actions.hit')}
                />
                <p className="absolute font-bold text-sm md:text-base transition-all group-hover:scale-105 text-white">
                  {t(lang, 'blackjack.actions.hit')}
                </p>
              </div>

              <div
                className="relative w-24 md:w-28 flex items-center justify-center group cursor-pointer"
                onClick={stand}
              >
                <img
                  src="/blackjack/button.webp"
                  className="w-full transition-all group-hover:scale-105 group-hover:brightness-110 drop-shadow-xl hue-rotate-15"
                  alt={t(lang, 'blackjack.actions.stand')}
                />
                <p className="absolute font-bold text-sm md:text-base transition-all group-hover:scale-105 text-white">
                  {t(lang, 'blackjack.actions.stand')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center">
              <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-12 py-4 rounded-2xl shadow-2xl">
                {renderResult()}
              </div>

              <p
                className="font-bold cursor-pointer transition-all duration-100 hover:brightness-110"
                onClick={playAgain}
              >
                {t(lang, 'blackjack.actions.play_again')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
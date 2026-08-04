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
  bet: number;
  balance: number;
  isResolving: boolean;
  hit: () => void;
  stand: () => void;
  doubleDown: () => void;
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
  bet,
  balance,
  isResolving,
  hit,
  stand,
  doubleDown,
  playAgain,
}: CardListProps) {
  const { lang } = useLang();
  const dealerHasHiddenCard = dealerDeck.includes('cardBack');
  const canDouble = gameStatus === 'STARTED' && !isResolving && playerDeck.length === 2 && bet > 0 && balance >= bet;
  const displayedDealerValue = dealerHasHiddenCard ? '?' : dealerDeckValue;

  const renderResult = () => {
    if (winner === 'PLAYER') {
      return (
        <div className="blackjack-result blackjack-result--win">
          <span className="blackjack-result-kicker">{t(lang, 'blackjack.result.kicker')}</span>
          <h2>{t(lang, 'blackjack.result.win')}</h2>
          <p>{t(lang, 'blackjack.result.payout')}: <strong>+{cashout}$</strong></p>
        </div>
      );
    }

    if (winner === 'DEALER') {
      return (
        <div className="blackjack-result blackjack-result--lose">
          <span className="blackjack-result-kicker">{t(lang, 'blackjack.result.kicker')}</span>
          <h2>{t(lang, 'blackjack.result.lose')}</h2>
          <p>{t(lang, 'blackjack.result.lose_hint')}</p>
        </div>
      );
    }

    if (winner === 'DRAW') {
      return (
        <div className="blackjack-result blackjack-result--draw">
          <span className="blackjack-result-kicker">{t(lang, 'blackjack.result.kicker')}</span>
          <h2>{t(lang, 'blackjack.result.draw')}</h2>
          <p>{t(lang, 'blackjack.result.refund')}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <main className="blackjack-table" aria-label={t(lang, 'blackjack.title')}>
      <header className="blackjack-table-header">
        <div>
          <span className="blackjack-kicker">{t(lang, 'blackjack.kicker')}</span>
          <h1>{t(lang, 'blackjack.table_title')}</h1>
        </div>
        <div className="blackjack-table-bet">
          <span>{t(lang, 'blackjack.bet')}</span>
          <strong>{bet}$</strong>
        </div>
      </header>

      <section className="blackjack-hand blackjack-hand--dealer" aria-labelledby="blackjack-dealer-hand">
        <div className="blackjack-hand-heading">
          <h2 id="blackjack-dealer-hand">{t(lang, 'blackjack.dealer')}</h2>
          <span className="blackjack-hand-score">{displayedDealerValue}</span>
        </div>
        <div className="blackjack-card-row">
          {dealerDeck.map((card, index) => (
            <div key={card + '-' + index} className="blackjack-card-entry" style={{ '--card-index': index } as React.CSSProperties}>
              <GameCard cardName={card} className="blackjack-card" />
            </div>
          ))}
        </div>
      </section>

      <section className="blackjack-hand blackjack-hand--player" aria-labelledby="blackjack-player-hand">
        <div className="blackjack-hand-heading">
          <h2 id="blackjack-player-hand">{t(lang, 'blackjack.you')}</h2>
          <span className="blackjack-hand-score">{playerDeckValue}</span>
        </div>
        <div className="blackjack-card-row">
          {playerDeck.map((card, index) => (
            <div key={card + '-' + index} className="blackjack-card-entry" style={{ '--card-index': index } as React.CSSProperties}>
              <GameCard cardName={card} className="blackjack-card" />
            </div>
          ))}
        </div>
      </section>

      <footer className="blackjack-controls">
        {gameStatus === 'STARTED' ? (
          <>
            <p className="blackjack-controls-hint">{t(lang, isResolving ? 'blackjack.resolving_hint' : 'blackjack.actions_hint')}</p>
            <div className="blackjack-action-row">
              <button type="button" className="blackjack-action blackjack-action--hit" onClick={hit} disabled={isResolving}>
                <span className="blackjack-action-symbol" aria-hidden="true">+</span>
                <span>
                  <strong>{t(lang, 'blackjack.actions.hit')}</strong>
                  <small>{t(lang, 'blackjack.actions.hit_hint')}</small>
                </span>
              </button>
              <button type="button" className="blackjack-action blackjack-action--stand" onClick={stand} disabled={isResolving}>
                <span className="blackjack-action-symbol" aria-hidden="true">✓</span>
                <span>
                  <strong>{t(lang, 'blackjack.actions.stand')}</strong>
                  <small>{t(lang, 'blackjack.actions.stand_hint')}</small>
                </span>
              </button>
              <button
                type="button"
                className="blackjack-action blackjack-action--double"
                onClick={doubleDown}
                disabled={!canDouble}
                aria-describedby="blackjack-double-hint"
              >
                <span className="blackjack-action-symbol" aria-hidden="true">2×</span>
                <span>
                  <strong>{t(lang, 'blackjack.actions.double')}</strong>
                  <small>{t(lang, 'blackjack.actions.double_hint')}</small>
                </span>
              </button>
            </div>
            <p id="blackjack-double-hint" className="blackjack-double-note">
              {canDouble ? t(lang, 'blackjack.double_available') : t(lang, 'blackjack.double_unavailable')}
            </p>
          </>
        ) : (
          <div className="blackjack-finished-panel" aria-live="polite">
            {renderResult()}
            <button type="button" className="blackjack-next-button" onClick={playAgain}>
              {t(lang, 'blackjack.actions.play_again')}
            </button>
          </div>
        )}
      </footer>
    </main>
  );
}

'use client';

import { BookOpenText, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface GameRulesBubbleProps {
  roomId: string;
  placement?: 'left' | 'right';
}

export default function GameRulesBubble({ roomId, placement = 'right' }: GameRulesBubbleProps) {
  const { lang } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = `thousand-rules-${useId()}-${roomId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const rules = [
    {
      title: t(lang, 'thousand.rules.bid_title'),
      text: t(lang, 'thousand.rules.bid_text'),
    },
    {
      title: t(lang, 'thousand.rules.follow_title'),
      text: t(lang, 'thousand.rules.follow_text'),
    },
    {
      title: t(lang, 'thousand.rules.target_title'),
      text: t(lang, 'thousand.rules.target_text'),
    },
  ];

  return (
    <div className={`thousand-rules-dock thousand-rules-dock--${placement}`}>
      {isOpen && (
        <section className="thousand-rules-panel" id={panelId} role="dialog" aria-labelledby={`${panelId}-title`}>
          <div className="thousand-rules-panel__header">
            <div>
              <span className="thousand-rules-panel__eyebrow">STRUSNIK / GUIDE</span>
              <h2 id={`${panelId}-title`}>{t(lang, 'thousand.rules.title')}</h2>
            </div>
            <span className="thousand-rules-panel__mark" aria-hidden="true">♠</span>
          </div>
          <p className="thousand-rules-panel__intro">{t(lang, 'thousand.rules.intro')}</p>
          <ol className="thousand-rules-list">
            {rules.map((rule, index) => (
              <li key={rule.title} style={{ animationDelay: `${index * 70}ms` }}>
                <span className="thousand-rules-list__number" aria-hidden="true">0{index + 1}</span>
                <span>
                  <strong>{rule.title}</strong>
                  <span>{rule.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <button
        ref={buttonRef}
        type="button"
        className={`thousand-rules-button${isOpen ? ' is-open' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? t(lang, 'thousand.rules.close') : t(lang, 'thousand.rules.open')}
        aria-controls={panelId}
        aria-expanded={isOpen}
      >
        <span className={`thousand-rules-button__icon${!isOpen ? ' is-visible' : ''}`} aria-hidden="true">
          <BookOpenText size={20} strokeWidth={1.8} />
        </span>
        <span className={`thousand-rules-button__icon${isOpen ? ' is-visible' : ''}`} aria-hidden="true">
          <X size={20} strokeWidth={1.8} />
        </span>
      </button>
    </div>
  );
}

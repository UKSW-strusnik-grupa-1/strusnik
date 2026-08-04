'use client';

import type { ReactNode } from 'react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface ActionZoneProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export default function ActionZone({ children, label, className = '' }: ActionZoneProps) {
  const { lang } = useLang();
  return (
    <section className={`action-zone ${className}`.trim()} aria-label={label || t(lang, 'multiplayer.action_zone')}>
      {children}
    </section>
  );
}

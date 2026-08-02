'use client';

import { RefreshCcw } from 'lucide-react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface RefreshButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export default function RefreshButton({ onClick, isLoading }: RefreshButtonProps) {
  const { lang } = useLang();
  const label = t(lang, 'rooms.refresh');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="lobby-refresh-button"
      aria-label={label}
      title={label}
    >
      <RefreshCcw className={isLoading ? 'is-loading' : undefined} size={18} strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

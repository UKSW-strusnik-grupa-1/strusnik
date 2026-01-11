'use client';

import { RefreshCcw } from 'lucide-react';
import React from 'react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface RefreshButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export default function RefreshButton({ onClick, isLoading }: RefreshButtonProps) {
  const { lang } = useLang();

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="absolute right-10 top-3 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full transition-all group shadow-lg cursor-pointer z-20"
      title={t(lang, 'rooms.refresh')}
    >
      <RefreshCcw
        className={`w-6 h-6 text-white/80 group-hover:text-white transition-all ${
          isLoading ? 'animate-spin' : ''
        }`}
      />
    </button>
  );
}
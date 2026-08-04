'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';

interface SetCardProps {
    card: {
        shape: number;
        color: number;
        fill: number;
        count: number;
        id: string;
    } | null;
    selected?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    small?: boolean;
    usePng?: boolean;
}

const COLORS = ['#e74c3c', '#27ae60', '#8e44ad'];
const SHAPES = ['diamond', 'oval', 'wave'];
const FILLS = ['solid', 'striped', 'empty'];

export default function SetCard({ card, selected, onClick, disabled, small, usePng = false }: SetCardProps) {
    const { lang } = useLang();
    const [imgError, setImgError] = useState(false);

    if (!card) {
        return (
            <div
                className={`
          ${small ? 'w-16 h-16' : 'w-24 h-24'}
          set-game-card set-game-card--empty rounded-lg bg-gray-800/50 border-2 border-dashed border-gray-600
        `}
            />
        );
    }

    const color = COLORS[card.color];
    const shape = SHAPES[card.shape];
    const fill = FILLS[card.fill];
    const symbolCount = card.count + 1;

    if (usePng && !imgError) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className={`
          ${small ? 'w-16 h-16' : 'w-24 h-24'}
          set-game-card rounded-lg bg-white border-3 relative overflow-hidden
          ${selected ? 'set-game-card--selected' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
            >
                <Image
                    src={`/set/cards/${card.id}.png`}
                    alt={`${t(lang, 'set.card_alt')}: ${shape} ${color} ${fill} x${symbolCount}`}
                    fill
                    className="object-contain p-1"
                    onError={() => setImgError(true)}
                />
            </button>
        );
    }

    const renderSymbol = (index: number) => {
        const strokeWidth = small ? 1.5 : 2;
        const symbolWidth = small ? 16 : 24;
        const symbolHeight = small ? 10 : 14;

        const patternId = `stripes-${card.id}-${index}`;
        const stripedPattern = (
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
                <line x1="0" y1="0" x2="4" y2="4" stroke={color} strokeWidth="1" />
            </pattern>
        );

        const getFill = () => {
            if (fill === 'solid') return color;
            if (fill === 'striped') return `url(#${patternId})`;
            return 'transparent';
        };

        const getShape = () => {
            if (shape === 'diamond') {
                return (
                    <polygon
                        points={`${symbolWidth / 2},0 ${symbolWidth},${symbolHeight / 2} ${symbolWidth / 2},${symbolHeight} 0,${symbolHeight / 2}`}
                        fill={getFill()}
                        stroke={color}
                        strokeWidth={strokeWidth}
                    />
                );
            }
            if (shape === 'oval') {
                return (
                    <ellipse
                        cx={symbolWidth / 2}
                        cy={symbolHeight / 2}
                        rx={symbolWidth / 2 - 1}
                        ry={symbolHeight / 2 - 1}
                        fill={getFill()}
                        stroke={color}
                        strokeWidth={strokeWidth}
                    />
                );
            }
            return (
                <path
                    d={`M 2 ${symbolHeight / 2} Q ${symbolWidth / 4} 0, ${symbolWidth / 2} ${symbolHeight / 2} T ${symbolWidth - 2} ${symbolHeight / 2}`}
                    fill={getFill()}
                    stroke={color}
                    strokeWidth={strokeWidth}
                />
            );
        };

        return (
            <svg
                key={index}
                width={symbolWidth}
                height={symbolHeight}
                className="mx-auto"
            >
                <defs>
                    {fill === 'striped' && stripedPattern}
                </defs>
                {getShape()}
            </svg>
        );
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
        ${small ? 'w-16 h-16' : 'w-24 h-24'}
        set-game-card rounded-lg bg-white border-3
        flex flex-col items-center justify-center gap-1
        ${selected ? 'set-game-card--selected' : ''}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
        >
            {Array.from({ length: symbolCount }, (_, i) => renderSymbol(i))}
        </button>
    );
}

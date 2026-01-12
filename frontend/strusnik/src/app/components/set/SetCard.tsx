'use client';

import React, { useState } from 'react';
import Image from 'next/image';

// Karta Set ma 4 właściwości: shape, color, fill, count
// Każda ma wartość 0, 1 lub 2

interface SetCardProps {
    card: {
        shape: number;   // 0=diament, 1=owal, 2=fala
        color: number;   // 0=czerwony, 1=zielony, 2=fioletowy
        fill: number;    // 0=pełne, 1=paski, 2=puste
        count: number;   // 0=1, 1=2, 2=3 symbole
        id: string;
    } | null;
    selected?: boolean;
    onClick?: () => void;
    disabled?: boolean;
    small?: boolean;
    usePng?: boolean;  // Flaga do użycia obrazów PNG zamiast SVG
}

const COLORS = ['#e74c3c', '#27ae60', '#8e44ad']; // czerwony, zielony, fioletowy
const SHAPES = ['diamond', 'oval', 'wave'];
const FILLS = ['solid', 'striped', 'empty'];

export default function SetCard({ card, selected, onClick, disabled, small, usePng = false }: SetCardProps) {
    const [imgError, setImgError] = useState(false);

    if (!card) {
        return (
            <div
                className={`
          ${small ? 'w-16 h-24' : 'w-24 h-36'} 
          rounded-lg bg-gray-800/50 border-2 border-dashed border-gray-600
        `}
            />
        );
    }

    const color = COLORS[card.color];
    const shape = SHAPES[card.shape];
    const fill = FILLS[card.fill];
    const symbolCount = card.count + 1; // 0->1, 1->2, 2->3

    // Jeśli włączone są PNG i nie było błędu, użyj obrazu PNG
    // Nazewnictwo pliku: {shape}_{color}_{fill}_{count}.png
    // np. diamond_0_0_0.png = diament, czerwony, pełny, 1 symbol
    // lub można użyć ID karty: {card.id}.png
    if (usePng && !imgError) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className={`
          ${small ? 'w-16 h-24' : 'w-24 h-36'}
          rounded-lg bg-white border-3 transition-all duration-150
          relative overflow-hidden
          ${selected
                        ? 'border-yellow-400 ring-4 ring-yellow-400/50 scale-105 shadow-lg shadow-yellow-400/30'
                        : 'border-gray-300 hover:border-gray-400'
                    }
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
        `}
            >
                <Image
                    src={`/set/cards/${card.id}.png`}
                    alt={`Set card: ${shape} ${color} ${fill} x${symbolCount}`}
                    fill
                    className="object-contain p-1"
                    onError={() => setImgError(true)}
                />
            </button>
        );
    }

    // Fallback do SVG
    const renderSymbol = (index: number) => {
        const strokeWidth = small ? 1.5 : 2;
        const symbolWidth = small ? 16 : 24;
        const symbolHeight = small ? 10 : 14;

        // Definicja wzoru pasków
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
            // wave/fala
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
        ${small ? 'w-16 h-24' : 'w-24 h-36'}
        rounded-lg bg-white border-3 transition-all duration-150
        flex flex-col items-center justify-center gap-1
        ${selected
                    ? 'border-yellow-400 ring-4 ring-yellow-400/50 scale-105 shadow-lg shadow-yellow-400/30'
                    : 'border-gray-300 hover:border-gray-400'
                }
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
      `}
        >
            {Array.from({ length: symbolCount }, (_, i) => renderSymbol(i))}
        </button>
    );
}

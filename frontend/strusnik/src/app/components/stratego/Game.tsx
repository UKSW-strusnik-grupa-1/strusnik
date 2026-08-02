'use client';

import Link from 'next/link';
import type { Socket } from 'socket.io-client';
import React, { useState } from 'react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import { useNotification } from '@/app/context/NotificationsContext';
import { Check, Clock3, Flag, Shield, Shuffle, Swords, Trash2 } from 'lucide-react';
import ParticipantZone from '@/app/components/multiplayer/ParticipantZone';
import type { PlayerTileModel } from '@/app/components/multiplayer/types';

export interface StrategoSeat {
    socketId: string;
    userId: string;
    name: string;
    connected?: boolean;
    avatarUrl?: string | null;
    avatar_url?: string | null;
}

interface StrategoPiece {
    rank: string;
    player: number;
}

interface StrategoLastMove {
    from: { r: number; c: number };
    to: { r: number; c: number };
    combat?: { attacker: StrategoPiece; defender: StrategoPiece; result?: string };
}

interface StrategoWinner {
    userId?: string;
    name?: string;
    reason?: string;
}

export interface StrategoGameState {
    board: (StrategoPiece | null)[][];
    seats: (StrategoSeat | null)[];
    stage: string;
    setup_ready?: boolean[];
    current_player_idx?: number;
    last_move?: StrategoLastMove;
    winner?: StrategoWinner;
    my_idx?: number;
}

interface ActiveGameProps {
    socket: Socket | null;
    roomId: string;
    gameState: StrategoGameState | null;
    myId: string;
    opponentDisconnected?: boolean;
}

const RANK_TO_IMG_SUFFIX: Record<string, string> = {
    F: 'S',
    B: 'B',
    S: '1',
    '10': '10',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2',
};

const PIECE_LABELS: Record<string, string> = {
    F: '🚩',
    B: '💣',
    '10': '10',
    '9': '9',
    '8': '8',
    '7': '7',
    '6': '6',
    '5': '5',
    '4': '4',
    '3': '3',
    '2': '2',
    S: '1',
};

const SETUP_CONFIG = {
    F: 1,
    B: 6,
    '10': 1,
    '9': 1,
    '8': 2,
    '7': 3,
    '6': 4,
    '5': 4,
    '4': 4,
    '3': 5,
    '2': 8,
    S: 1,
};

const LAKE_CELLS = new Set([
    '4,2', '4,3', '5,2', '5,3',
    '4,6', '4,7', '5,6', '5,7',
]);

const isLakeCell = (r: number, c: number) => LAKE_CELLS.has(`${r},${c}`);

export default function Game({ socket, roomId, gameState, myId, opponentDisconnected }: ActiveGameProps) {
    const { lang } = useLang();
    const { notify } = useNotification();

    const fallbackGameState: StrategoGameState = {
        board: Array.from({ length: 10 }, () => Array<StrategoPiece | null>(10).fill(null)),
        seats: [null, null],
        stage: 'loading',
    };
    const activeGameState = gameState ?? fallbackGameState;
    const { board, seats, stage, setup_ready, current_player_idx, last_move, winner } = activeGameState;

    const calculatedIdx = seats.findIndex((s) => s && s.userId === myId);

    const my_idx = (activeGameState.my_idx !== undefined && activeGameState.my_idx !== -1)
        ? activeGameState.my_idx
        : calculatedIdx;
    const isObserver = my_idx === -1;

    const [setupBoard, setSetupBoard] = useState<(string | null)[][]>(
        Array(4).fill(null).map(() => Array(10).fill(null))
    );
    const [availablePieces, setAvailablePieces] = useState<Record<string, number>>({ ...SETUP_CONFIG });
    const [selectedPieceToPlace, setSelectedPieceToPlace] = useState<string | null>(null);

    const [dragOverSquare, setDragOverSquare] = useState<{ r: number, c: number } | null>(null);

    const [selectedSquare, setSelectedSquare] = useState<{ r: number, c: number } | null>(null);

    const isPlayer0 = my_idx === 0;

    const getPieceImgSrc = (rank: string, playerIdx: number) => {
        const colorPrefix = playerIdx === 0 ? 'red' : 'blue';
        const suffix = RANK_TO_IMG_SUFFIX[rank] || rank;
        return `/stratego/${colorPrefix}${suffix}.webp`;
    };

    const shouldShowRankLabel = (rank: string) => {
        return rank !== 'F' && rank !== 'B';
    };

    const viewToBackend = (r_view: number, c_view: number) => {
        if (isPlayer0) {
            return { r: 9 - r_view, c: 9 - c_view };
        } else {
            return { r: r_view, c: c_view };
        }
    };

    const setupToBackend = (r: number, c: number) => {
        if (isPlayer0) {
            return { r: 3 - r, c: 9 - c };
        }
        return { r: 6 + r, c };
    };

    const handlePlacePiece = (r: number, c: number) => {
        const backendCell = setupToBackend(r, c);
        if (stage !== 'setup' || isLakeCell(backendCell.r, backendCell.c)) return;

        const existing = setupBoard[r][c];

        if (existing) {
            setAvailablePieces(prev => ({ ...prev, [existing]: prev[existing] + 1 }));
            const newBoard = [...setupBoard.map(row => [...row])];
            newBoard[r][c] = null;
            setSetupBoard(newBoard);
            return;
        }

        if (selectedPieceToPlace && availablePieces[selectedPieceToPlace] > 0) {
            const newBoard = [...setupBoard.map(row => [...row])];
            newBoard[r][c] = selectedPieceToPlace;
            setSetupBoard(newBoard);
            setAvailablePieces(prev => {
                const updated = { ...prev };
                updated[selectedPieceToPlace]--;
                if (updated[selectedPieceToPlace] === 0) setSelectedPieceToPlace(null);
                return updated;
            });
        }
    };

    const handleSetupCellKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handlePlacePiece(r, c);
        }
    };

    const handleDragStart = (e: React.DragEvent, rank: string, fromBoard: boolean, r?: number, c?: number) => {
        const data = JSON.stringify({ rank, fromBoard, r, c });
        e.dataTransfer.setData("piece_data", data);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, r: number, c: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverSquare?.r !== r || dragOverSquare?.c !== c) {
            setDragOverSquare({ r, c });
        }
    };

    const handleDragLeave = () => {
        setDragOverSquare(null);
    };

    const handleDrop = (e: React.DragEvent, targetR: number, targetC: number) => {
        e.preventDefault();
        setDragOverSquare(null);

        const dataStr = e.dataTransfer.getData('piece_data');
        if (!dataStr) return;

        const { rank, fromBoard, r: srcR, c: srcC } = JSON.parse(dataStr);

        if (fromBoard && srcR === targetR && srcC === targetC) return;

        const targetBackendCell = setupToBackend(targetR, targetC);
        if (isLakeCell(targetBackendCell.r, targetBackendCell.c)) return;

        const newBoard = setupBoard.map((row) => [...row]);
        const newAvailable = { ...availablePieces };
        const targetPiece = newBoard[targetR][targetC];

        if (fromBoard) {
            newBoard[targetR][targetC] = rank;
            newBoard[srcR][srcC] = targetPiece;
        } else {
            if (newAvailable[rank] <= 0) return;
            newAvailable[rank]--;
            if (targetPiece) {
                newAvailable[targetPiece]++;
            }
            newBoard[targetR][targetC] = rank;
            if (newAvailable[rank] === 0 && selectedPieceToPlace === rank) {
                setSelectedPieceToPlace(null);
            }
        }
        setSetupBoard(newBoard);
        setAvailablePieces(newAvailable);
    };

    const handleAutoFill = () => {
        const newBoard = setupBoard.map(row => [...row]);
        const newAvailable = { ...availablePieces };

        const emptySlots: { r: number, c: number }[] = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) if (!newBoard[r][c]) emptySlots.push({ r, c });

        for (let i = emptySlots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptySlots[i], emptySlots[j]] = [emptySlots[j], emptySlots[i]];
        }

        let slotIdx = 0;
        for (const [rank, count] of Object.entries(newAvailable)) {
            for (let i = 0; i < count; i++) {
                if (slotIdx < emptySlots.length) {
                    const { r, c } = emptySlots[slotIdx++];
                    newBoard[r][c] = rank;
                    newAvailable[rank]--;
                }
            }
        }
        setSetupBoard(newBoard);
        setAvailablePieces(newAvailable);
    };

    const submitSetup = () => {
        if (my_idx === undefined || my_idx === null || my_idx === -1) {
            notify(t(lang, 'stratego.setup.sync_error_refresh'), 'error');
            return;
        }

        const pieces: { r: number; c: number; rank: string }[] = [];

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 10; c++) {
                const rank = setupBoard[r][c];
                if (rank) {
                    const backendCell = setupToBackend(r, c);
                    pieces.push({ r: backendCell.r, c: backendCell.c, rank });
                }
            }
        }

        socket?.emit('player_move', {
            roomId,
            move: { type: 'submit_setup', pieces },
        });
    };

    const handleSquareClick = (r_view: number, c_view: number) => {
        if (isObserver || stage !== 'playing') return;
        if (current_player_idx !== my_idx) return;
        if (opponentDisconnected) return;

        const { r: realR, c: realC } = viewToBackend(r_view, c_view);
        if (isLakeCell(realR, realC)) return;

        const piece = board[realR][realC];
        const isMyPiece = piece && piece.player === my_idx;

        if (selectedSquare) {
            const { r: fromRealR, c: fromRealC } = viewToBackend(selectedSquare.r, selectedSquare.c);

            if (selectedSquare.r === r_view && selectedSquare.c === c_view) {
                setSelectedSquare(null);
                return;
            }

            if (isMyPiece) {
                if (piece.rank !== 'F' && piece.rank !== 'B') {
                    setSelectedSquare({ r: r_view, c: c_view });
                }
                return;
            }

            socket?.emit('player_move', {
                roomId,
                move: {
                    type: 'move',
                    from: { r: fromRealR, c: fromRealC },
                    to: { r: realR, c: realC }
                }
            });
            setSelectedSquare(null);

        } else {
            if (isMyPiece) {
                if (piece.rank === 'F' || piece.rank === 'B') return;
                setSelectedSquare({ r: r_view, c: c_view });
            }
        }
    };

    const renderGameCell = (r_view: number, c_view: number) => {
        const { r: realR, c: realC } = viewToBackend(r_view, c_view);
        const isLake = isLakeCell(realR, realC);
        const piece = isLake ? null : board[realR][realC];
        const isSelected = selectedSquare?.r === r_view && selectedSquare?.c === c_view;
        const isLastMoveSrc = last_move?.from.r === realR && last_move?.from.c === realC;
        const isLastMoveDst = last_move?.to.r === realR && last_move?.to.c === realC;
        const isDisabled = isObserver || current_player_idx !== my_idx || !!opponentDisconnected || isLake;
        const squareLabel = `Pole ${r_view + 1}, ${c_view + 1}${isLake ? `, ${t(lang, 'stratego.lake')}, ${t(lang, 'stratego.lake_blocked')}` : piece ? `, ${piece.rank === '?' ? 'ukryta figura' : `figura ${piece.rank}`}` : ', puste'}`;

        return (
            <button
                type="button"
                className={`stratego-board-cell${isLake ? ' stratego-board-cell--lake' : piece ? ` stratego-board-cell--${piece.player === 0 ? 'red' : 'blue'}` : ' stratego-board-cell--empty'}${isSelected ? ' is-selected' : ''}${isLastMoveSrc ? ' is-last-source' : ''}${isLastMoveDst ? ' is-last-destination' : ''}`}
                onClick={() => handleSquareClick(r_view, c_view)}
                aria-label={squareLabel}
                disabled={isDisabled}
            >
                {piece && (piece.player === my_idx || piece.rank !== '?') ? (
                    <>
                        <img
                            src={getPieceImgSrc(piece.rank, piece.player)}
                            alt=""
                            className="stratego-board-piece"
                            onError={(event) => {
                                const image = event.currentTarget;
                                image.style.display = 'none';
                                image.parentElement?.classList.add('has-fallback');
                                if (image.parentElement) image.parentElement.setAttribute('data-fallback', PIECE_LABELS[piece.rank] || piece.rank);
                            }}
                        />
                        {shouldShowRankLabel(piece.rank) && (
                            <span className="stratego-board-piece__rank" aria-hidden="true">{piece.rank}</span>
                        )}
                    </>
                ) : piece ? (
                    <span className="stratego-board-piece__unknown" aria-hidden="true">?</span>
                ) : null}
            </button>
        );
    };

    if (stage === 'game_over') {
        return (
            <section className="stratego-result-stage" aria-labelledby="stratego-result-title">
                <div className="stratego-result-card">
                    <div className="stratego-result-card__icon" aria-hidden="true"><Flag size={26} strokeWidth={1.8} /></div>
                    <p className="stratego-kicker">{t(lang, 'games.stratego')} / {t(lang, 'stratego.game_over_title')}</p>
                    <h2 id="stratego-result-title">{t(lang, 'stratego.game_over_title')}</h2>
                    <p className="stratego-result-card__winner">
                        {t(lang, 'stratego.winner_label')}: <strong>{winner?.name || '—'}</strong>
                    </p>
                    <p className="stratego-result-card__reason">{winner?.reason || t(lang, 'stratego.game_over_title')}</p>
                    <Link href="/lobby/Stratego" className="game-runtime-link-button game-runtime-link-button--primary stratego-result-card__action">
                        {t(lang, 'stratego.back_to_lobby')}
                    </Link>
                </div>
            </section>
        );
    }

    if (stage === 'setup') {
        if (isObserver) {
            return (
                <section className="stratego-state-stage" aria-labelledby="stratego-setup-observer-title">
                    <div className="stratego-state-card">
                        <div className="stratego-state-card__icon" aria-hidden="true"><Shield size={26} strokeWidth={1.8} /></div>
                        <p className="stratego-kicker">{t(lang, 'stratego.setup.observer')}</p>
                        <h2 id="stratego-setup-observer-title">{t(lang, 'stratego.setup.observer')}</h2>
                        <p>{t(lang, 'stratego.setup.observer_hint')}</p>
                    </div>
                </section>
            );
        }
        if (setup_ready?.[my_idx]) {
            return (
                <section className="stratego-state-stage" aria-labelledby="stratego-setup-ready-title">
                    <div className="stratego-state-card">
                        <div className="stratego-state-card__icon is-waiting" aria-hidden="true"><Clock3 size={26} strokeWidth={1.8} /></div>
                        <p className="stratego-kicker">{t(lang, 'stratego.setup.completed')}</p>
                        <h2 id="stratego-setup-ready-title">{t(lang, 'stratego.setup.completed')}</h2>
                        <p>{t(lang, 'stratego.setup.waiting_opponent')}</p>
                    </div>
                </section>
            );
        }

        const piecesLeft = Object.values(availablePieces).reduce((a, b) => a + b, 0);
        const sideClass = my_idx === 0 ? 'is-red' : 'is-blue';

        return (
            <section className="game-runtime-game stratego-setup" aria-labelledby="stratego-setup-title">
                <header className="stratego-stage-header">
                    <div className="stratego-stage-heading">
                        <p className="stratego-kicker">{t(lang, 'games.stratego')} / SETUP</p>
                        <h2 id="stratego-setup-title">{t(lang, 'stratego.setup.title')}</h2>
                        <p>{t(lang, 'stratego.setup.subtitle')}</p>
                    </div>
                    <div className={`stratego-setup-counter ${sideClass}`} aria-live="polite">
                        <strong>{piecesLeft}<span>/40</span></strong>
                        <span>{t(lang, 'stratego.setup.remaining')}</span>
                    </div>
                </header>

                <div className="stratego-setup-layout">
                    <section className="stratego-setup-board-panel" aria-labelledby="stratego-setup-board-title">
                        <div className="stratego-section-heading">
                            <div>
                                <p className="stratego-section-kicker">{t(lang, 'stratego.setup.board_label')}</p>
                                <h3 id="stratego-setup-board-title">{t(lang, 'stratego.setup.mine')}</h3>
                            </div>
                            <span className={`stratego-side-badge ${sideClass}`}><span aria-hidden="true" />{t(lang, my_idx === 0 ? 'stratego.red' : 'stratego.blue')}</span>
                        </div>

                        <div
                            className="stratego-setup-board"
                            role="grid"
                            aria-label={t(lang, 'stratego.setup.board_label')}
                            style={{ backgroundImage: "url('/stratego/board.webp')" }}
                        >
                            {Array.from({ length: 10 }).map((_, boardRow) => {
                                const setupRow = boardRow - 6;
                                const row = setupRow >= 0 ? setupBoard[setupRow] : null;

                                return Array.from({ length: 10 }).map((__, c) => {
                                    const cell = row?.[c] ?? null;

                                    if (setupRow < 0) {
                                        return <div key={`${boardRow}-${c}`} className="stratego-setup-cell stratego-setup-cell--locked" aria-hidden="true" />;
                                    }

                                    const isDragOver = dragOverSquare?.r === setupRow && dragOverSquare?.c === c;
                                    return (
                                        <button
                                            type="button"
                                            key={`${boardRow}-${c}`}
                                            className={`stratego-setup-cell${isDragOver ? ' is-drag-over' : ''}${cell ? ` ${sideClass}` : ''}`}
                                            onClick={() => handlePlacePiece(setupRow, c)}
                                            onKeyDown={(event) => handleSetupCellKeyDown(event, setupRow, c)}
                                            onDragOver={(event) => handleDragOver(event, setupRow, c)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(event) => handleDrop(event, setupRow, c)}
                                            aria-label={`Pole ${boardRow + 1}, ${c + 1}${cell ? `, figura ${cell}` : ', puste'}`}
                                        >
                                            {cell && (
                                                <span
                                                    className={`stratego-setup-piece ${sideClass}`}
                                                    draggable
                                                    onDragStart={(event) => handleDragStart(event, cell, true, setupRow, c)}
                                                    aria-hidden="true"
                                                >
                                                    <img src={getPieceImgSrc(cell, my_idx)} alt="" />
                                                    {shouldShowRankLabel(cell) && <span>{cell}</span>}
                                                </span>
                                            )}
                                        </button>
                                    );
                                });
                            })}
                        </div>
                    </section>

                    <aside className="stratego-setup-tray" aria-labelledby="stratego-setup-tray-title">
                        <div className="stratego-section-heading">
                            <div>
                                <p className="stratego-section-kicker">{t(lang, 'stratego.setup.inventory_kicker')}</p>
                                <h3 id="stratego-setup-tray-title">{t(lang, 'stratego.setup.inventory')}</h3>
                            </div>
                            <Swords size={20} aria-hidden="true" />
                        </div>

                        <div className="stratego-piece-inventory">
                            {Object.entries(SETUP_CONFIG).map(([rank, total]) => {
                                const left = availablePieces[rank];
                                const isSelected = selectedPieceToPlace === rank;
                                return (
                                    <button
                                        type="button"
                                        key={rank}
                                        className={`stratego-inventory-piece${isSelected ? ' is-selected' : ''}${left === 0 ? ' is-empty' : ''}`}
                                        draggable={left > 0}
                                        onDragStart={(event) => handleDragStart(event, rank, false)}
                                        onClick={() => left > 0 && setSelectedPieceToPlace(rank)}
                                        aria-pressed={isSelected}
                                        aria-label={`${rank}, ${left}/${total}`}
                                        disabled={left === 0}
                                    >
                                        <span className="stratego-inventory-piece__image" aria-hidden="true">
                                            <img src={getPieceImgSrc(rank, my_idx)} alt="" />
                                            {shouldShowRankLabel(rank) && <span>{rank}</span>}
                                        </span>
                                        <span className="stratego-inventory-piece__count">{left}/{total}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="stratego-setup-actions">
                            <button type="button" onClick={handleAutoFill} className="game-runtime-button">
                                <Shuffle size={16} aria-hidden="true" />
                                {t(lang, 'stratego.setup.random')}
                            </button>
                            <button type="button" onClick={() => { setSetupBoard(Array(4).fill(null).map(() => Array(10).fill(null))); setAvailablePieces({ ...SETUP_CONFIG }); setSelectedPieceToPlace(null); }} className="game-runtime-button game-runtime-button--danger">
                                <Trash2 size={16} aria-hidden="true" />
                                {t(lang, 'stratego.setup.clear')}
                            </button>
                            <button type="button" onClick={submitSetup} disabled={piecesLeft > 0} className="game-runtime-button game-runtime-button--primary stratego-setup-confirm">
                                <Check size={17} aria-hidden="true" />
                                {t(lang, 'stratego.setup.confirm')}
                            </button>
                        </div>
                    </aside>
                </div>
            </section>
        );
    }

    const strategoParticipants: PlayerTileModel[] = seats.flatMap((player, index) => {
        if (!player) return [];
        const isSelf = String(player.userId) === String(myId);
        const isActive = current_player_idx === index;
        return [{
            id: String(player.userId || player.socketId || `stratego-seat-${index}`),
            displayName: player.name || t(lang, 'multiplayer.empty_seat'),
            avatarUrl: player.avatarUrl ?? player.avatar_url ?? (String(player.userId).startsWith('guest_') ? null : `/api/profile/avatar/${encodeURIComponent(String(player.userId))}`),
            isSelf,
            selfLabel: t(lang, 'stratego.waiting_room.you'),
            role: 'player' as const,
            team: { id: String(index), label: t(lang, index === 0 ? 'stratego.red' : 'stratego.blue') },
            connection: player.connected === false ? 'disconnected' as const : 'connected' as const,
            activity: isActive ? 'active' as const : 'playing' as const,
            activityLabel: isActive ? t(lang, 'stratego.your_turn') : t(lang, 'stratego.opponent_turn'),
            metric: { label: t(lang, 'stratego.your_turn'), value: isActive ? t(lang, 'common.yes') : t(lang, 'common.no') },
            outcome: stage === 'game_over' ? (winner && String(winner.userId ?? winner.name) === String(player.userId ?? player.name) ? 'won' as const : 'finished' as const) : undefined,
        }];
    });

    let combatResultText = '';
    let combatResultTone = 'is-draw';

    if (last_move?.combat) {
        const combat = last_move.combat;
        const amIAttacker = combat.attacker.player === my_idx;
        const isViewerWinner = my_idx === -1
            ? false
            : (amIAttacker && combat.result === 'win') || (!amIAttacker && combat.result === 'loss');

        if (combat.result === 'draw') {
            combatResultText = t(lang, 'stratego.draw_result');
        } else {
            combatResultText = isViewerWinner ? t(lang, 'stratego.win_result') : t(lang, 'stratego.lose_result');
            combatResultTone = isViewerWinner ? 'is-win' : 'is-loss';
        }
    }

    return (
        <section className="game-runtime-game game-runtime-stratego stratego-match" aria-label={t(lang, 'games.stratego')}>
            <div className="stratego-match-layout">
                <section className="stratego-board-column" aria-label={t(lang, 'stratego.setup.board_label')}>
                    <ParticipantZone
                        participants={strategoParticipants}
                        title={t(lang, 'multiplayer.participants')}
                        layout="stack"
                        variant={isObserver ? 'observer' : 'active'}
                        className="stratego-player-zone"
                    />

                    <div className="game-runtime-board-surface stratego-board-frame">
                        <div
                            className="stratego-game-board"
                            role="grid"
                            aria-label={t(lang, 'stratego.setup.board_label')}
                            style={{ backgroundImage: "url('/stratego/board.webp')" }}
                        >
                            {Array.from({ length: 10 }).map((_, r) => Array.from({ length: 10 }).map((__, c) => (
                                <div key={`${r}-${c}`} className="stratego-board-cell-shell" role="gridcell">
                                    {renderGameCell(r, c)}
                                </div>
                            )))}
                        </div>
                    </div>

                    {last_move?.combat && (
                        <aside className="stratego-combat-card" aria-live="polite">
                            <div className="stratego-combat-card__header">
                                <span className="stratego-section-kicker">{t(lang, 'stratego.combat_result_title')}</span>
                                <Swords size={16} aria-hidden="true" />
                            </div>
                            <div className="stratego-combat-card__pieces">
                                <div>
                                    <img src={getPieceImgSrc(last_move.combat.attacker.rank, last_move.combat.attacker.player)} alt="" />
                                    <span>{t(lang, 'stratego.attacker')}</span>
                                </div>
                                <strong aria-hidden="true">VS</strong>
                                <div>
                                    <img src={getPieceImgSrc(last_move.combat.defender.rank, last_move.combat.defender.player)} alt="" />
                                    <span>{t(lang, 'stratego.defender')}</span>
                                </div>
                            </div>
                            <strong className={`stratego-combat-card__result ${combatResultTone}`}>{combatResultText}</strong>
                        </aside>
                    )}
                </section>
            </div>
        </section>
    );
}
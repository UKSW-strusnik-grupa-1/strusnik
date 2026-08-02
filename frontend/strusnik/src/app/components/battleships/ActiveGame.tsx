'use client';

import React, { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import Link from 'next/link';
import {
    Anchor,
    Check,
    ChevronRight,
    Crosshair,
    Eye,
    Info,
    Move,
    Radio,
    RotateCw,
    ScanLine,
    Ship as ShipIcon,
    Shield,
    Target,
    Trophy,
    Waves,
    X,
    Zap,
} from 'lucide-react';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';
import { useNotification } from '@/app/context/NotificationsContext';
import MultiplayerShell from '@/app/components/multiplayer/MultiplayerShell';
import type { PlayerTileModel } from '@/app/components/multiplayer/types';

interface Ship {
    id: string;
    length: number;
    x: number | null;
    y: number | null;
    horizontal: boolean;
    placed: boolean;
}

interface ShipType {
    length: number;
    limit: number;
    label: string;
}

interface ActiveGameSeat {
    socketId: string;
    userId: string;
    name: string;
    connected?: boolean;
    avatarUrl?: string | null;
    avatar_url?: string | null;
}

interface BattleshipsWinner {
    userId?: string;
    name?: string;
}

interface BattleshipsGameState {
    boards?: number[][][];
    current_player_idx?: number;
    winner?: BattleshipsWinner;
    ready_players?: number[];
    seats?: (ActiveGameSeat | null)[];
    stage?: string;
}

interface OpponentDisconnectPayload {
    playerName?: string;
    waitTime?: number;
}

interface ActiveGameProps {
    socket: Socket | null;
    roomId: string;
    seats: (ActiveGameSeat | null)[];
    myId: string;
    gameStage: string;
    gameName: string;
    onStageChange?: (stage: string) => void;
}

const BOARD_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const BOARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function boardStats(board: number[][] | undefined) {
    const cells = board?.flat() ?? [];
    return {
        ships: cells.filter((cell) => cell === 1).length,
        hits: cells.filter((cell) => cell === 3).length,
        misses: cells.filter((cell) => cell === 2).length,
    };
}

export default function ActiveGame({ socket, roomId, seats, myId, gameStage, gameName, onStageChange }: ActiveGameProps) {
    const { lang } = useLang();
    const { notify } = useNotification();
    const [boards, setBoards] = useState<number[][][]>([[], []]);
    const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
    const [winner, setWinner] = useState<BattleshipsWinner | null>(null);
    const [readyPlayers, setReadyPlayers] = useState<number[]>([]);
    const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string; timeLeft: number } | null>(null);
    const [selectedShip, setSelectedShip] = useState<string | null>(null);
    const [draggedShip, setDraggedShip] = useState<string | null>(null);
    const [boardGrid, setBoardGrid] = useState<number[][]>(() => Array.from({ length: 10 }, () => Array(10).fill(0)));
    const [lastRotation, setLastRotation] = useState<Record<number, boolean>>({ 4: true, 3: true, 2: true, 1: true });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const shipTypes: ShipType[] = [
        { length: 4, limit: 1, label: t(lang, 'battleships.ship_4') },
        { length: 3, limit: 2, label: t(lang, 'battleships.ship_3') },
        { length: 2, limit: 3, label: t(lang, 'battleships.ship_2') },
        { length: 1, limit: 4, label: t(lang, 'battleships.ship_1') },
    ];

    const initializeShips = (): Ship[] => shipTypes.flatMap((type) =>
        Array.from({ length: type.limit }, (_, index) => ({
            id: `ship_${type.length}_${index}`,
            length: type.length,
            x: null,
            y: null,
            horizontal: true,
            placed: false,
        })),
    );

    const [ships, setShips] = useState<Ship[]>(() => initializeShips());
    const rawMyIdx = seats.findIndex((seat) => seat && String(seat.userId) === String(myId));
    const isObserver = rawMyIdx === -1;
    const myIdx = isObserver ? 0 : rawMyIdx;
    const opponentIdx = (myIdx + 1) % 2;
    const isMyTurn = !isObserver && currentTurnIdx === myIdx;
    const myPlayerName = seats[myIdx]?.name || t(lang, 'battleships.your_board');
    const opponentName = seats[opponentIdx]?.name || t(lang, 'battleships.enemy_board');

    const participantModels: PlayerTileModel[] = seats.flatMap((seat, index) => {
        if (!seat) return [];
        const stats = boardStats(boards[index]);
        const isReady = readyPlayers.includes(index);
        const activity = gameStage === 'placement' ? (isReady ? 'ready' : 'waiting') : currentTurnIdx === index ? 'active' : 'playing';
        const activityLabel = gameStage === 'placement'
            ? (isReady ? t(lang, 'battleships.ready') : t(lang, 'battleships.placing'))
            : currentTurnIdx === index ? t(lang, 'battleships.your_turn_short') : t(lang, 'battleships.enemy_turn_short');
        return {
            id: String(seat.userId || seat.socketId || `seat-${index}`),
            displayName: seat.name || t(lang, 'user.guest'),
            avatarUrl: seat.avatarUrl ?? seat.avatar_url ?? (String(seat.userId).startsWith('guest_') ? null : `/api/profile/avatar/${encodeURIComponent(String(seat.userId))}`),
            isSelf: String(seat.userId) === String(myId),
            role: 'player',
            connection: seat.connected === false ? 'disconnected' : 'connected',
            activity,
            activityLabel,
            metric: { label: t(lang, 'battleships.ships_remaining'), value: String(stats.ships) },
            outcome: winner ? (String(winner.userId ?? winner.name) === String(seat.userId ?? seat.name) ? 'won' : 'lost') : undefined,
        };
    });

    useEffect(() => {
        if (!socket) return;

        const handleGameStateUpdate = (state: BattleshipsGameState) => {
            if (state.boards) setBoards(state.boards);
            if (state.current_player_idx !== undefined) setCurrentTurnIdx(state.current_player_idx);
            if (state.winner) setWinner(state.winner);
            if (state.ready_players) setReadyPlayers(state.ready_players);
            if (state.seats) {
                const opponent = state.seats[opponentIdx];
                if (opponent && opponent.connected !== false) setOpponentDisconnected(null);
            }
            if (state.stage && onStageChange) onStageChange(state.stage);
        };

        const handleStageChanged = (data: { stage?: string }) => {
            if (data?.stage && onStageChange) onStageChange(data.stage);
        };

        const handleOpponentDisconnected = (data: OpponentDisconnectPayload) => {
            if (data?.playerName) {
                setOpponentDisconnected({ name: data.playerName, timeLeft: data.waitTime || 90 });
            }
        };

        const handleOpponentReconnected = () => setOpponentDisconnected(null);
        const handleGameEndedTimeout = () => setOpponentDisconnected(null);

        socket.on('game_state_update', handleGameStateUpdate);
        socket.on('game_stage_changed', handleStageChanged);
        socket.on('opponent_disconnected', handleOpponentDisconnected);
        socket.on('opponent_reconnected', handleOpponentReconnected);
        socket.on('game_ended_timeout', handleGameEndedTimeout);
        socket.emit('sync_state', { roomId });

        return () => {
            socket.off('game_state_update', handleGameStateUpdate);
            socket.off('game_stage_changed', handleStageChanged);
            socket.off('opponent_disconnected', handleOpponentDisconnected);
            socket.off('opponent_reconnected', handleOpponentReconnected);
            socket.off('game_ended_timeout', handleGameEndedTimeout);
        };
    }, [socket, roomId, onStageChange, opponentIdx]);

    useEffect(() => {
        if (!opponentDisconnected) return;

        const interval = setInterval(() => {
            setOpponentDisconnected((previous) => {
                if (!previous || previous.timeLeft <= 1) return null;
                return { ...previous, timeLeft: previous.timeLeft - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [opponentDisconnected?.name]);

    const canPlaceShip = (ship: Ship, newX: number, newY: number, newHorizontal: boolean) => {
        const endX = newHorizontal ? newX + ship.length : newX + 1;
        const endY = newHorizontal ? newY + 1 : newY + ship.length;

        if (newX < 0 || newY < 0 || endX > 10 || endY > 10) return false;

        const testBoard = boardGrid.map((row) => [...row]);
        if (ship.x !== null && ship.y !== null) {
            for (let index = 0; index < ship.length; index += 1) {
                const x = ship.horizontal ? ship.x + index : ship.x;
                const y = ship.horizontal ? ship.y : ship.y + index;
                testBoard[y][x] = 0;
            }
        }

        for (let index = 0; index < ship.length; index += 1) {
            const x = newHorizontal ? newX + index : newX;
            const y = newHorizontal ? newY : newY + index;
            if (testBoard[y][x] !== 0) return false;
        }

        const clearAround = (x: number, y: number) => {
            for (let dx = -1; dx <= 1; dx += 1) {
                for (let dy = -1; dy <= 1; dy += 1) {
                    const nextX = x + dx;
                    const nextY = y + dy;
                    if (nextX >= 0 && nextX < 10 && nextY >= 0 && nextY < 10 && testBoard[nextY][nextX] !== 0) {
                        return false;
                    }
                }
            }
            return true;
        };

        for (let index = 0; index < ship.length; index += 1) {
            const x = newHorizontal ? newX + index : newX;
            const y = newHorizontal ? newY : newY + index;
            if (!clearAround(x, y)) return false;
        }

        return true;
    };

    const placeShipOnBoard = (shipId: string, x: number, y: number, horizontal: boolean) => {
        setShips((previousShips) => {
            const ship = previousShips.find((item) => item.id === shipId);
            if (!ship || !canPlaceShip(ship, x, y, horizontal)) return previousShips;

            const nextBoard = Array.from({ length: 10 }, () => Array(10).fill(0));
            previousShips.forEach((item) => {
                if (item.id === shipId || !item.placed || item.x === null || item.y === null) return;
                for (let index = 0; index < item.length; index += 1) {
                    const itemX = item.horizontal ? item.x + index : item.x;
                    const itemY = item.horizontal ? item.y : item.y + index;
                    nextBoard[itemY][itemX] = 1;
                }
            });

            for (let index = 0; index < ship.length; index += 1) {
                const shipX = horizontal ? x + index : x;
                const shipY = horizontal ? y : y + index;
                nextBoard[shipY][shipX] = 1;
            }

            setBoardGrid(nextBoard);
            return previousShips.map((item) => item.id === shipId
                ? { ...item, x, y, horizontal, placed: true }
                : item,
            );
        });
    };

    const removeShipFromBoard = (shipId: string) => {
        const ship = ships.find((item) => item.id === shipId);
        if (!ship || ship.x === null || ship.y === null) return;

        const nextBoard = boardGrid.map((row) => [...row]);
        for (let index = 0; index < ship.length; index += 1) {
            const x = ship.horizontal ? ship.x + index : ship.x;
            const y = ship.horizontal ? ship.y : ship.y + index;
            nextBoard[y][x] = 0;
        }

        setBoardGrid(nextBoard);
        setShips((previousShips) => previousShips.map((item) => item.id === shipId
            ? { ...item, x: null, y: null, placed: false }
            : item,
        ));
    };

    const selectShip = (shipId: string) => {
        setSelectedShip((current) => current === shipId ? null : shipId);
        setShips((previousShips) => previousShips.map((ship) => {
            if (ship.id !== shipId || ship.placed) return ship;
            return { ...ship, horizontal: lastRotation[ship.length] };
        }));
    };

    const handleDragStart = (shipId: string, event?: React.DragEvent<HTMLButtonElement>) => {
        setDraggedShip(shipId);
        setIsDragging(true);
        setSelectedShip(shipId);
        setShips((previousShips) => previousShips.map((ship) => {
            if (ship.id !== shipId || ship.placed) return ship;
            return { ...ship, horizontal: lastRotation[ship.length] };
        }));
        if (event?.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
        }
    };

    const handleDrag = (event: React.DragEvent<HTMLButtonElement>) => {
        if (event.clientX !== 0 && event.clientY !== 0) {
            setMousePos({ x: event.clientX, y: event.clientY });
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedShip(null);
    };

    const handleDropOnBoard = (event: React.DragEvent<HTMLButtonElement>, cellX: number, cellY: number) => {
        event.preventDefault();
        if (!draggedShip) return;
        const ship = ships.find((item) => item.id === draggedShip);
        if (ship) placeShipOnBoard(draggedShip, cellX, cellY, ship.horizontal);
        handleDragEnd();
    };

    const handleDropOutsideBoard = (event: React.DragEvent<HTMLElement>) => {
        event.preventDefault();
        if (draggedShip) removeShipFromBoard(draggedShip);
        handleDragEnd();
    };

    function toggleRotation(shipId: string) {
        const ship = ships.find((item) => item.id === shipId);
        if (!ship) return;

        const newHorizontal = !ship.horizontal;
        setLastRotation((previous) => ({ ...previous, [ship.length]: newHorizontal }));
        if (ship.x !== null && ship.y !== null) {
            if (canPlaceShip(ship, ship.x, ship.y, newHorizontal)) {
                placeShipOnBoard(shipId, ship.x, ship.y, newHorizontal);
            }
            return;
        }

        setShips((previousShips) => previousShips.map((item) => item.id === shipId
            ? { ...item, horizontal: newHorizontal }
            : item,
        ));
    }

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if ((event.key === 'r' || event.key === 'R') && selectedShip && gameStage === 'placement') {
                toggleRotation(selectedShip);
                event.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedShip, gameStage, ships, lastRotation, toggleRotation]);

    const handleCellClick = (x: number, y: number, boardOwnerIdx: number) => {
        if (gameStage === 'placement' && boardOwnerIdx === myIdx && selectedShip) {
            const ship = ships.find((item) => item.id === selectedShip);
            if (ship && canPlaceShip(ship, x, y, ship.horizontal)) {
                placeShipOnBoard(selectedShip, x, y, ship.horizontal);
            }
            return;
        }

        if (gameStage === 'playing' && boardOwnerIdx === opponentIdx && isMyTurn && boards[opponentIdx]?.[y]?.[x] === 0) {
            socket?.emit('player_move', { roomId, move: { type: 'shoot', x, y } });
        }
    };

    const handleConfirmPlacement = () => {
        if (isObserver) return;
        const allPlaced = ships.every((ship) => ship.placed);
        if (!allPlaced) {
            notify(t(lang, 'battleships.place_all'), 'warning');
            return;
        }
        socket?.emit('player_move', { roomId, move: { type: 'confirm_placement', board: boardGrid } });
    };

    const placedShipsCount = ships.filter((ship) => ship.placed).length;
    const totalShipsCount = ships.length;
    const allPlaced = placedShipsCount === totalShipsCount;
    const draggedShipObject = draggedShip ? ships.find((ship) => ship.id === draggedShip) : null;
    const myStats = boardStats(boards[myIdx]);
    const opponentStats = boardStats(boards[opponentIdx]);

    const findShipAtCell = (x: number, y: number) => ships.find((ship) => {
        if (!ship.placed || ship.x === null || ship.y === null) return false;
        return ship.horizontal
            ? y === ship.y && x >= ship.x && x < ship.x + ship.length
            : x === ship.x && y >= ship.y && y < ship.y + ship.length;
    });

    const renderCell = (value: number, x: number, y: number, ownerIdx: number) => {
        const isPlacement = gameStage === 'placement' && ownerIdx === myIdx;
        const ship = isPlacement ? findShipAtCell(x, y) : null;
        const isTargetable = gameStage === 'playing' && ownerIdx === opponentIdx && isMyTurn && value === 0;
        const isOccupied = isPlacement ? boardGrid[y][x] === 1 : value === 1 && ownerIdx === myIdx;
        const isDragged = Boolean(ship && ship.id === draggedShip);
        const label = isPlacement
            ? `${BOARD_LABELS[x]}${y + 1}${isOccupied ? `, ${t(lang, 'battleships.ship_cell')}` : ''}`
            : `${BOARD_LABELS[x]}${y + 1}${value === 3 ? `, ${t(lang, 'battleships.hit_cell')}` : value === 2 ? `, ${t(lang, 'battleships.miss_cell')}` : isOccupied ? `, ${t(lang, 'battleships.ship_cell')}` : ''}`;

        return (
            <button
                key={`${ownerIdx}-${x}-${y}`}
                type="button"
                className={`battleships-cell ${isOccupied ? 'is-ship' : ''} ${value === 2 ? 'is-miss' : ''} ${value === 3 ? 'is-hit' : ''} ${isTargetable ? 'is-targetable' : ''} ${isDragged ? 'is-dragged' : ''}`}
                aria-label={label}
                disabled={!isPlacement && !isTargetable}
                draggable={Boolean(isPlacement && ship)}
                onClick={() => {
                    if (ship) selectShip(ship.id);
                    else handleCellClick(x, y, ownerIdx);
                }}
                onDragStart={(event) => ship && handleDragStart(ship.id, event)}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => isPlacement && event.preventDefault()}
                onDrop={(event) => isPlacement && handleDropOnBoard(event, x, y)}
            >
                {value === 2 && <span className="battleships-cell__miss" aria-hidden="true" />}
                {value === 3 && <X className="battleships-cell__hit" size={18} strokeWidth={2.5} aria-hidden="true" />}
                {isPlacement && ship && <span className="battleships-cell__ship-mark" aria-hidden="true" />}
            </button>
        );
    };

    const renderBoard = (board: number[][], ownerIdx: number, title: string, subtitle: string, tone: 'friendly' | 'enemy') => (
        <section className={`battleships-board-card battleships-board-card--${tone}`} aria-label={title}>
            <header className="battleships-board-card__header">
                <div className="battleships-board-card__identity">
                    <span className="battleships-board-card__icon" aria-hidden="true">
                        {tone === 'enemy' ? <Target size={18} /> : <Shield size={18} />}
                    </span>
                    <div>
                        <h2>{title}</h2>
                        <p>{subtitle}</p>
                    </div>
                </div>
                <span className="battleships-board-card__code">{tone === 'enemy' && isMyTurn ? 'TARGET' : 'GRID 10 × 10'}</span>
            </header>
            <div className="battleships-board-frame">
                <div className="battleships-axis-corner" aria-hidden="true" />
                <div className="battleships-axis battleships-axis--top" aria-hidden="true">
                    {BOARD_LABELS.map((label) => <span key={label}>{label}</span>)}
                </div>
                <div className="battleships-axis battleships-axis--side" aria-hidden="true">
                    {BOARD_NUMBERS.map((number) => <span key={number}>{number}</span>)}
                </div>
                <div className="battleships-grid" role="group" aria-label={title}>
                    {board?.map((row, y) => row.map((value, x) => renderCell(value, x, y, ownerIdx)))}
                </div>
            </div>
            <footer className="battleships-board-card__footer">
                <span><span className="battleships-legend-dot is-ship" aria-hidden="true" />{t(lang, 'battleships.fleet')}</span>
                <span><span className="battleships-legend-dot is-miss" aria-hidden="true" />{t(lang, 'battleships.misses')}</span>
                <span><span className="battleships-legend-dot is-hit" aria-hidden="true" />{t(lang, 'battleships.hits')}</span>
            </footer>
        </section>
    );

    const renderShipPreview = (ship: Ship, small = false) => (
        <span className={`battleships-ship-preview ${ship.horizontal ? 'is-horizontal' : 'is-vertical'} ${small ? 'is-small' : ''}`} aria-hidden="true">
            {Array.from({ length: ship.length }, (_, index) => <span key={index} />)}
        </span>
    );

    return (
        <MultiplayerShell
            stage={isObserver ? 'observer' : winner ? 'finished' : opponentDisconnected ? 'disconnected' : 'active'}
            participantTitle={t(lang, 'multiplayer.participants')}
            participants={participantModels}
            className="multiplayer-active-shell multiplayer-active-shell--battleships"
        >
        <div className="game-runtime-game game-runtime-battleships">
            {draggedShipObject && isDragging && (
                <div className="battleships-drag-ghost" style={{ left: mousePos.x + 12, top: mousePos.y + 12 }} aria-hidden="true">
                    {renderShipPreview(draggedShipObject)}
                    <span>{t(lang, 'battleships.holding')}</span>
                </div>
            )}

            {opponentDisconnected && (
                <OpponentDisconnectedBanner name={opponentDisconnected.name} timeLeft={opponentDisconnected.timeLeft} />
            )}

            <header className="battleships-command-header">
                <div className="battleships-command-brand">
                    <span className="battleships-command-brand__mark" aria-hidden="true"><Anchor size={18} /></span>
                    <div>
                        <span className="battleships-command-brand__title">STATKI</span>
                        <span className="battleships-command-brand__subtitle">{t(lang, 'battleships.fleet')}</span>
                    </div>
                </div>
                <div className="battleships-command-status" aria-live="polite">
                    <span className="battleships-live-dot" aria-hidden="true" />
                    <span>{t(lang, 'battleships.live')}</span>
                    <span className="battleships-command-status__divider" aria-hidden="true" />
                    <span>{t(lang, 'battleships.room_code')} {roomId.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="battleships-command-signal">
                    <Radio size={16} aria-hidden="true" />
                    <span>{t(lang, 'battleships.connected')}</span>
                </div>
            </header>

            {isObserver && gameStage !== 'game_over' && (
                <div className="battleships-observer-banner" role="status">
                    <Eye size={16} aria-hidden="true" />
                    {t(lang, 'battleships.observer')}
                </div>
            )}

            {gameStage === 'placement' && !isObserver && (
                <main id="main-content" className="battleships-stage">
                    <header className="battleships-stage-heading">
                        <div>
                            <p className="battleships-eyebrow"><ScanLine size={14} aria-hidden="true" />{t(lang, 'battleships.setup_phase')}</p>
                            <h1>{t(lang, 'battleships.place_ships')}</h1>
                            <p className="battleships-stage-description">{t(lang, 'battleships.drag_hint')}. {t(lang, 'battleships.rotate_hint')}.</p>
                        </div>
                        <div className="battleships-progress-meter" aria-label={`${t(lang, 'battleships.progress')}: ${placedShipsCount}/${totalShipsCount}`}>
                            <span>{t(lang, 'battleships.progress')}</span>
                            <strong>{String(placedShipsCount).padStart(2, '0')}<small>/{totalShipsCount}</small></strong>
                            <span className="battleships-progress-meter__track"><span style={{ width: `${(placedShipsCount / totalShipsCount) * 100}%` }} /></span>
                        </div>
                    </header>

                    <div className="battleships-setup-layout">
                        <aside className="battleships-panel battleships-fleet-panel" onDragOver={(event) => event.preventDefault()} onDrop={handleDropOutsideBoard}>
                            <div className="battleships-panel-heading">
                                <div>
                                    <p className="battleships-panel-kicker">01 / {t(lang, 'battleships.fleet')}</p>
                                    <h2>{t(lang, 'battleships.fleet')}</h2>
                                </div>
                                <ShipIcon size={20} aria-hidden="true" />
                            </div>
                            <div className="battleships-ship-list">
                                {shipTypes.map((type) => {
                                    const shipsOfType = ships.filter((ship) => ship.length === type.length);
                                    const placedCount = shipsOfType.filter((ship) => ship.placed).length;
                                    const firstAvailable = shipsOfType.find((ship) => !ship.placed);
                                    const allPlacedOfType = placedCount === type.limit;
                                    return (
                                        <button
                                            key={type.length}
                                            type="button"
                                            className={`battleships-ship-picker ${allPlacedOfType ? 'is-complete' : ''} ${firstAvailable && selectedShip === firstAvailable.id ? 'is-selected' : ''}`}
                                            draggable={Boolean(firstAvailable)}
                                            onClick={() => firstAvailable && selectShip(firstAvailable.id)}
                                            onDragStart={(event) => firstAvailable && handleDragStart(firstAvailable.id, event)}
                                            onDrag={handleDrag}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <span className="battleships-ship-picker__visual">
                                                {firstAvailable ? renderShipPreview(firstAvailable, true) : <Check size={18} aria-hidden="true" />}
                                            </span>
                                            <span className="battleships-ship-picker__copy">
                                                <strong>{type.label}</strong>
                                                <small>{type.length} {type.length === 1 ? t(lang, 'battleships.cell') : t(lang, 'battleships.cells')}</small>
                                            </span>
                                            <span className="battleships-ship-picker__count">{placedCount}/{type.limit}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="battleships-panel-note">
                                <Info size={15} aria-hidden="true" />
                                <span>{t(lang, 'battleships.hint_remove')}</span>
                            </div>
                        </aside>

                        <section className="battleships-placement-board" aria-labelledby="placement-board-title">
                            <div className="battleships-board-label-row">
                                <div>
                                    <p className="battleships-panel-kicker">02 / {t(lang, 'battleships.your_board')}</p>
                                    <h2 id="placement-board-title">{t(lang, 'battleships.your_board')}</h2>
                                </div>
                                <span className="battleships-key-hint"><RotateCw size={14} aria-hidden="true" /><kbd>R</kbd>{t(lang, 'battleships.rotate_hint')}</span>
                            </div>
                            <div className="battleships-board-frame battleships-board-frame--placement">
                                <div className="battleships-axis-corner" aria-hidden="true" />
                                <div className="battleships-axis battleships-axis--top" aria-hidden="true">{BOARD_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
                                <div className="battleships-axis battleships-axis--side" aria-hidden="true">{BOARD_NUMBERS.map((number) => <span key={number}>{number}</span>)}</div>
                                <div className="battleships-grid" role="group" aria-label={t(lang, 'battleships.your_board')}>
                                    {boardGrid.map((row, y) => row.map((value, x) => renderCell(value, x, y, myIdx)))}
                                </div>
                            </div>
                            <div className="battleships-placement-footer">
                                <span><Move size={14} aria-hidden="true" />{t(lang, 'battleships.hint_drag')}</span>
                                <span><RotateCw size={14} aria-hidden="true" />{t(lang, 'battleships.hint_rotate')}</span>
                            </div>
                        </section>

                        <aside className="battleships-panel battleships-readiness-panel">
                            <div className="battleships-panel-heading">
                                <div>
                                    <p className="battleships-panel-kicker">03 / STATUS</p>
                                    <h2>{t(lang, 'battleships.ready')}</h2>
                                </div>
                                <Zap size={20} aria-hidden="true" />
                            </div>
                            <div className={`battleships-player-status ${readyPlayers.includes(myIdx) ? 'is-ready' : ''}`}>
                                <span className="battleships-player-status__icon">{readyPlayers.includes(myIdx) ? <Check size={16} /> : <span>01</span>}</span>
                                <span><strong>{t(lang, 'battleships.your_board')}</strong><small>{readyPlayers.includes(myIdx) ? t(lang, 'battleships.ready') : t(lang, 'battleships.placing')}</small></span>
                            </div>
                            <div className={`battleships-player-status ${readyPlayers.includes(opponentIdx) ? 'is-ready' : ''}`}>
                                <span className="battleships-player-status__icon">{readyPlayers.includes(opponentIdx) ? <Check size={16} /> : <span>02</span>}</span>
                                <span><strong>{t(lang, 'battleships.enemy_board')}</strong><small>{readyPlayers.includes(opponentIdx) ? t(lang, 'battleships.enemy_ready') : t(lang, 'battleships.enemy_placing')}</small></span>
                            </div>
                            <div className="battleships-readiness-spacer" />
                            <button type="button" onClick={handleConfirmPlacement} disabled={!allPlaced || readyPlayers.includes(myIdx)} className="battleships-confirm-button">
                                {readyPlayers.includes(myIdx) ? <><Radio size={16} aria-hidden="true" />{t(lang, 'battleships.waiting_enemy')}</> : <><Crosshair size={16} aria-hidden="true" />{allPlaced ? t(lang, 'battleships.confirm_fight') : `${t(lang, 'battleships.place_all')} (${placedShipsCount}/${totalShipsCount})`}</>}
                            </button>
                        </aside>
                    </div>
                </main>
            )}

            {gameStage === 'playing' && (
                <main id="main-content" className="battleships-stage battleships-combat-stage">
                    <header className="battleships-stage-heading battleships-stage-heading--combat">
                        <div>
                            <p className="battleships-eyebrow"><Crosshair size={14} aria-hidden="true" />{t(lang, 'battleships.battle_phase')}</p>
                            <h1>{isMyTurn ? t(lang, 'battleships.your_turn') : t(lang, 'battleships.enemy_turn')}</h1>
                            <p className="battleships-stage-description">{isMyTurn ? t(lang, 'battleships.shot_hint') : t(lang, 'battleships.enemy_turn')}</p>
                        </div>
                        <div className={`battleships-turn-indicator ${isMyTurn ? 'is-yours' : 'is-enemy'}`} role="status" aria-live="polite">
                            <span className="battleships-turn-indicator__dot" />
                            <strong>{isMyTurn ? t(lang, 'battleships.your_turn_short') : t(lang, 'battleships.enemy_turn_short')}</strong>
                            <small>{t(lang, 'battleships.targeting')}</small>
                        </div>
                    </header>

                    <div className="battleships-combat-layout">
                        {renderBoard(boards[myIdx], myIdx, myPlayerName, t(lang, 'battleships.your_board'), 'friendly')}
                        {renderBoard(boards[opponentIdx], opponentIdx, opponentName, t(lang, 'battleships.enemy_board'), 'enemy')}
                        <aside className="battleships-panel battleships-telemetry-panel">
                            <div className="battleships-panel-heading">
                                <div>
                                    <p className="battleships-panel-kicker">RADAR / 10 × 10</p>
                                    <h2>{t(lang, 'battleships.fleet_status')}</h2>
                                </div>
                                <Waves size={20} aria-hidden="true" />
                            </div>
                            <div className="battleships-stat-list">
                                <div><span>{t(lang, 'battleships.ships_remaining')}</span><strong>{myStats.ships}</strong></div>
                                <div><span>{t(lang, 'battleships.hits')}</span><strong>{opponentStats.hits}</strong></div>
                                <div><span>{t(lang, 'battleships.misses')}</span><strong>{opponentStats.misses}</strong></div>
                            </div>
                            <div className="battleships-telemetry-note">
                                <Target size={16} aria-hidden="true" />
                                <span>{isMyTurn ? t(lang, 'battleships.shot_hint') : t(lang, 'battleships.waiting_enemy')}</span>
                            </div>
                        </aside>
                    </div>
                </main>
            )}

            {winner && (
                <div className="battleships-result-overlay" role="presentation">
                    <section className="battleships-result-card" role="dialog" aria-modal="true" aria-labelledby="battleships-result-title">
                        <span className="battleships-result-card__icon" aria-hidden="true"><Trophy size={28} /></span>
                        <p className="battleships-eyebrow">{t(lang, 'battleships.game_over')}</p>
                        <h2 id="battleships-result-title">{winner.name === myPlayerName ? t(lang, 'battleships.victory') : t(lang, 'battleships.defeat')}</h2>
                        <p>{t(lang, 'battleships.winner')}: <strong>{winner.name}</strong></p>
                        <Link href={`/lobby/${gameName}`} className="battleships-confirm-button battleships-result-card__action">{t(lang, 'battleships.back_to_lobby')}<ChevronRight size={16} aria-hidden="true" /></Link>
                    </section>
                </div>
            )}
        </div>
        </MultiplayerShell>
    );
}

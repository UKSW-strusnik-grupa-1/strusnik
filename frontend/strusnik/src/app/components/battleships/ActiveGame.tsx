'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '@/app/lang';
import { t } from '@/app/i18n';
import OpponentDisconnectedBanner from '@/app/components/common/OpponentDisconnectedBanner';

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

interface ActiveGameProps {
    socket: any;
    roomId: string;
    seats: any[];
    myId: string;
    gameStage: string;
    gameName: string;
    onStageChange?: (stage: string) => void;
}

export default function ActiveGame({ socket, roomId, seats, myId, gameStage, gameName, onStageChange }: ActiveGameProps) {
    const { lang } = useLang();
    const [boards, setBoards] = useState<number[][][]>([[], []]);
    const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
    const [winner, setWinner] = useState<any>(null);
    const [readyPlayers, setReadyPlayers] = useState<number[]>([]);

    const shipTypes: ShipType[] = [
        { length: 4, limit: 1, label: t(lang, 'battleships.ship_4') },
        { length: 3, limit: 2, label: t(lang, 'battleships.ship_3') },
        { length: 2, limit: 3, label: t(lang, 'battleships.ship_2') },
        { length: 1, limit: 4, label: t(lang, 'battleships.ship_1') },
    ];

    const initializeShips = (): Ship[] => {
        const ships: Ship[] = [];
        let id = 0;
        shipTypes.forEach(type => {
            for (let i = 0; i < type.limit; i++) {
                ships.push({
                    id: `ship_${type.length}_${i}`,
                    length: type.length,
                    x: null,
                    y: null,
                    horizontal: true,
                    placed: false,
                });
            }
        });
        return ships;
    };

    const [ships, setShips] = useState<Ship[]>(initializeShips());
    const [draggedShip, setDraggedShip] = useState<string | null>(null);
    const [selectedShip, setSelectedShip] = useState<string | null>(null);
    const [boardGrid, setBoardGrid] = useState<number[][]>(Array(10).fill(0).map(() => Array(10).fill(0)));
    const [opponentDisconnected, setOpponentDisconnected] = useState<{ name: string, timeLeft: number } | null>(null);
    const [lastRotation, setLastRotation] = useState<{ [key: number]: boolean }>({ 4: true, 3: true, 2: true, 1: true });
    const [mousePos, setMousePos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const myIdx = Math.max(0, seats.findIndex(s => s && String(s.userId) === String(myId)));
    const opponentIdx = (myIdx + 1) % 2;
    const isMyTurn = currentTurnIdx === myIdx;

    useEffect(() => {
        if (!socket) return;

        const handleGameStateUpdate = (state: any) => {
            console.log('ActiveGame received game_state_update:', state);
            if (state.boards) setBoards(state.boards);
            if (state.current_player_idx !== undefined) setCurrentTurnIdx(state.current_player_idx);
            if (state.winner) setWinner(state.winner);
            if (state.ready_players) setReadyPlayers(state.ready_players);
            if (state.seats) {
                const opponent = state.seats[opponentIdx];
                if (opponent && opponent.connected) {
                    setOpponentDisconnected(null);
                }
            }
            if (state.stage && onStageChange) {
                console.log('Notifying parent of stage change:', state.stage);
                onStageChange(state.stage);
            }
        };

        const handleStageChanged = (data: any) => {
            console.log('ActiveGame received game_stage_changed:', data);
            if (data && data.stage && onStageChange) {
                onStageChange(data.stage);
            }
        };

        const handleOpponentDisconnected = (data: any) => {
            console.log('Opponent disconnected:', data);
            if (data.playerName) {
                setOpponentDisconnected({ name: data.playerName, timeLeft: data.waitTime || 90 });
            }
        };

        const handleOpponentReconnected = (data: any) => {
            console.log('Opponent reconnected:', data);
            setOpponentDisconnected(null);
        };

        const handleGameEndedTimeout = () => {
            setOpponentDisconnected(null);
        };

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
            setOpponentDisconnected(prev => {
                if (!prev || prev.timeLeft <= 1) return null;
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [opponentDisconnected?.name]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if ((e.key === 'r' || e.key === 'R') && selectedShip && gameStage === 'placement') {
                toggleRotation(selectedShip);
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedShip, gameStage]);

    const canPlaceShip = (ship: Ship, newX: number, newY: number, newHorizontal: boolean): boolean => {
        if (newX === null || newY === null) return false;

        const endX = newHorizontal ? newX + ship.length : newX;
        const endY = newHorizontal ? newY : newY + ship.length;

        if (endX > 10 || endY > 10) return false;

        const testBoard = boardGrid.map(row => [...row]);

        if (ship.x !== null && ship.y !== null) {
            if (ship.horizontal) {
                for (let i = 0; i < ship.length; i++) {
                    if (testBoard[ship.y]) testBoard[ship.y][ship.x + i] = 0;
                }
            } else {
                for (let i = 0; i < ship.length; i++) {
                    if (testBoard[ship.y + i]) testBoard[ship.y + i][ship.x] = 0;
                }
            }
        }

        if (newHorizontal) {
            for (let i = 0; i < ship.length; i++) {
                if (testBoard[newY] && testBoard[newY][newX + i] !== 0) return false;
            }
        } else {
            for (let i = 0; i < ship.length; i++) {
                if (testBoard[newY + i] && testBoard[newY + i][newX] !== 0) return false;
            }
        }

        const checkArea = (x: number, y: number) => {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && testBoard[ny][nx] !== 0) {
                        return false;
                    }
                }
            }
            return true;
        };

        if (newHorizontal) {
            for (let i = 0; i < ship.length; i++) {
                if (!checkArea(newX + i, newY)) return false;
            }
        } else {
            for (let i = 0; i < ship.length; i++) {
                if (!checkArea(newX, newY + i)) return false;
            }
        }

        return true;
    };

    const placeShipOnBoard = (shipId: string, x: number, y: number, horizontal: boolean) => {
        setShips(prevShips => {
            const ship = prevShips.find(s => s.id === shipId);
            if (!ship) return prevShips;

            if (ship.placed && ship.x === x && ship.y === y && ship.horizontal === horizontal) {
                return prevShips;
            }

            const testBoard = Array(10).fill(0).map(() => Array(10).fill(0));
            prevShips.forEach(s => {
                if (s.id !== shipId && s.placed && s.x !== null && s.y !== null) {
                    if (s.horizontal) {
                        for (let i = 0; i < s.length; i++) {
                            testBoard[s.y][s.x + i] = 1;
                        }
                    } else {
                        for (let i = 0; i < s.length; i++) {
                            testBoard[s.y + i][s.x] = 1;
                        }
                    }
                }
            });

            const endX = horizontal ? x + ship.length : x;
            const endY = horizontal ? y : y + ship.length;
            if (endX > 10 || endY > 10) return prevShips;

            const checkArea = (cx: number, cy: number) => {
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = cx + dx, ny = cy + dy;
                        if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && testBoard[ny][nx] !== 0) {
                            return false;
                        }
                    }
                }
                return true;
            };

            if (horizontal) {
                for (let i = 0; i < ship.length; i++) {
                    if (!checkArea(x + i, y)) return prevShips;
                }
            } else {
                for (let i = 0; i < ship.length; i++) {
                    if (!checkArea(x, y + i)) return prevShips;
                }
            }

            if (horizontal) {
                for (let i = 0; i < ship.length; i++) {
                    testBoard[y][x + i] = 1;
                }
            } else {
                for (let i = 0; i < ship.length; i++) {
                    testBoard[y + i][x] = 1;
                }
            }

            setBoardGrid(testBoard);

            return prevShips.map(s =>
                s.id === shipId ? { ...s, x, y, horizontal, placed: true } : s
            );
        });
    };

    const removeShipFromBoard = (shipId: string) => {
        const ship = ships.find(s => s.id === shipId);
        if (!ship || ship.x === null || ship.y === null) return;

        const newBoard = boardGrid.map(row => [...row]);

        if (ship.horizontal) {
            for (let i = 0; i < ship.length; i++) {
                newBoard[ship.y][ship.x + i] = 0;
            }
        } else {
            for (let i = 0; i < ship.length; i++) {
                newBoard[ship.y + i][ship.x] = 0;
            }
        }

        setBoardGrid(newBoard);
        setShips(ships.map(s =>
            s.id === shipId ? { ...s, x: null, y: null, placed: false } : s
        ));
    };

    const handleDragStart = (shipId: string, e?: React.DragEvent) => {
        setDraggedShip(shipId);
        setIsDragging(true);
        const ship = ships.find(s => s.id === shipId);
        if (ship) {
            setSelectedShip(shipId);

            if (e && e.dataTransfer) {
                const emptyImg = new Image();
                emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(emptyImg, 0, 0);
                e.dataTransfer.effectAllowed = 'move';
            }
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        if (e.clientX !== 0 && e.clientY !== 0) {
            setMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedShip(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDropOnBoard = (e: React.DragEvent, cellX: number, cellY: number) => {
        e.preventDefault();
        if (!draggedShip) return;

        const ship = ships.find(s => s.id === draggedShip);
        if (!ship) return;

        placeShipOnBoard(draggedShip, cellX, cellY, ship.horizontal);
        setDraggedShip(null);
        setIsDragging(false);
    };

    const handleDropOutsideBoard = (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedShip) return;

        removeShipFromBoard(draggedShip);
        setDraggedShip(null);
        setIsDragging(false);
    };

    const toggleRotation = (shipId: string) => {
        const ship = ships.find(s => s.id === shipId);
        if (!ship) return;

        const newHorizontal = !ship.horizontal;

        setLastRotation(prev => ({ ...prev, [ship.length]: newHorizontal }));

        if (ship.x !== null && ship.y !== null) {
            if (!canPlaceShip(ship, ship.x, ship.y, newHorizontal)) {
                return;
            }
            placeShipOnBoard(shipId, ship.x, ship.y, newHorizontal);
        } else {
            setShips(ships.map(s =>
                s.id === shipId ? { ...s, horizontal: newHorizontal } : s
            ));
        }
    };

    const handleShipClick = (shipId: string) => {
        setSelectedShip(selectedShip === shipId ? null : shipId);
    };

    const handleConfirmPlacement = () => {
        const allPlaced = ships.every(s => s.placed);
        if (!allPlaced) {
            alert(t(lang, 'battleships.place_all'));
            return;
        }
        socket.emit('player_move', { roomId, move: { type: 'confirm_placement', board: boardGrid } });
    };

    const renderShipVisual = (ship: Ship, size: 'small' | 'large' = 'small') => {
        const cellSize = size === 'large' ? 32 : 20;
        const gap = 2;

        return (
            <div
                className={`flex ${ship.horizontal ? 'flex-row' : 'flex-col'}`}
                style={{ gap: `${gap}px` }}
            >
                {Array(ship.length).fill(0).map((_, i) => (
                    <div
                        key={i}
                        className="relative overflow-hidden rounded-sm shadow-md"
                        style={{
                            width: cellSize,
                            height: cellSize,
                            background: 'linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)',
                            border: '1px solid #94a3b8'
                        }}
                    >
                        <div className="absolute inset-0.5 rounded-sm bg-gradient-to-br from-slate-400/30 to-transparent" />
                        {i === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                                ▶
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const handleBoardClickPlacement = (x: number, y: number) => {
        if (!selectedShip) return;

        const ship = ships.find(s => s.id === selectedShip);
        if (!ship) return;

        if (canPlaceShip(ship, x, y, ship.horizontal)) {
            placeShipOnBoard(selectedShip, x, y, ship.horizontal);
        }
    };

    const renderCell = (val: number, x: number, y: number, ownerIdx: number) => {
        let cellStyle = "bg-cyan-900/30 hover:bg-cyan-800/40";
        let content = null;

        if (val === 1 && ownerIdx === myIdx) {
            cellStyle = "bg-gradient-to-br from-slate-500 to-slate-600";
        }
        if (val === 2) {
            cellStyle = "bg-cyan-900/30";
            content = (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white/80 shadow-inner" />
                </div>
            );
        }
        if (val === 3) {
            cellStyle = "bg-gradient-to-br from-red-600 to-red-700";
            content = (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-lg font-bold">✕</span>
                </div>
            );
        }

        if (gameStage === 'placement' && ownerIdx === myIdx) {
            const ship = ships.find(s => s.x === x && s.y === y);
            const hasShipPart = boardGrid[y][x] === 1;
            const isBeingDragged = ship && isDragging && draggedShip === ship.id;
            
            const isSelectedTarget = selectedShip && !isDragging; 

            return (
                <div
                    key={`${x}-${y}`}
                    onClick={() => handleBoardClickPlacement(x, y)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnBoard(e, x, y)}
                    className={`
                        w-8 h-8 border border-cyan-600/30 relative group transition-all duration-150
                        ${hasShipPart
                            ? isBeingDragged
                                ? 'bg-amber-500/30 border-amber-400'
                                : 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-inner'
                            : isSelectedTarget 
                                ? 'bg-cyan-900/30 hover:bg-amber-500/20 cursor-pointer' 
                                : 'bg-cyan-900/30 hover:bg-cyan-700/40 cursor-crosshair'
                        }
                    `}
                >
                    {ship && (
                        <>
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(ship.id, e)}
                                onDrag={handleDrag}
                                onDragEnd={handleDragEnd}
                                className="absolute inset-0 cursor-move z-10"
                                title={`${t(lang, 'battleships.drag_to_move')} ${ship.length}m`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShipClick(ship.id);
                                }}
                            />
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-50 bg-amber-400 transition-opacity pointer-events-none" />
                        </>
                    )}
                </div>
            );
        }

        const isClickable = gameStage === 'playing' && ownerIdx === opponentIdx && isMyTurn;

        return (
            <div
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y, ownerIdx)}
                className={`
                    w-8 h-8 border border-cyan-600/20 relative transition-all duration-150
                    ${cellStyle}
                    ${isClickable ? 'cursor-crosshair hover:bg-red-500/40 hover:border-red-400/50' : ''}
                `}
            >
                {content}
            </div>
        );
    };

    const handleCellClick = (x: number, y: number, boardOwnerIdx: number) => {
        if (gameStage === 'playing' && boardOwnerIdx === opponentIdx && isMyTurn) {
            socket.emit('player_move', { roomId, move: { type: 'shoot', x, y } });
        }
    };

    const getShipGroupInfo = (length: number) => {
        const allShipsOfType = ships.filter(s => s.length === length);
        const placedCount = allShipsOfType.filter(s => s.placed).length;
        const availableCount = allShipsOfType.length - placedCount;
        let firstAvailable = allShipsOfType.find(s => !s.placed);

        if (firstAvailable && firstAvailable.horizontal !== lastRotation[length]) {
            setShips(prev => prev.map(s =>
                s.id === firstAvailable!.id ? { ...s, horizontal: lastRotation[length] } : s
            ));
            firstAvailable = { ...firstAvailable, horizontal: lastRotation[length] };
        }

        return { allShipsOfType, placedCount, availableCount, firstAvailable };
    };

    const placedShipsCount = ships.filter(s => s.placed).length;
    const totalShipsCount = ships.length;
    const allPlaced = placedShipsCount === totalShipsCount;

    const draggedShipObj = draggedShip ? ships.find(s => s.id === draggedShip) : null;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white p-4 overflow-auto">
            {isDragging && draggedShipObj && (
                <div
                    className="fixed pointer-events-none z-[100]"
                    style={{
                        left: mousePos.x + 10,
                        top: mousePos.y + 10,
                    }}
                >
                    <div className={`flex ${draggedShipObj.horizontal ? 'flex-row' : 'flex-col'} gap-0.5 opacity-90`}>
                        {Array(draggedShipObj.length).fill(0).map((_, i) => (
                            <div
                                key={i}
                                className="w-7 h-7 bg-amber-500 border-2 border-amber-300 rounded-sm shadow-lg shadow-amber-500/50"
                            />
                        ))}
                    </div>
                    <div className="text-xs text-amber-300 text-center mt-1 font-bold drop-shadow-lg">
                        {t(lang, 'battleships.holding')}
                    </div>
                </div>
            )}

            {opponentDisconnected && (
                <OpponentDisconnectedBanner
                    name={opponentDisconnected.name}
                    timeLeft={opponentDisconnected.timeLeft}
                />
            )}

            {winner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-amber-900/90 to-amber-950/90 p-10 border-2 border-amber-500 rounded-2xl shadow-2xl text-center">
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-3xl font-bold text-amber-400 mb-2">{t(lang, 'battleships.victory')}</h2>
                        <p className="text-xl text-white mb-6">{t(lang, 'battleships.winner')}: <span className="font-bold text-amber-300">{winner.name}</span></p>
                        <Link
                            href={`/lobby/${gameName}`}
                            className="inline-block px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl uppercase tracking-wider transition-all duration-300 shadow-lg hover:scale-105"
                        >
                            {t(lang, 'battleships.back_to_lobby')}
                        </Link>
                    </div>
                </div>
            )}

            {gameStage === 'placement' && (
                <div className="flex flex-col items-center w-full max-w-5xl">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-amber-400 mb-2 tracking-wide">
                            ⚓ {t(lang, 'battleships.place_ships')}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {t(lang, 'battleships.drag_hint')} • <kbd className="px-2 py-1 bg-amber-900/50 rounded text-amber-300 font-mono">R</kbd> {t(lang, 'battleships.rotate_hint')}
                        </p>
                    </div>

                    <div className="flex gap-8 items-start justify-center flex-wrap">
                        <div
                            className="flex flex-col gap-3 p-5 bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-amber-700/40 rounded-xl shadow-xl backdrop-blur-sm min-w-[200px]"
                            onDragOver={handleDragOver}
                            onDrop={handleDropOutsideBoard}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🚢</span>
                                <h3 className="text-amber-400 font-bold uppercase tracking-wider">{t(lang, 'battleships.fleet')}</h3>
                            </div>

                            <div className="mb-3">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>{t(lang, 'battleships.progress')}</span>
                                    <span>{placedShipsCount}/{totalShipsCount}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-green-500 transition-all duration-300"
                                        style={{ width: `${(placedShipsCount / totalShipsCount) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {shipTypes.map(type => {
                                const { availableCount, firstAvailable, placedCount } = getShipGroupInfo(type.length);
                                const totalOfType = type.limit;
                                const allOfTypePlaced = availableCount === 0;

                                return (
                                    <div
                                        key={type.length}
                                        draggable={availableCount > 0}
                                        onDragStart={(e) => firstAvailable && handleDragStart(firstAvailable.id, e)}
                                        onDrag={handleDrag}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => firstAvailable && handleShipClick(firstAvailable.id)}
                                        className={`
                                            p-3 rounded-lg border-2 select-none transition-all duration-200
                                            ${allOfTypePlaced
                                                ? 'bg-green-900/30 border-green-600/50 opacity-70'
                                                : 'bg-slate-800/50 border-amber-600/40 hover:border-amber-500 hover:bg-slate-700/50 cursor-move hover:scale-[1.02]'
                                            }
                                            ${selectedShip && firstAvailable && selectedShip === firstAvailable.id ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : ''}
                                            ${isDragging && draggedShip === firstAvailable?.id ? 'opacity-50 border-amber-400' : ''}
                                        `}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center">
                                                    {firstAvailable ? (
                                                        renderShipVisual(firstAvailable, 'small')
                                                    ) : (
                                                        <div className="flex gap-0.5">
                                                            {Array(type.length).fill(0).map((_, i) => (
                                                                <div key={i} className="w-5 h-5 bg-green-600/50 rounded-sm" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-200">
                                                        {type.label}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {type.length} {type.length === 1 ? t(lang, 'battleships.cell') : t(lang, 'battleships.cells')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {allOfTypePlaced ? (
                                                    <span className="text-green-400 text-lg">✓</span>
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-amber-400 font-bold text-lg">×{availableCount}</span>
                                                        <span className="text-xs text-gray-500">{placedCount}/{totalOfType}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}


                            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <div className="text-xs text-gray-400 space-y-1">
                                    <p>💡 {t(lang, 'battleships.hint_drag')}</p>
                                    <p>🔄 {t(lang, 'battleships.hint_rotate')}</p>
                                    <p>↩️ {t(lang, 'battleships.hint_remove')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <div className="flex mb-1 ml-8">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((letter, i) => (
                                        <div key={letter} className="w-8 text-center text-xs text-amber-500/70 font-mono">
                                            {letter}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex">
                                    <div className="flex flex-col mr-1">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                            <div key={num} className="h-8 flex items-center justify-end pr-1 text-xs text-amber-500/70 font-mono w-6">
                                                {num}
                                            </div>
                                        ))}
                                    </div>


                                    <div className="grid grid-cols-10 gap-0 bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-2 border-amber-500/60 rounded-lg p-1 shadow-lg shadow-amber-900/20">
                                        {boardGrid.map((row, y) => row.map((val, x) => renderCell(val, x, y, myIdx)))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col items-center gap-4 w-full">
                                <div className="flex gap-6">
                                    <div className={`px-4 py-2 rounded-lg border-2 transition-all ${readyPlayers.includes(myIdx)
                                        ? 'bg-green-900/40 border-green-500 text-green-400'
                                        : 'bg-slate-800/50 border-amber-600/50 text-amber-400'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            <span>{readyPlayers.includes(myIdx) ? '✅' : '⏳'}</span>
                                            <span className="font-semibold">
                                                {readyPlayers.includes(myIdx) ? t(lang, 'battleships.ready') : t(lang, 'battleships.placing')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`px-4 py-2 rounded-lg border-2 transition-all ${readyPlayers.includes(opponentIdx)
                                        ? 'bg-green-900/40 border-green-500 text-green-400'
                                        : 'bg-slate-800/50 border-red-600/50 text-red-400'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            <span>{readyPlayers.includes(opponentIdx) ? '✅' : '⏳'}</span>
                                            <span className="font-semibold">
                                                {readyPlayers.includes(opponentIdx) ? t(lang, 'battleships.enemy_ready') : t(lang, 'battleships.enemy_placing')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConfirmPlacement}
                                    disabled={!allPlaced || readyPlayers.includes(myIdx)}
                                    className={`
                                        px-8 py-3 rounded-xl font-bold text-lg uppercase tracking-wider transition-all duration-300 shadow-lg
                                        ${allPlaced && !readyPlayers.includes(myIdx)
                                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white cursor-pointer hover:scale-105 hover:shadow-green-500/30'
                                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {readyPlayers.includes(myIdx)
                                        ? `⏳ ${t(lang, 'battleships.waiting_enemy')}`
                                        : allPlaced
                                            ? `⚔️ ${t(lang, 'battleships.confirm_fight')}`
                                            : `${t(lang, 'battleships.place_all')} (${placedShipsCount}/${totalShipsCount})`
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {gameStage === 'playing' && (
                <div className="flex flex-col items-center w-full">
                    <div className={`mb-6 px-8 py-3 rounded-xl font-bold text-xl uppercase tracking-wider transition-all duration-300 ${isMyTurn
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white animate-pulse shadow-lg shadow-green-500/30'
                        : 'bg-gradient-to-r from-red-900/60 to-red-800/60 text-red-300 border border-red-500/50'
                        }`}>
                        {isMyTurn ? `🎯 ${t(lang, 'battleships.your_turn')}` : `⏳ ${t(lang, 'battleships.enemy_turn')}`}
                    </div>

                    <div className="flex gap-12 items-start justify-center flex-wrap">
                        <div className="flex flex-col items-center">
                            <h3 className="mb-3 text-lg font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                <span>🛡️</span> {t(lang, 'battleships.your_board')}
                            </h3>
                            <div className="relative">
                                <div className="flex mb-1 ml-8">
                                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((letter) => (
                                        <div key={letter} className="w-8 text-center text-xs text-amber-500/70 font-mono">{letter}</div>
                                    ))}
                                </div>
                                <div className="flex">
                                    <div className="flex flex-col mr-1">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                            <div key={num} className="h-8 flex items-center justify-end pr-1 text-xs text-amber-500/70 font-mono w-6">{num}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-10 gap-0 bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-2 border-amber-500/60 rounded-lg p-1 shadow-lg">
                                        {boards && boards[myIdx] && boards[myIdx].map((row, y) => row.map((val, x) => renderCell(val, x, y, myIdx)))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {opponentIdx >= 0 && boards && boards[opponentIdx] && (
                            <div className="flex flex-col items-center">
                                <h3 className="mb-3 text-lg font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>🎯</span> {t(lang, 'battleships.enemy_board')}
                                </h3>
                                <div className="relative">
                                    <div className="flex mb-1 ml-8">
                                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((letter) => (
                                            <div key={letter} className="w-8 text-center text-xs text-red-500/70 font-mono">{letter}</div>
                                        ))}
                                    </div>
                                    <div className="flex">
                                        <div className="flex flex-col mr-1">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                                <div key={num} className="h-8 flex items-center justify-end pr-1 text-xs text-red-500/70 font-mono w-6">{num}</div>
                                            ))}
                                        </div>
                                        <div className={`grid grid-cols-10 gap-0 bg-gradient-to-br from-red-900/30 to-rose-900/20 border-2 rounded-lg p-1 shadow-lg transition-all duration-300 ${isMyTurn ? 'border-green-500/60 shadow-green-500/20' : 'border-red-500/40'
                                            }`}>
                                            {boards[opponentIdx].map((row, y) => row.map((val, x) => renderCell(val, x, y, opponentIdx)))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
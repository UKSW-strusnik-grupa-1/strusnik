import Link from 'next/link';
import React, { useState, useEffect } from 'react';

interface ActiveGameProps {
    socket: any;
    roomId: string;
    gameState: any;
    myId: string;
}

// Mapowanie logicznej rangi (kod) na końcówkę nazwy pliku
const RANK_TO_IMG_SUFFIX: Record<string, string> = {
    'F': 'S', 
    'B': 'B', 
    'S': '1', 
    '10': '10', '9': '9', '8': '8', 
    '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'
};

const PIECE_LABELS: Record<string, string> = {
    'F': '🚩', 'B': '💣', '10': '10', '9': '9', '8': '8', 
    '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2', 'S': '1'
};

// Konfiguracja armii (zgodna z backendem)
const SETUP_CONFIG = {
    'F': 1, 'B': 6, '10': 1, '9': 1, '8': 2, '7': 3, '6': 4, '5': 4, '4': 4, '3': 5, '2': 8, 'S': 1
};

export default function Game({ socket, roomId, gameState, myId }: ActiveGameProps) {
    const { board, seats, stage, setup_ready, current_player_idx, last_move, winner } = gameState;

    const calculatedIdx = seats.findIndex((s: any) => s && s.userId === myId);
    
    const my_idx = (gameState.my_idx !== undefined && gameState.my_idx !== -1) 
        ? gameState.my_idx 
        : calculatedIdx;
    
    // --- SETUP LOCAL STATE ---
    const [setupBoard, setSetupBoard] = useState<(string | null)[][]>(
        Array(4).fill(null).map(() => Array(10).fill(null))
    );
    const [availablePieces, setAvailablePieces] = useState<Record<string, number>>({...SETUP_CONFIG});
    const [selectedPieceToPlace, setSelectedPieceToPlace] = useState<string | null>(null);
    
    // State do podświetlania pola podczas Drag&Drop
    const [dragOverSquare, setDragOverSquare] = useState<{r: number, c: number} | null>(null);

    // --- GAMEPLAY LOCAL STATE ---
    const [selectedSquare, setSelectedSquare] = useState<{r: number, c: number} | null>(null);

    const isPlayer0 = my_idx === 0;
    
    // Helper do generowania ścieżki obrazka
    const getPieceImgSrc = (rank: string, playerIdx: number) => {
        const colorPrefix = playerIdx === 0 ? 'red' : 'blue';
        const suffix = RANK_TO_IMG_SUFFIX[rank] || rank;
        return `/stratego/${colorPrefix}${suffix}.webp`;
    };

    const shouldShowRankLabel = (rank: string) => {
        return rank !== 'F' && rank !== 'B';
    };

    // Zamiana współrzędnych Widok <-> Backend
    const viewToBackend = (r_view: number, c_view: number) => {
        if (isPlayer0) {
            return { r: 9 - r_view, c: 9 - c_view };
        } else {
            return { r: r_view, c: c_view };
        }
    };

    const isLakeBackend = (r: number, c: number) => {
        const lakes = ['4,2', '4,3', '5,2', '5,3', '4,6', '4,7', '5,6', '5,7'];
        return lakes.includes(`${r},${c}`);
    };

    // --- SETUP LOGIC (CLICK) ---
    const handlePlacePiece = (r: number, c: number) => {
        if (stage !== 'setup') return;
        
        const existing = setupBoard[r][c];

        // Usuwanie kliknięciem
        if (existing) {
            setAvailablePieces(prev => ({...prev, [existing]: prev[existing] + 1}));
            const newBoard = [...setupBoard.map(row => [...row])];
            newBoard[r][c] = null;
            setSetupBoard(newBoard);
            return;
        }

        // Dodawanie kliknięciem
        if (selectedPieceToPlace && availablePieces[selectedPieceToPlace] > 0) {
            const newBoard = [...setupBoard.map(row => [...row])];
            newBoard[r][c] = selectedPieceToPlace;
            setSetupBoard(newBoard);
            setAvailablePieces(prev => {
                const updated = {...prev};
                updated[selectedPieceToPlace]--;
                if (updated[selectedPieceToPlace] === 0) setSelectedPieceToPlace(null);
                return updated;
            });
        }
    };

    // --- SETUP LOGIC (DRAG AND DROP) ---

    const handleDragStart = (e: React.DragEvent, rank: string, fromBoard: boolean, r?: number, c?: number) => {
        const data = JSON.stringify({ rank, fromBoard, r, c });
        e.dataTransfer.setData("piece_data", data);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, r: number, c: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverSquare?.r !== r || dragOverSquare?.c !== c) {
            setDragOverSquare({r, c});
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // onDragLeave logic
    };

    const handleDrop = (e: React.DragEvent, targetR: number, targetC: number) => {
        e.preventDefault();
        setDragOverSquare(null);

        const dataStr = e.dataTransfer.getData("piece_data");
        if (!dataStr) return;

        const { rank, fromBoard, r: srcR, c: srcC } = JSON.parse(dataStr);

        if (fromBoard && srcR === targetR && srcC === targetC) return;

        const newBoard = setupBoard.map(row => [...row]);
        const newAvailable = { ...availablePieces };
        const targetPiece = newBoard[targetR][targetC];

        if (fromBoard) {
            // SWAP
            newBoard[targetR][targetC] = rank;
            newBoard[srcR][srcC] = targetPiece; 
        } else {
            // FROM PALETTE
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

    // --- AUTO FILL & SUBMIT ---

    const handleAutoFill = () => {
        const newBoard = setupBoard.map(row => [...row]);
        const newAvailable = {...availablePieces};
        
        const emptySlots: {r: number, c: number}[] = [];
        for(let r=0; r<4; r++) for(let c=0; c<10; c++) if(!newBoard[r][c]) emptySlots.push({r,c});
        
        for (let i = emptySlots.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptySlots[i], emptySlots[j]] = [emptySlots[j], emptySlots[i]];
        }
        
        let slotIdx = 0;
        for (const [rank, count] of Object.entries(newAvailable)) {
            for(let i=0; i<count; i++) {
                if(slotIdx < emptySlots.length) {
                    const {r, c} = emptySlots[slotIdx++];
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
            alert("Błąd synchronizacji. Odśwież stronę.");
            return;
        }

        const pieces = [];
        const isPlayer0 = my_idx === 0;

        for(let r=0; r<4; r++) {
            for(let c=0; c<10; c++) {
                const rank = setupBoard[r][c];
                if (rank) {
                    let backendR, backendC;
                    if (isPlayer0) {
                        backendR = 3 - r;
                        backendC = 9 - c;
                    } else {
                        backendR = 6 + r;
                        backendC = c;
                    }
                    pieces.push({ r: backendR, c: backendC, rank });
                }
            }
        }
        
        socket.emit('player_move', {
            roomId,
            move: { type: 'submit_setup', pieces }
        });
    };

    // --- GAMEPLAY HANDLER ---
    const handleSquareClick = (r_view: number, c_view: number) => {
        if (stage !== 'playing') return;
        if (current_player_idx !== my_idx) return;

        const { r: realR, c: realC } = viewToBackend(r_view, c_view);
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
                    setSelectedSquare({r: r_view, c: c_view});
                }
                return;
            }

            socket.emit('player_move', {
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
                setSelectedSquare({r: r_view, c: c_view});
            }
        }
    };

    // --- RENDERERS ---
    
    const renderGameCell = (r_view: number, c_view: number) => {
        const { r: realR, c: realC } = viewToBackend(r_view, c_view);
        
        // if (isLakeBackend(realR, realC)) {
        //     return (
        //         <div className="w-full h-full bg-transparent flex items-center justify-center">
        //             <span className="text-blue-400/30 text-xs select-none">🌊</span>
        //         </div>
        //     );
        // }

        const piece = board[realR][realC];
        const isSelected = selectedSquare?.r === r_view && selectedSquare?.c === c_view;
        const isLastMoveSrc = last_move?.from.r === realR && last_move?.from.c === realC;
        const isLastMoveDst = last_move?.to.r === realR && last_move?.to.c === realC;

        if (!piece) {
            return (
                <div 
                    className={`w-full h-full transition-colors ${isSelected ? 'bg-amber-500/20' : 'hover:bg-white/5'} ${isLastMoveSrc ? 'bg-yellow-500/10' : ''}`}
                    onClick={() => handleSquareClick(r_view, c_view)}
                />
            );
        }

        const isMine = piece.player === my_idx;
        const pieceColorClass = piece.player === 0 
            ? 'bg-red-900 border-red-500' 
            : 'bg-blue-900 border-blue-500';

        const showRank = isMine || piece.rank !== '?';
        
        return (
            <div 
                onClick={() => handleSquareClick(r_view, c_view)}
                className={`
                    w-[90%] h-[90%] rounded shadow-lg flex items-center justify-center select-none cursor-pointer relative
                    border ${pieceColorClass}
                    ${isSelected ? 'ring-2 ring-yellow-400 scale-110 z-10 brightness-110' : ''}
                    ${isLastMoveDst ? 'ring-2 ring-white' : ''}
                `}
            >
                {showRank ? (
                    <>
                        <img 
                            src={getPieceImgSrc(piece.rank, piece.player)} 
                            alt={piece.rank}
                            className="w-full h-full object-contain rounded-sm flex"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerText = PIECE_LABELS[piece.rank] || piece.rank;
                            }}
                        />
                        {shouldShowRankLabel(piece.rank) && (
                            <div className="absolute top-0 right-0 bg-black/80 text-white text-[9px] lg:text-[11px] leading-none font-bold px-1 py-0.5 rounded-bl shadow-sm pointer-events-none z-20">
                                {piece.rank}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black/20">
                         <span className="opacity-60 sm:text-sm md:text-lg lg:text-2xl">❔</span>
                    </div>
                )}
            </div>
        );
    };

    // --- MAIN RENDER ---
    
    if (stage === 'game_over') {
         return (
            <div className="flex flex-col items-center justify-center h-full gap-6 animate-in fade-in duration-700">
                <h2 className="text-5xl text-amber-500 font-bold tracking-widest drop-shadow-lg">KONIEC GRY</h2>
                <div className="text-2xl text-gray-200 bg-black/50 px-8 py-4 rounded-xl border border-amber-900/50">
                    WYGRAL: <span className="text-white font-bold text-3xl ml-2">{winner?.name}</span>
                    <p className="text-sm text-gray-400 mt-2 text-center italic">{winner?.reason}</p>
                </div>
                <Link href={"/lobby/Stratego"}>
                <button 
                    className="px-8 py-3 bg-amber-800 hover:bg-amber-700 text-white font-bold rounded shadow-lg transition-all transform hover:scale-105 cursor-pointer"
                >
                    WROC DO LOBBY
                </button>
                </Link>
            </div>
         );
    }

    if (stage === 'setup') {
        if (setup_ready[my_idx]) {
             return (
                <div className="flex flex-col items-center justify-center h-full text-amber-100 gap-4">
                    <div className="text-4xl animate-bounce">⏳</div>
                    <h2 className="text-2xl font-light tracking-wide">Oczekiwanie na przeciwnika...</h2>
                </div>
             );
        }

        const piecesLeft = Object.values(availablePieces).reduce((a,b)=>a+b, 0);

        return (
            <div className="flex flex-col h-full w-full p-2 overflow-hidden">
                {/* ... SETUP BOARD (bez zmian) ... */}
                {/* SETUP BOARD (4x10) */}
                <div className="flex-1 flex items-center justify-center min-h-0">
                     <div 
                        className="grid grid-cols-10 gap-1 p-2 border-2 border-amber-900/50 rounded-lg shadow-2xl"
                        style={{
                            backgroundImage: "url('/board.png')",
                            backgroundSize: 'cover',
                            backgroundPosition: 'bottom'
                        }}
                     >
                        {setupBoard.map((row, r) => (
                            row.map((cell, c) => {
                                const borderColor = my_idx === 0 ? 'border-red-600' : 'border-blue-600';
                                const isDragOver = dragOverSquare?.r === r && dragOverSquare?.c === c;
                                
                                return (
                                    <div 
                                        key={`${r}-${c}`} 
                                        className={`
                                            w-20 h-20 md:w-25 md:h-25 lg:w-30 lg:h-30 
                                            border border-gray-800/30
                                            flex items-center justify-center cursor-pointer 
                                            transition-colors relative
                                            ${isDragOver ? 'bg-green-500/30 ring-2 ring-green-500' : 'bg-black/10 hover:bg-white/10'}
                                        `}
                                        onClick={() => handlePlacePiece(r, c)}
                                        onDragOver={(e) => handleDragOver(e, r, c)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, r, c)}
                                    >
                                        {cell && (
                                            <div 
                                                className={`
                                                    w-[95%] h-[95%] rounded border ${borderColor} flex items-center justify-center shadow-md animate-in zoom-in duration-200 overflow-hidden relative
                                                    cursor-grab active:cursor-grabbing bg-black/40 backdrop-blur-sm
                                                `}
                                                draggable={true}
                                                onDragStart={(e) => handleDragStart(e, cell, true, r, c)}
                                            >
                                                 <img 
                                                    src={getPieceImgSrc(cell, my_idx)} 
                                                    alt={cell} 
                                                    className="w-full h-full object-fit pointer-events-none" 
                                                />
                                                {shouldShowRankLabel(cell) && (
                                                    <div className="absolute top-0 right-0 bg-black/80 text-white text-[15px] font-bold px-1 rounded-bl shadow-sm pointer-events-none">
                                                        {cell}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex justify-center gap-4 my-3">
                     <button onClick={handleAutoFill} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs uppercase font-bold tracking-wide transition-colors">Losowo</button>
                     <button onClick={() => setSetupBoard(Array(4).fill(null).map(() => Array(10).fill(null)))} className="px-3 py-1 bg-red-900/40 hover:bg-red-900 rounded text-xs uppercase font-bold tracking-wide transition-colors text-red-200">WYCZYSC</button>
                     <button 
                        onClick={submitSetup} 
                        disabled={piecesLeft > 0}
                        className={`px-6 py-1 rounded text-sm font-bold uppercase transition-all shadow-lg
                            ${piecesLeft > 0 
                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                                : 'bg-green-700 hover:bg-green-600 text-white shadow-green-900/50 scale-105'}`}
                     >
                        ZATWIERDZ
                     </button>
                </div>

                {/* PALETTE */}
                <div className="h-35 overflow-y-auto bg-black/40 rounded-t-xl border-t border-amber-900/30 p-2 custom-scrollbar">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {Object.entries(SETUP_CONFIG).map(([rank, total]) => {
                            const left = availablePieces[rank];
                            const isSelected = selectedPieceToPlace === rank;
                            
                            return (
                                <div 
                                    key={rank}
                                    draggable={left > 0}
                                    onDragStart={(e) => handleDragStart(e, rank, false)}
                                    onClick={() => left > 0 && setSelectedPieceToPlace(rank)}
                                    className={`
                                        flex flex-col items-center p-1 rounded border transition-all select-none
                                        ${isSelected ? 'bg-amber-900/60 border-amber-500 scale-105 ring-1 ring-amber-500' : 'bg-black/40 border-gray-700'}
                                        ${left === 0 ? 'opacity-30 grayscale cursor-default' : 'hover:border-gray-500 cursor-grab active:cursor-grabbing'}
                                    `}
                                >
                                    <div className="w-15 h-15 md:w-20 md:h-20 flex items-center justify-center relative pointer-events-none">
                                        <img 
                                            src={getPieceImgSrc(rank, my_idx)} 
                                            alt={rank} 
                                            className="w-full h-full object-contain drop-shadow-md"
                                        />
                                        {shouldShowRankLabel(rank) && (
                                            <div className="absolute top-0 right-0 bg-black/80 text-white text-[12px] font-bold px-1 rounded-bl">
                                                {rank}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-md mt-1 ${left === 0 ? 'text-red-500' : 'text-gray-400'}`}>{left}/{total}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // --- GAMEPLAY RENDER ---
    const isMyTurn = current_player_idx === my_idx;

    // Logika wyświetlania wyniku walki
    let combatResultText = "";
    let combatResultColor = "";
    
    if (last_move?.combat) {
        const combat = last_move.combat;
        const amIAttacker = combat.attacker.player === my_idx;
        const result = combat.result;

        if (result === 'draw') {
            combatResultText = "Remis!";
            combatResultColor = "text-gray-400";
        } else if (amIAttacker) {
            // Atakowałem
            if (result === 'win') {
                combatResultText = "WYGRALES";
                combatResultColor = "text-green-400";
            } else {
                combatResultText = "PRZEGRALES";
                combatResultColor = "text-red-400";
            }
        } else {
            // Broniłem się
            if (result === 'win') {
                combatResultText = "PRZEGRALES";
                combatResultColor = "text-red-400";
            } else {
                combatResultText = "WYGRALES";
                combatResultColor = "text-green-400";
            }
        }
    }
    
    return (
        <div className="relative flex flex-col items-center h-full w-full justify-center">
            
            {/* TURA INFO (Środek góra) */}
            <div className="mb-4 flex flex-col items-center gap-2 z-10">
                <div className={`
                    px-6 py-2 rounded-full text-sm uppercase font-bold border shadow-xl transition-all duration-500
                    ${isMyTurn 
                        ? 'bg-linear-to-r from-green-900 to-green-800 text-green-100 border-green-500 scale-105' 
                        : 'bg-gray-900 text-gray-500 border-gray-700'}
                `}>
                    {isMyTurn ? "Twoja Tura" : "Tura Przeciwnika"}
                </div>
            </div>

            {/* POWIADOMIENIE O WALCE (Prawa strona) */}
            {last_move?.combat && (
                <div className="absolute right-4 top-24 z-50 flex flex-col items-end gap-2 animate-in slide-in-from-right fade-in duration-500">
                     <div className="bg-black/80 backdrop-blur-md px-4 py-3 rounded-xl border border-amber-900/50 shadow-2xl flex flex-col items-center gap-2 max-w-[200px]">
                        <span className="text-xs text-gray-400 uppercase tracking-widest border-b border-gray-700 w-full text-center pb-1 mb-1">Wynik Walki</span>
                        
                        <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center">
                                <img src={getPieceImgSrc(last_move.combat.attacker.rank, last_move.combat.attacker.player)} className="h-10 w-10 object-contain drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]"/>
                                <span className="text-[10px] text-gray-500 mt-1">ATAK</span>
                            </div>
                            <span className="text-gray-400 font-bold">vs</span>
                            <div className="flex flex-col items-center">
                                <img src={getPieceImgSrc(last_move.combat.defender.rank, last_move.combat.defender.player)} className="h-10 w-10 object-contain drop-shadow-[0_0_5px_rgba(0,0,255,0.5)]"/>
                                <span className="text-[10px] text-gray-500 mt-1">OBRONA</span>
                            </div>
                        </div>

                        <div className={`text-sm font-bold uppercase tracking-wide mt-1 ${combatResultColor}`}>
                            {combatResultText}
                        </div>
                    </div>
                </div>
            )}

            {/* BOARD WRAPPER */}
            <div className="relative p-3 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#4a3525]">
                <div 
                    className="grid grid-cols-10 grid-rows-10 gap-0 border-2 border-[#1a120b]"
                    style={{ 
                        width: 'min(100vw, 80vh)', 
                        height: 'min(100vw, 80vh)',
                        backgroundImage: "url('/stratego/board.webp')",
                        backgroundSize: '100% 100%'
                    }}
                >
                    {Array.from({length: 10}).map((_, r) => (
                        Array.from({length: 10}).map((_, c) => (
                            <div key={`${r}-${c}`} className="relative border border-white/5 flex items-center justify-center">
                                {renderGameCell(r, c)}
                            </div>
                        ))
                    ))}
                </div>
            </div>

            {/* FOOTER */}
            <div className="mt-6 flex gap-12 text-xs font-mono tracking-widest text-gray-500 opacity-80">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${my_idx === 0 ? 'bg-red-600 shadow-[0_0_10px_red]' : 'bg-blue-600 shadow-[0_0_10px_blue]'}`}></div>
                    TY ({seats[my_idx]?.name})
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${my_idx === 0 ? 'bg-blue-600' : 'bg-red-600'}`}></div>
                    WRÓG ({seats[1-my_idx]?.name})
                </div>
            </div>
        </div>
    );
}
"use client"

import React from "react"
import Board from "@/app/components/tictactoe/Board"
import ReturnArrow from "@/app/components/lobby/returnArrow"
import { useTicTacToe } from "@/app/hooks/useTicTacToe"

export default function TicTacToePage() {
    const { board, currentPlayer, gameActive, winner, handleClick, resetGame } = useTicTacToe()

    const plankClass =
        "w-full h-16 bg-no-repeat bg-center bg-cover flex items-center justify-center text-white font-extrabold tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]"

    return (
        <div className="fixed inset-0 overflow-hidden">
            <div className="absolute w-full h-screen flex flex-col overflow-visible">
                <ReturnArrow href="/singleplayer" text="WYJDZ" />
            </div>

            <div className="relative z-10 w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 w-[min(400px,92vw)]">
                    <div
                        className={plankClass}
                        style={{ backgroundImage: "url('/main/button.png')" }}
                    >
                        <span className="text-lg">
                            {winner ? (
                                `ZWYCIĘZCA: ${winner}`
                            ) : gameActive ? (
                                `KOLEJ GRACZA: ${currentPlayer}`
                            ) : (
                                "REMIS!"
                            )}
                        </span>
                    </div>

                    <Board board={board} onSquareClick={handleClick} />

                    <button
                        onClick={resetGame}
                        className={plankClass + " hover:brightness-110 transition"}
                        style={{ backgroundImage: "url('/main/button.png')" }}
                    >
                        NOWA GRA
                    </button>
                </div>
            </div>
        </div>
    )
}

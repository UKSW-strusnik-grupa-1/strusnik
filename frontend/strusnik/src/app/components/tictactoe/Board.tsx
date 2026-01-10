import React from "react"

interface BoardProps {
    board: string[]
    onSquareClick: (index: number) => void
}

export default function Board({ board, onSquareClick }: BoardProps) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {board.map((value, index) => (
                <button
                    key={index}
                    onClick={() => onSquareClick(index)}
                    disabled={value !== ""}
                    className="w-24 h-24 text-white text-4xl font-bold hover:brightness-110 disabled:cursor-not-allowed transition-all bg-no-repeat bg-center bg-cover"
                    style={{ backgroundImage: "url('/main/button.png')" }}
                >
                    {value}
                </button>
            ))}
        </div>
    )
}

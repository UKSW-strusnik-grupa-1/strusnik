import { useState } from "react"

export const useTicTacToe = () => {
    const [board, setBoard] = useState<string[]>(Array(9).fill(""))
    const [currentPlayer, setCurrentPlayer] = useState<"X" | "O">("X")
    const [gameActive, setGameActive] = useState(true)
    const [winner, setWinner] = useState<string | null>(null)

    const checkWinner = (squares: string[]) => {
        const lines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6],
        ]
        
        for (let line of lines) {
            if (squares[line[0]] && squares[line[0]] === squares[line[1]] && squares[line[1]] === squares[line[2]]) {
                return squares[line[0]]
            }
        }
        return null
    }

    const handleClick = (index: number) => {
        if (board[index] || winner) return

        const newBoard = [...board]
        newBoard[index] = currentPlayer
        setBoard(newBoard)

        const gameWinner = checkWinner(newBoard)
        if (gameWinner) {
            setWinner(gameWinner)
            setGameActive(false)
        } else if (newBoard.every(sq => sq !== "")) {
            setGameActive(false)
        } else {
            setCurrentPlayer(currentPlayer === "X" ? "O" : "X")
        }
    }

    const resetGame = () => {
        setBoard(Array(9).fill(""))
        setCurrentPlayer("X")
        setGameActive(true)
        setWinner(null)
    }

    return { board, currentPlayer, gameActive, winner, handleClick, resetGame }
}

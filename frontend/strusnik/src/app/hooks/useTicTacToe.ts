import { useState } from "react"
import { useUser } from "./useUser"

const saveScore = async (won: boolean, shouldSave: boolean) => {
    if (won && shouldSave) {
        try {
            await fetch("/api/profile/singleplayer/score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ game_name: "tictactoe", score: 1 }),
            });
        } catch (err) {
            console.error("Failed to save tictactoe score:", err);
        }
    }
};

export const useTicTacToe = () => {
    const { userInfo } = useUser()
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

        for (const line of lines) {
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
            saveScore(gameWinner === "X", !userInfo?.isGuest);
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

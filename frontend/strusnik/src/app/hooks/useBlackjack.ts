import { useCallback, useState, useEffect } from "react"
import { useFetchWithNotify } from "./useFetchWithNotify"
import { useUser } from "./useUser"

type GameStatus = "NOT-STARTED" | "STARTED" | "FINISHED"
type Winner = "PLAYER" | "DEALER" | "DRAW" | null

type BlackjackStartResponse = {
    uuid: string;
    playerDeck: string[];
    playerDeckValue: number;
    dealerDeck: string[];
    dealerDeckValue: number | string;
};

type BlackjackActionResponse = BlackjackResolution & {
    playerDeck: string[];
    playerDeckValue: number;
    bet?: number;
};

type BlackjackResolution = {
    dealerDeck: string[]
    playerDeck: string[]
    playerDeckValue: number
    winner: Exclude<Winner, null>
    cashout: number
    gameStatus: GameStatus
    bet?: number
}

export const useBlackjack = () => {
    const [gameUUID, setGameUUID] = useState<string>("")

    const [playerDeck, setPlayerDeck] = useState<string[]>([])
    const [playerDeckValue, setPlayerDeckValue] = useState<number>(0)

    const [dealerDeck, setDealerDeck] = useState<string[]>([])
    const [dealerDeckValue, setDealerDeckValue] = useState<number | string>(0)

    const [balance, setBalance] = useState<number>(1000)
    const [bet, setBet] = useState<number>(0)
    const [gameStatus, setGameStatus] = useState<GameStatus>("NOT-STARTED")

    const [winner, setWinner] = useState<Winner>(null)
    const [cashout, setCashout] = useState<number>(0)

    const [tokens, setTokens] = useState<number[]>([])
    const [isResolving, setIsResolving] = useState(false)

    const fetchWithNotify = useFetchWithNotify();
    const { userInfo } = useUser();

    const changeTokenValues = (newTokens: number[]) => {
        const allTokens = [...newTokens]

        const tokensFor5 = allTokens.filter(token => token === 5).length
        let tokensFor20 = allTokens.filter(token => token === 20).length
        let tokensFor100 = allTokens.filter(token => token === 100).length
        let tokensFor500 = allTokens.filter(token => token === 500).length

        const tokensFor5Into20 = Math.floor(tokensFor5 / 4)
        const remainingTokensFor5Into20 = Math.floor(tokensFor5 % 4)
        tokensFor20 += tokensFor5Into20;

        const tokensFor20Into100 = Math.floor(tokensFor20 / 5)
        const remainingTokensFor20Into100 = Math.floor(tokensFor20 % 5)
        tokensFor100 += tokensFor20Into100;

        const tokensFor100Into500 = Math.floor(tokensFor100 / 5)
        const remainingTokensFor100Into500 = Math.floor(tokensFor100 % 5)
        tokensFor500 += tokensFor100Into500;

        const result: number[] = []

        for (let i = 0; i < remainingTokensFor5Into20; i++) { result.push(5) }
        for (let i = 0; i < remainingTokensFor20Into100; i++) { result.push(20) }
        for (let i = 0; i < remainingTokensFor100Into500; i++) { result.push(100) }
        for (let i = 0; i < tokensFor500; i++) { result.push(500) }

        return result;
    }

    const removeToken = (index: number) => {
        setBalance(prevBalance => prevBalance + tokens[index])
        setTokens(prevTokens => changeTokenValues(prevTokens.filter((_, i) => i !== index)))
        setBet(prevBet => prevBet - tokens[index])
    }

    const addToken = (amount: number) => {
        if (balance >= amount) {
            setBalance(prevBalance => prevBalance - amount)
            setTokens(prevTokens => changeTokenValues([...prevTokens, amount]))
            setBet(prevBet => prevBet + amount)
        }
    }

    const getCardValue = useCallback((card: string) => {
        if (card === "cardBack") return 0;

        const cardValue = card.slice(0, -1)

        if (["J", "Q", "K"].includes(cardValue)) {
            return 10;
        }

        if (cardValue === "A") {
            return 11;
        }

        return parseInt(cardValue, 10);
    }, [])

    const getDeckValue = useCallback((deck: string[]) => {
        let value = 0
        let aces = 0

        deck.forEach(card => {
            value += getCardValue(card)
            if (card.slice(0, -1) === "A")
                aces += 1
        })

        while (value > 21 && aces > 0) {
            value -= 10
            aces -= 1
        }

        return value;
    }, [getCardValue])

    const checkWinner = (data: BlackjackResolution) => {
        if (isResolving) return;
        setIsResolving(true);
        setDealerDeck(prevDealerDeck => {
            const newDeck = [...prevDealerDeck]
            newDeck[1] = data.dealerDeck[1]
            return newDeck;
        });

        setDealerDeckValue(getDeckValue(data.dealerDeck.slice(0, 2)));

        for (let i = 2; i < data.dealerDeck.length; i++) {
            setTimeout(() => {
                setDealerDeck(prevDealerDeck => [...prevDealerDeck, data.dealerDeck[i]]);
                setDealerDeckValue(getDeckValue(data.dealerDeck.slice(0, i + 1)));
            }, (i - 1) * 1000);
        }

        setTimeout(async () => {
            setWinner(data.winner)
            setCashout(data.cashout)
            setGameStatus(data.gameStatus)
            setBalance(prevBalance => prevBalance + data.cashout)
            setIsResolving(false)

            if (data.winner === "PLAYER" && !userInfo?.isGuest) {
                try {
                    await fetch("/api/profile/singleplayer/score", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ game_name: "blackjack", score: data.cashout }),
                    });
                } catch (err) {
                    console.error("Failed to save blackjack score:", err);
                }
            }
        }, data.dealerDeck.length * 1000)
    }

    useEffect(() => {
        setDealerDeckValue(getDeckValue(dealerDeck))
    }, [dealerDeck, getDeckValue])

    const startGame = async () => {
        if (gameStatus !== "NOT-STARTED") { return; }

        const data = await fetchWithNotify<BlackjackStartResponse>("/api/games/blackjack/start", {
            method: "POST",
            body: JSON.stringify({ bet }),
            headers: { "Content-Type": "application/json" },
        });

        if (!data) return;

        setGameUUID(data.uuid)
        setPlayerDeck(data.playerDeck)
        setPlayerDeckValue(data.playerDeckValue)
        setDealerDeck(data.dealerDeck)
        setDealerDeckValue(data.dealerDeckValue)
        setGameStatus("STARTED")
    }

    const hit = async () => {
        if (gameStatus !== "STARTED" || isResolving) { return; }

        const data = await fetchWithNotify<BlackjackActionResponse>("/api/games/blackjack/hit", {
            method: "POST",
            body: JSON.stringify({ uuid: gameUUID }),
            headers: { "Content-Type": "application/json" },
        });

        if (!data) return;

        setPlayerDeck(data.playerDeck)
        setPlayerDeckValue(data.playerDeckValue)

        if (data.playerDeckValue > 21) {
            checkWinner(data)
        }
    }

    const doubleDown = async () => {
        if (
            gameStatus !== "STARTED" ||
            isResolving ||
            playerDeck.length !== 2 ||
            balance < bet
        ) {
            return;
        }

        setIsResolving(true)
        const data = await fetchWithNotify<BlackjackActionResponse>("/api/games/blackjack/double", {
            method: "POST",
            body: JSON.stringify({ uuid: gameUUID }),
            headers: { "Content-Type": "application/json" },
        });

        if (!data) {
            setIsResolving(false)
            return;
        }

        setBalance(prevBalance => prevBalance - bet)
        setBet(data.bet ?? bet * 2)
        setPlayerDeck(data.playerDeck)
        setPlayerDeckValue(data.playerDeckValue)
        checkWinner(data)
    }

    const stand = async () => {
        if (gameStatus !== "STARTED" || isResolving) { return; }

        const data = await fetchWithNotify<BlackjackActionResponse>("/api/games/blackjack/stand", {
            method: "POST",
            body: JSON.stringify({ uuid: gameUUID }),
            headers: { "Content-Type": "application/json" },
        });

        if (!data) return;

        checkWinner(data)
    }

    const playAgain = () => {
        setGameUUID("")
        setPlayerDeck([])
        setPlayerDeckValue(0)
        setDealerDeck([])
        setDealerDeckValue(0)
        setGameStatus("NOT-STARTED")
        setIsResolving(false)
        setWinner(null)
        setCashout(0)
        setBet(0)
        setTokens([])
    }

    return {
        playerDeck,
        dealerDeck,
        balance,
        bet,
        gameStatus,
        tokens,
        removeToken,
        addToken,
        startGame,
        hit,
        stand,
        doubleDown,
        playerDeckValue,
        dealerDeckValue,
        winner,
        cashout,
        isResolving,
        playAgain
    }

}
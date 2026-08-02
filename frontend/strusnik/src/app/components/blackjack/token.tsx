import Image from 'next/image';

interface TokenProps {
  amount: number;
  withText?: boolean;
}

const TOKEN_IMAGES: Record<number, string> = {
  5: '/blackjack/chips/chipStack0.png',
  20: '/blackjack/chips/chipStack1.png',
  100: '/blackjack/chips/chipStack2.png',
  500: '/blackjack/chips/chipStack3.png',
};

export default function Token({ amount, withText = false }: TokenProps) {
  return (
    <span className="blackjack-token">
      <Image
        src={TOKEN_IMAGES[amount] ?? TOKEN_IMAGES[5]}
        alt=""
        aria-hidden="true"
        width={68}
        height={42}
      />
      {withText && <span className="blackjack-token-value">{amount}</span>}
    </span>
  );
}

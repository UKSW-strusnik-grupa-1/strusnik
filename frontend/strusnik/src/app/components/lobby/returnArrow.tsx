import Link from 'next/link';
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReturnArrowProps {
  href: string;
  text?: string;
  onClick?: () => void;
  confirmMessage?: string;
}

export default function ReturnArrow({ href = "", text = "MENU", onClick, confirmMessage }: ReturnArrowProps) {
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onClick || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    if (confirmMessage && !window.confirm(confirmMessage)) return;
    event.preventDefault();
    onClick();
    window.setTimeout(() => router.push(href), 150);
  };

  return (
    <Link href={href} className="return-arrow" onClick={handleClick}>
      <ArrowLeft size={16} aria-hidden="true" />
      <span>{text}</span>
    </Link>
  );
}

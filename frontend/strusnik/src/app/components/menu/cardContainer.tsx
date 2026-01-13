import React from "react";

interface CardContainerProps {
  children: React.ReactNode;
}

export default function CardContainer({ children }: CardContainerProps) {
  const items = React.Children.toArray(children).filter((c) =>
    React.isValidElement(c)
  );

  const cardCount = items.length;
  const compact = cardCount > 3;

  const gapClass = compact
    ? "gap-1 sm:gap-2 md:gap-3"
    : "gap-2 sm:gap-3 md:gap-4";

  if (cardCount <= 3) {
    return (
      <div
        className={[
          "relative w-full min-h-screen flex items-center justify-center px-3 sm:px-4",
          compact ? "py-8 sm:py-10" : "py-16 sm:py-20",
        ].join(" ")}
      >
        <div className={`z-10 flex flex-wrap justify-center max-w-5xl w-full ${gapClass}`}>
          {items.map((child, i) =>
            React.cloneElement(child as React.ReactElement<any>, {
              compact,
              key: (child as any).key ?? i,
            })
          )}
        </div>
      </div>
    );
  }

  const topCount = Math.ceil(cardCount / 2);
  const topRow = items.slice(0, topCount);
  const bottomRow = items.slice(topCount);

  return (
    <div
      className={[
        "relative w-full min-h-screen flex flex-col items-center justify-center px-3 sm:px-4",
        compact ? "py-8 sm:py-10" : "py-16 sm:py-20",
      ].join(" ")}
    >
      <div className={`z-10 flex flex-wrap justify-center max-w-5xl w-full ${gapClass}`}>
        {topRow.map((child, i) =>
          React.cloneElement(child as React.ReactElement<any>, {
            compact,
            key: (child as any).key ?? `top-${i}`,
          })
        )}
      </div>

      <div className={`z-10 mt-4 sm:mt-6 flex flex-wrap justify-center max-w-5xl w-full ${gapClass}`}>
        {bottomRow.map((child, i) =>
          React.cloneElement(child as React.ReactElement<any>, {
            compact,
            key: (child as any).key ?? `bottom-${i}`,
          })
        )}
      </div>
    </div>
  );
}
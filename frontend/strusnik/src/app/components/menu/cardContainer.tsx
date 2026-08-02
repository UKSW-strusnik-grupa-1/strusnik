import React from "react";

interface CardContainerProps {
  children: React.ReactNode;
}

export default function CardContainer({ children }: CardContainerProps) {
  const items = React.Children.toArray(children).filter((child) => React.isValidElement(child));

  return (
    <div className="game-grid">
      {items.map((child, index) =>
        React.cloneElement(child as React.ReactElement<{ index?: number }>, {
          index,
          key: (child as React.ReactElement).key ?? index,
        })
      )}
    </div>
  );
}

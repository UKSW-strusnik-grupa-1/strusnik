"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} id="app-content" tabIndex={-1} className="page-transition">
      {children}
    </div>
  );
}

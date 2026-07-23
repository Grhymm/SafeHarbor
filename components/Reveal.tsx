"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/lib/useScrollReveal";

export function Reveal({
  children,
  className = "",
  delayIndex = 0,
}: {
  children: ReactNode;
  className?: string;
  delayIndex?: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-[600ms] ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[18px]"
      } ${className}`}
      style={{ transitionDelay: `${(delayIndex % 3) * 0.08}s` }}
    >
      {children}
    </div>
  );
}

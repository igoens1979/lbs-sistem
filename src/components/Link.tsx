import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/** Anchor-like action used for in-app navigation (renders a real button for a11y). */
export function Link({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("cursor-pointer text-left", className)}>
      {children}
    </button>
  );
}

export default Link;

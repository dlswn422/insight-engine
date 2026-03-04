"use client";

import { ReactNode, useId, useState } from "react";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * 사용법:
 * <Tooltip content="설명">
 *   <button>?</button>
 * </Tooltip>
 */
export default function Tooltip({ content, children, className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className={`relative inline-flex items-center ${className ?? ""}`}>
      <span
        aria-describedby={id}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex"
      >
        {children}
      </span>

      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
        >
          {content}
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-b-gray-900" />
        </span>
      )}
    </span>
  );
}
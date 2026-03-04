"use client";

import { useMemo } from "react";

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pages = useMemo(() => {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);

    let start = Math.max(1, safePage - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [safePage, totalPages]);

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="text-sm text-gray-500">
        {safePage} / {totalPages} 페이지
      </div>

      <div className="flex items-center gap-2">
        <button
          className="px-4 py-2 rounded-xl border bg-white disabled:opacity-40"
          disabled={safePage === 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          이전
        </button>

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-2 rounded-xl border ${
              p === safePage
                ? "bg-black text-white border-black"
                : "bg-white"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          className="px-4 py-2 rounded-xl border bg-white disabled:opacity-40"
          disabled={safePage === totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}
// src/components/board/KanbanColumn.jsx
import React from "react";
import StageMenu from "./StageMenu";

const STAGE_TINT = [
  "bg-sky-50",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-violet-50",
  "bg-rose-50",
  "bg-teal-50",
];

export default function KanbanColumn({
  name,
  index,
  total,
  count,
  children,
  onAddCard,
}) {
  const tint = STAGE_TINT[index % STAGE_TINT.length];

  return (
    <section className={`flex h-full min-w-[280px] max-w-sm flex-1 flex-col`}>
      {/* Header */}
      <div
        className={`mb-2 rounded-xl border border-gray-200 ${tint} px-3 py-2`}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-gray-700">
              {name}
              <span className="ml-1 rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                {count}
              </span>
            </h3>
          </div>
          <StageMenu name={name} index={index} total={total} />
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2">
        {children}
        <button
          type="button"
          onClick={onAddCard}
          className="mt-1 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          + Add card
        </button>
      </div>
    </section>
  );
}

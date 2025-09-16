// src/components/kanban/Column.jsx
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useBoardStore } from "../../lib/boardStore";
import CardModal from "./CardModal";

export default function Column({ columnKey, title, cardIds, renderCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${columnKey}` });
  const [open, setOpen] = useState(false);

  const bg = isOver ? "bg-slate-50" : "bg-slate-100/60";

  return (
    <div className="flex h-[78vh] flex-col rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between rounded-t-2xl border-b bg-slate-50 px-4 py-2">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          + Add
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-auto p-3 transition ${bg}`}
      >
        {cardIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            Drop cards here
          </div>
        ) : (
          cardIds.map((id) => renderCard(id))
        )}
      </div>

      {open && (
        <CardModal columnKey={columnKey} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

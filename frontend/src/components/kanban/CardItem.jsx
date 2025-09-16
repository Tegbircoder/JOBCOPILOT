// src/components/kanban/CardItem.jsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import CardModal from "./CardModal";
import { useBoardStore } from "../../lib/boardStore";

export default function CardItem({ id, card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const [open, setOpen] = useState(false);
  const deleteCard = useBoardStore((s) => s.deleteCard);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <button
          className="cursor-grab rounded-md border px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-50 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Drag"
        >
          ⇅
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-800">
            {card.title}
          </div>
          <div className="truncate text-xs text-slate-500">{card.company}</div>
          {card.link ? (
            <a
              href={card.link}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-xs text-blue-600 hover:underline"
            >
              {card.link}
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          onClick={() => deleteCard(id)}
          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
        >
          Delete
        </button>
      </div>

      {open && <CardModal card={card} onClose={() => setOpen(false)} />}
    </div>
  );
}

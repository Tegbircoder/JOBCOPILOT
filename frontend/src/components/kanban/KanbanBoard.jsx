// src/components/kanban/KanbanBoard.jsx
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { useBoardStore } from "../../lib/boardStore";
import Column from "./Column";
import CardItem from "./CardItem";
import { DragOverlay } from "@dnd-kit/core";

export default function KanbanBoard() {
  const { columns, cards, moveCard } = useBoardStore();
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const cols = columns.map((c) => c.key);

  // Map of columnKey -> ordered card IDs
  const colItems = useMemo(() => {
    const map = {};
    for (const col of cols) {
      map[col] = cards
        .filter((c) => c.status === col)
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((c) => c.id);
    }
    return map;
  }, [cards, cols]);

  const cardById = useMemo(() => {
    const m = new Map();
    cards.forEach((c) => m.set(c.id, c));
    return m;
  }, [cards]);

  function getContainerOf(id) {
    // id can be a card id or "col:<key>"
    if (typeof id !== "string") return null;
    if (id.startsWith("col:")) return id.slice(4);
    const card = cardById.get(id);
    return card ? card.status : null;
  }

  function handleDragStart(event) {
    const { active } = event;
    setActiveId(active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const fromCol = getContainerOf(active.id);
    const toCol = getContainerOf(over.id);

    if (!fromCol || !toCol) return;

    // If dropping on a card, insert before its index; if dropping on column, add to end.
    const overIsCard = !over.id.startsWith("col:");
    const toIds = colItems[toCol];
    let toIndex = toIds.length;

    if (overIsCard) {
      const idx = toIds.indexOf(over.id);
      toIndex = idx === -1 ? toIds.length : idx;
    }

    if (fromCol === toCol) {
      // Reorder inside the same column
      const fromIds = colItems[fromCol];
      const fromIndex = fromIds.indexOf(active.id);
      if (fromIndex === -1) return;
      const reordered = arrayMove(fromIds, fromIndex, toIndex);
      const newIndex = reordered.indexOf(active.id);
      moveCard(active.id, toCol, newIndex);
    } else {
      // Move across columns
      moveCard(active.id, toCol, toIndex);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {columns.map((col) => (
          <SortableContext key={col.key} items={colItems[col.key]}>
            <Column
              columnKey={col.key}
              title={col.label}
              cardIds={colItems[col.key]}
              renderCard={(id) => (
                <CardItem key={id} id={id} card={cardById.get(id)} />
              )}
            />
          </SortableContext>
        ))}

        <DragOverlay>
          {activeId ? (
            <div className="rounded-xl border bg-white p-3 shadow-lg">
              <div className="text-sm font-semibold">
                {cardById.get(activeId)?.title || "Card"}
              </div>
              <div className="text-xs text-slate-500">
                {cardById.get(activeId)?.company || ""}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

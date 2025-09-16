// src/lib/boardStore.js
import { create } from "zustand";

const COLS = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "final", label: "Final" },
  { key: "closed", label: "Closed" },
];

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2, 11);
}

const nowISO = () => new Date().toISOString();

const mockCards = [
  {
    id: uuid(),
    title: "Frontend Developer",
    company: "BlueSky Labs",
    link: "https://blueskylabs.example/jobs/fe",
    notes: "Tailwind + React role. Follow up in 3 days.",
    status: "saved",
    sortIndex: 0,
    nextActionAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: uuid(),
    title: "Data Analyst",
    company: "NorthPeak",
    link: "https://northpeak.example/careers/da",
    notes: "Contacted recruiter on LinkedIn.",
    status: "applied",
    sortIndex: 0,
    nextActionAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: uuid(),
    title: "SDE Intern",
    company: "AWS",
    link: "https://aws.amazon.com/careers",
    notes: "Prepare for OA; study arrays & DP.",
    status: "screening",
    sortIndex: 0,
    nextActionAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

export const useBoardStore = create((set, get) => ({
  columns: COLS,
  cards: mockCards,

  addCard: (status, data) =>
    set((state) => {
      const itemsInCol = state.cards
        .filter((c) => c.status === status)
        .sort((a, b) => a.sortIndex - b.sortIndex);
      const nextIndex = itemsInCol.length;
      const newCard = {
        id: uuid(),
        title: data.title?.trim() || "Untitled",
        company: data.company?.trim() || "",
        link: data.link?.trim() || "",
        notes: data.notes?.trim() || "",
        status,
        sortIndex: nextIndex,
        nextActionAt: data.nextActionAt || null,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      return { cards: [...state.cards, newCard] };
    }),

  updateCard: (id, updates) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: nowISO() } : c
      ),
    })),

  deleteCard: (id) =>
    set((state) => ({
      cards: state.cards
        .filter((c) => c.id !== id)
        .map((c, i) => c), // keep shape
    })),

  moveCard: (id, toStatus, toIndex) =>
    set((state) => {
      const cards = [...state.cards];
      const srcIdx = cards.findIndex((c) => c.id === id);
      if (srcIdx === -1) return {};
      const card = { ...cards[srcIdx] };

      // Remove from old column ordering
      const fromStatus = card.status;
      const fromList = cards
        .filter((c) => c.status === fromStatus && c.id !== id)
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((c) => c.id);

      const toList = cards
        .filter((c) => c.status === toStatus && c.id !== id)
        .sort((a, b) => a.sortIndex - b.sortIndex)
        .map((c) => c.id);

      // Insert into destination list at target index
      const clampedIndex = Math.max(0, Math.min(toIndex, toList.length));
      toList.splice(clampedIndex, 0, id);

      // Build new ordering map
      const newOrder = new Map();
      fromList.forEach((cid, idx) => newOrder.set(`${fromStatus}:${cid}`, idx));
      toList.forEach((cid, idx) => newOrder.set(`${toStatus}:${cid}`, idx));

      // Apply changes
      const next = cards.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: toStatus,
            sortIndex: newOrder.get(`${toStatus}:${c.id}`) ?? 0,
            updatedAt: nowISO(),
          };
        }
        if (c.status === fromStatus) {
          return {
            ...c,
            sortIndex: newOrder.get(`${fromStatus}:${c.id}`) ?? c.sortIndex,
          };
        }
        if (c.status === toStatus) {
          return {
            ...c,
            sortIndex: newOrder.get(`${toStatus}:${c.id}`) ?? c.sortIndex,
          };
        }
        return c;
      });

      return { cards: next };
    }),
}));

// src/lib/useBoardData.js
import { useCallback, useEffect, useState } from "react";
import * as store from "./boardStorage";

// A tiny hook that loads the board and exposes actions.
// After every mutation we auto-refresh so UI stays in sync.
export default function useBoardData() {
  const [board, setBoard] = useState({ stages: [], data: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const b = await store.loadBoard();
      const stages = Array.isArray(b?.stages) ? b.stages : [];
      const data = b && typeof b.data === "object" ? { ...b.data } : {};
      for (const st of stages) if (!Array.isArray(data[st.key])) data[st.key] = [];
      setBoard({ stages, data });
    } catch (e) {
      setError(e.message || "Failed to load board");
      setBoard({ stages: [], data: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const off = store.onExternalChange?.(refresh);
    return () => off && off();
  }, [refresh]);

  // mutations
  const addCard = useCallback(async (stageKey, card) => {
    await store.addCard(stageKey, card);
    await refresh();
  }, [refresh]);

  const updateCard = useCallback(async (cardId, patch) => {
    await store.updateCard(cardId, patch);
    await refresh();
  }, [refresh]);

  const moveCard = useCallback(async (cardId, toStageKey) => {
    await store.moveCard(cardId, toStageKey);
    await refresh();
  }, [refresh]);

  const deleteCard = useCallback(async (cardId) => {
    await store.deleteCard(cardId);
    await refresh();
  }, [refresh]);

  return {
    board, loading, error, refresh,
    actions: { addCard, updateCard, moveCard, deleteCard },
  };
}

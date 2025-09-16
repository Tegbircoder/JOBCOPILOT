// src/lib/boardConfig.js
/**
 * Local stage configuration with defaults and helpers.
 * Persists to localStorage **per user** so each account can customize columns.
 */

import { useEffect, useState, useCallback } from "react";

// Read sub from authStore-persisted key if store isn't bootstrapped yet
function currentUid() {
  try {
    return localStorage.getItem("cognito_user_sub") || "guest";
  } catch {
    return "guest";
  }
}
function storageKey() {
  return `jc.stages.v1.${currentUid()}`;
}

export const DEFAULT_STAGES = ["Saved", "Applied", "Screening", "Interview", "Final"];

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

function readStages() {
  const raw = localStorage.getItem(storageKey());
  const parsed = safeParse(raw);
  if (Array.isArray(parsed) && parsed.length) return parsed;
  return DEFAULT_STAGES;
}

function writeStages(stages) {
  localStorage.setItem(storageKey(), JSON.stringify(stages));
  window.dispatchEvent(new CustomEvent("jc:stages:update"));
}

export function useBoardStages() {
  const [stages, setStages] = useState(() => readStages());

  useEffect(() => {
    const onUpdate = () => setStages(readStages());
    window.addEventListener("storage", onUpdate);
    window.addEventListener("jc:stages:update", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("jc:stages:update", onUpdate);
    };
  }, []);

  const addStage = useCallback((name) => {
    const n = String(name || "").trim();
    if (!n) return { ok: false, error: "Please enter a stage name." };
    if (n.length > 40) return { ok: false, error: "Name too long (max 40)." };
    const exists = stages.some((s) => s.toLowerCase() === n.toLowerCase());
    if (exists) return { ok: false, error: "Stage already exists." };
    const next = [...stages, n];
    writeStages(next);
    setStages(next);
    return { ok: true };
  }, [stages]);

  const renameStage = useCallback((oldName, newName) => {
    const from = String(oldName || "").trim();
    const to = String(newName || "").trim();
    if (!to) return { ok: false, error: "Please enter a stage name." };
    if (to.length > 40) return { ok: false, error: "Name too long (max 40)." };
    if (from.toLowerCase() === to.toLowerCase()) return { ok: true };
    if (stages.some((s) => s.toLowerCase() === to.toLowerCase()))
      return { ok: false, error: "Stage already exists." };

    const next = stages.map((s) => (s === from ? to : s));
    writeStages(next);
    setStages(next);
    return { ok: true, from, to };
  }, [stages]);

  const moveStageLeft = useCallback((name) => {
    const i = stages.indexOf(name);
    if (i <= 0) return { ok: false };
    const next = [...stages];
    const [x] = next.splice(i, 1);
    next.splice(i - 1, 0, x);
    writeStages(next);
    setStages(next);
    return { ok: true };
  }, [stages]);

  const moveStageRight = useCallback((name) => {
    const i = stages.indexOf(name);
    if (i === -1 || i >= stages.length - 1) return { ok: false };
    const next = [...stages];
    const [x] = next.splice(i, 1);
    next.splice(i + 1, 0, x);
    writeStages(next);
    setStages(next);
    return { ok: true };
  }, [stages]);

  const resetToDefault = useCallback(() => {
    writeStages(DEFAULT_STAGES);
    setStages(DEFAULT_STAGES);
    return { ok: true };
  }, []);

  return { stages, addStage, renameStage, moveStageLeft, moveStageRight, resetToDefault };
}

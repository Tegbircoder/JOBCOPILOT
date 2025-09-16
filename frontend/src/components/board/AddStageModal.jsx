// src/components/board/AddStageModal.jsx
import { useState } from "react";
import { useBoardStages } from "../../lib/boardConfig";

export default function AddStageModal({ buttonClassName = "" }) {
  const { addStage } = useBoardStages();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  function onSubmit(e) {
    e.preventDefault();
    const res = addStage(name);
    if (!res.ok) {
      setErr(res.error || "Could not add stage.");
      return;
    }
    setErr("");
    setName("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          buttonClassName ||
          "rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-sky-700"
        }
      >
        + Add stage
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              Add a new stage
            </h3>
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., "Coding Test"'
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-300"
              />
              {err && <p className="text-xs text-rose-600">{err}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// src/components/board/StageMenu.jsx
import { useRef, useState } from "react";
import { useBoardStages } from "../../lib/boardConfig";

export default function StageMenu({ name, index, total }) {
  const { moveStageLeft, moveStageRight, renameStage } = useBoardStages();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  function doRename() {
    const next = prompt("Rename stage", name);
    if (next == null) return; // cancelled
    const res = renameStage(name, next);
    if (!res.ok && res.error) alert(res.error);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        title="Stage options"
      >
        ⋯
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            className={`block w-full px-3 py-2 text-left hover:bg-gray-50 ${
              index === 0 ? "cursor-not-allowed text-gray-300" : ""
            }`}
            disabled={index === 0}
            onClick={() => {
              moveStageLeft(name);
              setOpen(false);
            }}
          >
            Move left
          </button>
          <button
            type="button"
            className={`block w-full px-3 py-2 text-left hover:bg-gray-50 ${
              index >= total - 1 ? "cursor-not-allowed text-gray-300" : ""
            }`}
            disabled={index >= total - 1}
            onClick={() => {
              moveStageRight(name);
              setOpen(false);
            }}
          >
            Move right
          </button>
          <div className="my-1 h-px bg-gray-100" />
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-gray-50"
            onClick={doRename}
          >
            Rename…
          </button>
        </div>
      )}
    </div>
  );
}

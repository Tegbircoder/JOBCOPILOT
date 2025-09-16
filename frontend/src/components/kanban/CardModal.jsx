// src/components/kanban/CardModal.jsx
import { useEffect, useState } from "react";
import { useBoardStore } from "../../lib/boardStore";

export default function CardModal({ columnKey, card, onClose }) {
  const addCard = useBoardStore((s) => s.addCard);
  const updateCard = useBoardStore((s) => s.updateCard);

  const isEdit = Boolean(card);
  const [form, setForm] = useState({
    title: "",
    company: "",
    link: "",
    notes: "",
    nextActionAt: "",
  });

  useEffect(() => {
    if (card) {
      setForm({
        title: card.title || "",
        company: card.company || "",
        link: card.link || "",
        notes: card.notes || "",
        nextActionAt: card.nextActionAt || "",
      });
    }
  }, [card]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (isEdit) {
      updateCard(card.id, {
        ...form,
        nextActionAt: form.nextActionAt || null,
      });
    } else {
      addCard(columnKey, {
        ...form,
        nextActionAt: form.nextActionAt || null,
      });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-slate-700">
            {isEdit ? "Edit Card" : "New Card"}
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 p-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">
              Title*
            </label>
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Role title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Company
            </label>
            <input
              name="company"
              value={form.company}
              onChange={onChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Company name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Link
            </label>
            <input
              name="link"
              value={form.link}
              onChange={onChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={onChange}
              rows={4}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Notes or next steps…"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600">
              Next reminder date
            </label>
            <input
              type="date"
              name="nextActionAt"
              value={form.nextActionAt || ""}
              onChange={onChange}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {isEdit ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SlideOver({ open, title, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl border-l border-slate-200 flex flex-col">
        <header className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 text-sm"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>
        {footer ? (
          <footer className="p-4 border-t border-slate-200 bg-slate-50">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

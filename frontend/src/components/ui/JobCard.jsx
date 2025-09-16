// src/components/ui/JobCard.jsx
import React from "react";

/**
 * Nice-looking job card used on Board and List pages.
 * Purely presentational: no data fetching or logic changes.
 */

const STAGE_COLORS = {
  "New": "border-sky-400",
  "Applied": "border-emerald-400",
  "Interview": "border-amber-400",
  "Offer": "border-violet-400",
  "Rejected": "border-rose-400",
  "Hired": "border-teal-400",
};

const STAGE_BADGE = {
  "New": "bg-sky-100 text-sky-700",
  "Applied": "bg-emerald-100 text-emerald-700",
  "Interview": "bg-amber-100 text-amber-800",
  "Offer": "bg-violet-100 text-violet-700",
  "Rejected": "bg-rose-100 text-rose-700",
  "Hired": "bg-teal-100 text-teal-700",
};

function stageBorder(stage) {
  return STAGE_COLORS[stage] || "border-gray-300";
}

function stageBadge(stage) {
  return STAGE_BADGE[stage] || "bg-gray-100 text-gray-700";
}

function formatDueLabel(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return null;

  const today = new Date();
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Due today";
  if (diffDays > 0) return `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""}`;
}

function formatShortDate(dueDate) {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function JobCard({ card = {}, onClick }) {
  const {
    id,
    title = "Untitled role",
    company = "—",
    location = "",
    stage = "New",
    dueDate = null,
    tags = [],
    notes = "",
  } = card;

  const dueLabel = formatDueLabel(dueDate);
  const dueShort = formatShortDate(dueDate);

  const isOverdue =
    dueDate && new Date(dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick?.(e)}
      data-id={id}
      className={[
        "group relative rounded-xl border bg-white p-3 shadow-sm transition",
        "hover:shadow-md hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-sky-300",
        "flex flex-col gap-2",
        "border-l-4",
        stageBorder(stage),
      ].join(" ")}
    >
      {/* Top row: title + company */}
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {title}
          </h3>
          <p className="truncate text-xs text-gray-600">
            {company}
            {location ? ` • ${location}` : ""}
          </p>
        </div>

        {/* Stage badge */}
        <span
          className={[
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            stageBadge(stage),
          ].join(" ")}
          title={`Stage: ${stage}`}
        >
          {stage}
        </span>
      </header>

      {/* Tags */}
      {Array.isArray(tags) && tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 6).map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
              title={String(t)}
            >
              {String(t)}
            </span>
          ))}
          {tags.length > 6 && (
            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
              +{tags.length - 6}
            </span>
          )}
        </div>
      )}

      {/* Footer: due date + note hint */}
      <footer className="mt-1 flex items-center justify-between">
        {/* Due info */}
        <div className="flex items-center gap-2">
          {dueDate ? (
            <>
              <span
                className={[
                  "text-xs font-medium",
                  isOverdue ? "text-rose-600" : "text-gray-700",
                ].join(" ")}
                title={dueLabel || ""}
              >
                {dueShort}
              </span>
              <span className="hidden text-[11px] text-gray-500 sm:inline">
                {dueLabel}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400">No due date</span>
          )}
        </div>

        {/* Notes dot indicator */}
        {notes && String(notes).trim().length > 0 ? (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full bg-sky-500"
            title="Has notes"
          />
        ) : (
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gray-200" />
        )}
      </footer>
    </article>
  );
}

// src/pages/Summary.jsx
import { useEffect, useMemo, useState } from "react";
import BoardNav from "../components/board/BoardNav";
import { listCards } from "../lib/api";
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Treemap,
  RadialBarChart, RadialBar,
} from "recharts";

/* ---------------- helpers ---------------- */

const norm = (s) => String(s || "").toLowerCase();
const titleCase = (s) =>
  String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "—";

const COLORS = [
  "#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#059669",
  "#F97316", "#0EA5E9", "#14B8A6", "#A855F7", "#EF4444", "#22C55E",
  "#06B6D4", "#EAB308", "#3B82F6", "#84CC16", "#D946EF", "#F43F5E",
];
const colorForIndex = (i) => COLORS[i % COLORS.length];

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function isOnOrAfter(a, b) { return a.getTime() >= b.getTime(); }
function ym(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d)) return "Unknown";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/* ---------------- small UI ---------------- */

function Card({ title, children, right }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
function NameLegend({ data, max = 12 }) {
  const items = data.slice(0, max).map((d, i) => ({
    color: d.fill || colorForIndex(i),
    label: d.name,
  }));
  return (
    <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: it.color }} />
          <span className="truncate">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- page ---------------- */

export default function Summary() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [days, setDays] = useState(7);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");
        const res = await listCards({ limit: 500 });
        setItems(Array.isArray(res) ? res : (res.items || []));
      } catch (e) {
        setErr(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* --------- derived data --------- */

  const createdCutoff = useMemo(() => daysAgo(days), [days]);
  const updatedCutoff = createdCutoff;

  const statsTop = useMemo(() => {
    let created = 0, updated = 0, dueSoon = 0;
    const dueLimit = daysAgo(-days);
    const today = daysAgo(0);
    for (const it of items) {
      const cAt = it.createdAt ? new Date(it.createdAt) : null;
      const uAt = it.updatedAt ? new Date(it.updatedAt) : null;
      const due = it.dueDate ? new Date(it.dueDate) : null;
      if (cAt && isOnOrAfter(cAt, createdCutoff)) created++;
      if (uAt && isOnOrAfter(uAt, updatedCutoff)) updated++;
      if (due && due >= today && due <= dueLimit) dueSoon++;
    }
    return { created, updated, dueSoon };
  }, [items, createdCutoff, updatedCutoff, days]);

  // donut: by stage
  const byStage = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = norm(it.status) || "saved";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([k, v], i) => ({ key: k, name: titleCase(k), value: v, fill: colorForIndex(i) }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  // horizontal bars: companies (auto-fit left axis width -> less empty space)
  const byCompany = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = (it.company && it.company.trim()) ? it.company.trim() : "—";
      map.set(key, (map.get(key) || 0) + 1);
    }
    const arr = [...map.entries()]
      .map(([name, value], i) => ({ name, value, fill: colorForIndex(i) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
    arr._yWidth = Math.min(Math.max((arr.reduce((m, d) => Math.max(m, d.name.length), 0) || 6) * 7, 70), 140);
    return arr;
  }, [items]);

  // treemap: locations
  const byLocationTree = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = (it.location && it.location.trim()) ? it.location.trim() : "—";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([name, value], i) => ({ name, value, fill: colorForIndex(i) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 18);
  }, [items]);

  // radial bars: tags
  const byTagRadial = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const tags = Array.isArray(it.tags) ? it.tags : String(it.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      for (const t of tags) map.set(t, (map.get(t) || 0) + 1);
    }
    return [...map.entries()]
      .map(([name, value], i) => ({ name, value, fill: colorForIndex(i) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [items]);

  // titles — vertical bars but hide x labels, show custom legend instead
  const byTitle = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = (it.title && it.title.trim()) ? it.title.trim() : "—";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([name, value], i) => ({ name, value, fill: colorForIndex(i) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [items]);

  // due by month — column chart (not line)
  const byDueMonth = useMemo(() => {
    const map = new Map();
    let none = 0;
    for (const it of items) {
      if (!it.dueDate) { none++; continue; }
      const k = ym(it.dueDate);
      map.set(k, (map.get(k) || 0) + 1);
    }
    const seq = [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { series: seq, none };
  }, [items]);

  const total = items.length;

  /* ---------------- render ---------------- */

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <BoardNav />
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            Window:
            <input
              type="number"
              min={1}
              className="ml-2 w-20 rounded border border-slate-300 px-2 py-1"
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 7))}
            />
            days
          </div>
          <div className="text-sm text-slate-500">
            {loading ? "Loading…" : err ? <span className="text-red-600">{err}</span> : `${total} total cards`}
          </div>
        </div>
      </div>

      {/* top stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={`Created (${days}d)`} value={statsTop.created} />
        <Stat label={`Updated (${days}d)`} value={statsTop.updated} />
        <Stat label={`Due soon (${days}d)`} value={statsTop.dueSoon} />
      </div>

      {/* mixed charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Donut: Stage distribution */}
        <Card title="Cards by stage" right={<span className="text-xs text-slate-500">Distinct stages: {byStage.length}</span>}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={byStage}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={3}
                  label={(e) => `${e.name} (${e.value})`}
                >
                  {byStage.map((e, i) => <Cell key={e.key} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Horizontal Bars: Companies — reduced left space */}
        <Card title="Top companies" right={<span className="text-xs text-slate-500">Top 12</span>}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byCompany}
                layout="vertical"
                margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={byCompany._yWidth || 90}   // 👈 dynamic, trims empty space
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                  {byCompany.map((e, i) => <Cell key={e.name} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Treemap: Locations */}
        <Card title="Locations (treemap)" right={<span className="text-xs text-slate-500">Top 18</span>}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={byLocationTree}
                dataKey="value"
                nameKey="name"
                ratio={4/3}
                stroke="#fff"
                content={<CustomTreemapContent />}
              />
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Radial bars: Tags */}
        <Card title="Most-used tags (radial)" right={<span className="text-xs text-slate-500">Top 10</span>}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%" innerRadius="20%" outerRadius="95%"
                data={byTagRadial}
                startAngle={90} endAngle={-270}
              >
                <Tooltip />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
                <RadialBar minAngle={8} clockWise dataKey="value" name="Count" cornerRadius={6}>
                  {byTagRadial.map((e, i) => <Cell key={e.name} fill={e.fill} />)}
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Titles: hide bottom names; show legend instead */}
        <Card title="Most common titles" right={<span className="text-xs text-slate-500">Top 12</span>}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTitle} margin={{ left: 10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide /> {/* 👈 no names at the bottom */}
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                  {byTitle.map((e, i) => <Cell key={e.name} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* custom legend with colors + names */}
          <NameLegend data={byTitle} />
        </Card>

        {/* Due dates by month: column bars (not line) */}
        <Card
          title="Cards with due date (by month)"
          right={<span className="text-xs text-slate-500">{byDueMonth.none} without due date</span>}
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDueMonth.series} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- custom treemap cell (adds labels) ---------- */
function CustomTreemapContent(props) {
  const { x, y, width, height, name, value, fill } = props;
  if (width < 60 || height < 24) {
    return <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: "#fff" }} />;
  }
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: "#fff" }} />
      <text x={x + 6} y={y + 16} fill="#0f172a" fontSize={12} fontWeight={600}>
        {String(name).slice(0, 18)}
      </text>
      <text x={x + 6} y={y + 30} fill="#475569" fontSize={11}>
        {value}
      </text>
    </g>
  );
}

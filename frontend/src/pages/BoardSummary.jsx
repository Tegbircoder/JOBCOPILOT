// src/pages/BoardSummary.jsx
import { useEffect, useMemo, useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import "chart.js/auto";
import BoardNav from "../components/board/BoardNav";
import SmartFilter from "../components/filters/SmartFilter";
import { loadStats } from "../lib/statsAdapter";
import { isApiEnabled } from "../lib/api";

const PALETTE = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#22c55e","#f97316","#06b6d4","#9333ea","#84cc16","#eab308"];
const STAGE_COLORS = { saved:"#3b82f6", applied:"#10b981", screening:"#8b5cf6", interview:"#f59e0b", final:"#06b6d4", closed:"#ef4444" };
const takeColors = (n,o=0)=>Array.from({length:n},(_,i)=>PALETTE[(o+i)%PALETTE.length]);

function LegendList({ items }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((it) => (
        <li key={it.label} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: it.color }} />
            <span className="truncate">{it.label}</span>
          </div>
          <span className="tabular-nums text-slate-600">{it.count}</span>
        </li>
      ))}
    </ul>
  );
}
function InsightCard({ title, chart, legend }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-extrabold tracking-tight md:text-2xl">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_220px]">
        <div>{chart}</div>
        <div>{legend}</div>
      </div>
    </div>
  );
}
const sortPairs = (obj={}) => Object.entries(obj).sort((a,b)=> (b[1]-a[1]) || String(a[0]).localeCompare(String(b[0])));

export default function BoardSummary() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(null); // {key,value}

  function buildParams() {
    const p = {};
    if (search) p.q = search;
    if (filter?.key && filter?.value) p[filter.key] = filter.value;
    return p;
  }

  async function refresh() {
    try {
      setLoading(true); setErr("");
      const res = await loadStats(buildParams());
      setStats(res);
    } catch (e) {
      setErr(e.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []); // first load
  useEffect(() => { const t = setTimeout(refresh, 300); return () => clearTimeout(t); }, [search, filter]); // debounce

  const stagePairs    = useMemo(()=>sortPairs(stats?.totals?.byStatus   || {}),[stats]);
  const companyPairs  = useMemo(()=>sortPairs(stats?.totals?.byCompany  || {}),[stats]);
  const titlePairs    = useMemo(()=>sortPairs(stats?.totals?.byTitle    || {}),[stats]);
  const locationPairs = useMemo(()=>sortPairs(stats?.totals?.byLocation || {}),[stats]);
  const tagPairs      = useMemo(()=>sortPairs(stats?.totals?.byTag      || {}),[stats]);

  const stageColors = stagePairs.map(([name]) => STAGE_COLORS[String(name||"").toLowerCase()] || takeColors(1)[0]);
  const stageChart = (
    <Doughnut data={{ labels: stagePairs.map(([k])=>k),
      datasets:[{ data: stagePairs.map(([,v])=>v), backgroundColor: stageColors, borderWidth:0 }]}}
      options={{ plugins:{legend:{display:false}, tooltip:{enabled:true}}, cutout:"60%" }} />
  );
  const stageLegend = <LegendList items={stagePairs.map(([label,count],i)=>({label,count,color:stageColors[i]}))} />;

  const companyColors = takeColors(companyPairs.length,3);
  const companiesChart = (
    <Bar data={{ labels: companyPairs.map(([k])=>k),
      datasets:[{ data: companyPairs.map(([,v])=>v), backgroundColor: companyColors, borderRadius:6 }]}}
      options={{ plugins:{legend:{display:false}, tooltip:{enabled:true}},
        scales:{ x:{ticks:{display:false},grid:{display:false}}, y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:"#f1f5f9"}} } }} height={220}/>
  );
  const companiesLegend = <LegendList items={companyPairs.map(([label,count],i)=>({label,count,color:companyColors[i]}))} />;

  const titleColors = takeColors(titlePairs.length,2);
  const titlesChart = (
    <Bar data={{ labels:titlePairs.map(([k])=>k),
      datasets:[{ data:titlePairs.map(([,v])=>v), backgroundColor:titleColors, borderRadius:6 }]}}
      options={{ indexAxis:"y", plugins:{legend:{display:false}, tooltip:{enabled:true}},
        scales:{ y:{ticks:{display:false},grid:{display:false}}, x:{beginAtZero:true,ticks:{stepSize:1},grid:{color:"#f1f5f9"}} } }} height={220}/>
  );
  const titlesLegend = <LegendList items={titlePairs.map(([label,count],i)=>({label,count,color:titleColors[i]}))} />;

  const locationColors = takeColors(locationPairs.length,7);
  const locationsChart = (
    <Bar data={{ labels:locationPairs.map(([k])=>k),
      datasets:[{ data:locationPairs.map(([,v])=>v), backgroundColor:locationColors, borderRadius:6 }]}}
      options={{ plugins:{legend:{display:false}, tooltip:{enabled:true}},
        scales:{ x:{ticks:{display:false},grid:{display:false}}, y:{beginAtZero:true,ticks:{stepSize:1},grid:{color:"#f1f5f9"}} } }} height={220}/>
  );
  const locationsLegend = <LegendList items={locationPairs.map(([label,count],i)=>({label,count,color:locationColors[i]}))} />;

  const tagColors = takeColors(tagPairs.length,9);
  const tagsChart = (
    <Doughnut data={{ labels: tagPairs.map(([k])=>k),
      datasets:[{ data: tagPairs.map(([,v])=>v), backgroundColor: tagColors, borderWidth:0 }]}}
      options={{ plugins:{legend:{display:false}, tooltip:{enabled:true}}, cutout:"55%" }} />
  );
  const tagsLegend = <LegendList items={tagPairs.map(([label,count],i)=>({label,count,color:tagColors[i]}))} />;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6"><BoardNav active="summary" /></div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          placeholder="Search (title/company/location/tags)"
          className="w-72 px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring"
        />
        <SmartFilter search={search} value={filter} onChange={setFilter} />
        <button onClick={refresh} className="px-3 py-2 rounded bg-slate-200 hover:bg-slate-300">Refresh</button>
      </div>

      <div className="mb-3 text-xs text-slate-500">
        Source: {isApiEnabled ? "API" : "Local"} •{" "}
        <span className="font-semibold text-slate-900">{stats?.count ?? 0}</span> total cards
      </div>

      {loading && <div className="text-blue-600">Loading…</div>}
      {err && <div className="text-red-600">Error: {err}</div>}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InsightCard title="Cards by Stage" chart={stageChart} legend={stageLegend} />
        <InsightCard title="Companies" chart={companiesChart} legend={companiesLegend} />
        <InsightCard title="Titles" chart={titlesChart} legend={titlesLegend} />
        <InsightCard title="Locations" chart={locationsChart} legend={locationsLegend} />
        <InsightCard title="Tags" chart={tagsChart} legend={tagsLegend} />
      </section>
    </div>
  );
}

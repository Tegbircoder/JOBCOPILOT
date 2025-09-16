// src/components/board/BoardNav.jsx
import { NavLink } from "react-router-dom";

const base = "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium";
const off = base + " text-slate-600 hover:text-slate-900 hover:bg-slate-100";
const on  = base + " bg-slate-900 text-white shadow-sm";

export default function BoardNav() {
  return (
    <nav className="flex items-center gap-2">
      <NavLink to="/board/summary" className={({ isActive }) => (isActive ? on : off)}>
        Summary
      </NavLink>

      <NavLink to="/board" end className={({ isActive }) => (isActive ? on : off)}>
        Board
      </NavLink>

      <NavLink to="/board/list" className={({ isActive }) => (isActive ? on : off)}>
        List
      </NavLink>

      <NavLink to="/board/reminders" className={({ isActive }) => (isActive ? on : off)}>
        Reminders
      </NavLink>

      <NavLink to="/board/settings" className={({ isActive }) => (isActive ? on : off)}>
        Stages
      </NavLink>
    </nav>
  );
}

import { Link, useLocation } from "react-router-dom";
import { Home, KanbanSquare, UsersRound, LayoutDashboard, Settings } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/board", label: "Board", icon: KanbanSquare },
  { to: "/networking", label: "Networking", icon: UsersRound },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="w-56 bg-white border-r border-slate-200 min-h-screen p-3">
      <nav className="space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-slate-100 ${
                active ? "bg-slate-100 font-semibold" : "text-slate-700"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

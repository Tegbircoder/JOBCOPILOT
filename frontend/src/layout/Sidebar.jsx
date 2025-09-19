// src/layout/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { Home, KanbanSquare, UsersRound, LayoutDashboard, Settings, Zap } from "lucide-react";

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
    <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 min-h-screen relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 to-indigo-50/30 pointer-events-none"></div>
      
      <div className="relative z-10 p-4">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            JobCopilot
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 ${
                  active 
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200/50" 
                    : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${
                  active ? "text-white" : "text-slate-500 group-hover:text-slate-700"
                }`} />
                <span>{label}</span>
                {active && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

       
      </div>
    </aside>
  );
}
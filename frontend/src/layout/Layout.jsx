// src/layout/Layout.jsx
import { Outlet } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* Left sidebar */}
      <Sidebar />

      {/* Right content area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />

        {/* Page content goes here */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
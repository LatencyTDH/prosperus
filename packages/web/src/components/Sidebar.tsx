import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchApps, type AppInfo } from "../api/client";
import { useState } from "react";

// Simple inline SVG icons
function IconDashboard() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconTraces() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function IconEval() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconPrompt() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function IconSession() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function IconExperiment() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l.8 9.2h-3.5l-.8-9.5M5 14.5l-.8 10h3.5l.8-9.805" />
    </svg>
  );
}

function IconCost() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const linkClass = (isActive: boolean) =>
  `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
    isActive
      ? "bg-amber-500/15 text-amber-400 font-medium"
      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
  }`;

interface SidebarProps {
  selectedApp: string;
  onSelectApp: (app: string) => void;
}

export function Sidebar({ selectedApp, onSelectApp }: SidebarProps) {
  const { data: appsData } = useQuery({
    queryKey: ["apps"],
    queryFn: fetchApps,
    staleTime: 30_000,
  });
  const [collapsed, setCollapsed] = useState(false);

  const apps = appsData?.apps ?? [];

  if (collapsed) {
    return (
      <aside className="w-12 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center py-4 gap-2 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="text-amber-400 font-bold text-lg mb-4"
          title="Expand sidebar"
        >
          ◐
        </button>
        <NavLink to="/" end className={({ isActive }) => `p-2 rounded ${isActive ? "bg-amber-500/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`} title="Dashboard"><IconDashboard /></NavLink>
        <NavLink to="/traces" className={({ isActive }) => `p-2 rounded ${isActive ? "bg-amber-500/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`} title="Traces"><IconTraces /></NavLink>
        <NavLink to="/evaluations" className={({ isActive }) => `p-2 rounded ${isActive ? "bg-amber-500/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`} title="Evaluations"><IconEval /></NavLink>
        <NavLink to="/prompts" className={({ isActive }) => `p-2 rounded ${isActive ? "bg-amber-500/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`} title="Prompts"><IconPrompt /></NavLink>
        <NavLink to="/sessions" className={({ isActive }) => `p-2 rounded ${isActive ? "bg-amber-500/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`} title="Sessions"><IconSession /></NavLink>
        <NavLink to="/experiments" className={({ isActive }) => `p-2 rounded ${isActive ? "bg-amber-500/15 text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`} title="Experiments"><IconExperiment /></NavLink>
      </aside>
    );
  }

  return (
    <aside className="w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-zinc-800">
        <span className="text-base font-semibold tracking-tight text-amber-400 flex items-center gap-1.5">
          ◐ Prosperus
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-zinc-500 hover:text-zinc-300"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* App Selector */}
      <div className="px-3 pt-3 pb-2">
        <label className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Application</label>
        <select
          value={selectedApp}
          onChange={(e) => onSelectApp(e.target.value)}
          className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-amber-500/50"
        >
          <option value="">All Apps</option>
          {apps.map((a) => (
            <option key={a.appName} value={a.appName}>
              {a.appName} ({a.traceCount})
            </option>
          ))}
        </select>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-2 py-2 space-y-4">
        <div>
          <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Overview</p>
          <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
            <IconDashboard /> Dashboard
          </NavLink>
        </div>

        <div>
          <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Monitoring</p>
          <div className="space-y-0.5">
            <NavLink to="/traces" className={({ isActive }) => linkClass(isActive)}>
              <IconTraces /> Traces
            </NavLink>
            <NavLink to="/sessions" className={({ isActive }) => linkClass(isActive)}>
              <IconSession /> Sessions
            </NavLink>
            <NavLink to="/prompts" className={({ isActive }) => linkClass(isActive)}>
              <IconPrompt /> Prompts
            </NavLink>
            <NavLink to="/cost" className={({ isActive }) => linkClass(isActive)}>
              <IconCost /> Cost
            </NavLink>
          </div>
        </div>

        <div>
          <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Quality</p>
          <div className="space-y-0.5">
            <NavLink to="/evaluations" className={({ isActive }) => linkClass(isActive)}>
              <IconEval /> Evaluations
            </NavLink>
            <NavLink to="/experiments" className={({ isActive }) => linkClass(isActive)}>
              <IconExperiment /> Experiments
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800 text-[10px] text-zinc-600">
        Prosperus v0.1.0
      </div>
    </aside>
  );
}

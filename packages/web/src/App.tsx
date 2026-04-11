import { BrowserRouter, Route, Routes, NavLink } from "react-router-dom";
import { TracesPage } from "./pages/TracesPage";
import { TraceDetailPage } from "./pages/TraceDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EvaluationsPage } from "./pages/EvaluationsPage";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/traces", label: "Traces" },
  { to: "/evaluations", label: "Evaluations" },
];

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-8">
          <h1 className="text-lg font-semibold tracking-tight text-amber-400">
            ◐ Phosphor
          </h1>
          <nav className="flex gap-4 text-sm">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "text-amber-400 border-b border-amber-400 pb-0.5"
                    : "text-zinc-400 hover:text-zinc-200"
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/traces" element={<TracesPage />} />
            <Route path="/traces/:traceId" element={<TraceDetailPage />} />
            <Route path="/evaluations" element={<EvaluationsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

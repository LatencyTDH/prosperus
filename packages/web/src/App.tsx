import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TracesPage } from "./pages/TracesPage";
import { TraceDetailPage } from "./pages/TraceDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EvaluationsPage } from "./pages/EvaluationsPage";
import { PromptsPage } from "./pages/PromptsPage";
import { SessionsPage } from "./pages/SessionsPage";
import { ExperimentsPage } from "./pages/ExperimentsPage";
import { CostPage } from "./pages/CostPage";

export function App() {
  const [selectedApp, setSelectedApp] = useState("");

  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
        <Sidebar selectedApp={selectedApp} onSelectApp={setSelectedApp} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1400px]">
            <Routes>
              <Route path="/" element={<DashboardPage appName={selectedApp} />} />
              <Route path="/traces" element={<TracesPage appName={selectedApp} />} />
              <Route path="/traces/:traceId" element={<TraceDetailPage />} />
              <Route path="/evaluations" element={<EvaluationsPage appName={selectedApp} />} />
              <Route path="/prompts" element={<PromptsPage />} />
              <Route path="/sessions" element={<SessionsPage appName={selectedApp} />} />
              <Route path="/experiments" element={<ExperimentsPage appName={selectedApp} />} />
              <Route path="/cost" element={<CostPage appName={selectedApp} />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

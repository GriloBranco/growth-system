"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";

interface TeamMember {
  id: number;
  name: string;
  role: string | null;
}

interface Nct {
  id: number;
  goal: string;
  metric: string;
  target: number;
  current: number;
  quarter: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ncts, setNcts] = useState<Nct[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [newMember, setNewMember] = useState({ name: "", role: "" });
  const [newNct, setNewNct] = useState({ goal: "", metric: "", target: "", current: "0", quarter: "Q1 2026" });
  const [showAddNct, setShowAddNct] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    const [membersRes, nctsRes, settingsRes] = await Promise.all([
      fetch("/api/team-members"),
      fetch("/api/ncts"),
      fetch("/api/settings"),
    ]);
    setMembers(await membersRes.json());
    setNcts(await nctsRes.json());
    const s = await settingsRes.json();
    setSettings(s);
    setApiKey(s.google_ai_api_key || "");
  }, []);

  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    if (!newMember.name.trim()) return;
    await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember),
    });
    setNewMember({ name: "", role: "" });
    load();
  };

  const removeMember = async (id: number) => {
    await fetch(`/api/team-members?id=${id}`, { method: "DELETE" });
    load();
  };

  const updateNctCurrent = async (id: number, current: string) => {
    await fetch("/api/ncts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, current }),
    });
    load();
  };

  const addNct = async () => {
    if (!newNct.goal.trim() || !newNct.metric.trim() || !newNct.target) return;
    await fetch("/api/ncts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNct),
    });
    setNewNct({ goal: "", metric: "", target: "", current: "0", quarter: "Q1 2026" });
    setShowAddNct(false);
    load();
  };

  const archiveQuarter = async (quarter: string) => {
    if (!confirm(`Archive all NCTs for ${quarter}?`)) return;
    await fetch("/api/ncts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archiveQuarter: quarter }),
    });
    load();
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const rows = lines.slice(1).map((line) => {
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      return { goal: parts[0], metric: parts[1], target: parts[2], current: parts[3] || "0", quarter: parts[4] || "Q1 2026" };
    });
    await fetch("/api/ncts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ import: true, rows }),
    });
    load();
  };

  const saveApiKey = async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ google_ai_api_key: apiKey }),
    });
    setTestResult(null);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testConnection: true, apiKey }),
      });
      const data = await res.json();
      setTestResult(data.success ? "Connection successful!" : `Failed: ${data.error}`);
    } catch {
      setTestResult("Connection failed");
    }
    setTesting(false);
  };

  const updateStates = async (state: string, checked: boolean) => {
    const current = (settings.tracked_states || "TX,CA,FL").split(",").filter(Boolean);
    const next = checked ? [...current, state] : current.filter((s) => s !== state);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracked_states: next.join(",") }),
    });
    load();
  };

  const trackedStates = (settings.tracked_states || "TX,CA,FL").split(",");
  const allStates = ["TX", "CA", "FL", "NY", "IL", "PA", "OH", "GA", "NC", "MI"];
  const activeNcts = ncts.filter((n) => n.isActive);
  const archivedNcts = ncts.filter((n) => !n.isActive);
  const quarters = [...new Set(activeNcts.map((n) => n.quarter))];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* NCT Management */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">NCTs (Quarterly Goals)</h2>
          <div className="flex gap-2">
            <label className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md cursor-pointer hover:bg-zinc-50">
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            </label>
            <button onClick={() => setShowAddNct(true)} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800">
              Add NCT
            </button>
            {quarters.map((q) => (
              <button key={q} onClick={() => archiveQuarter(q)} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50">
                Archive {q}
              </button>
            ))}
          </div>
        </div>

        {showAddNct && (
          <div className="mb-4 p-3 border border-zinc-200 rounded-md space-y-2">
            <input placeholder="Goal description" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newNct.goal} onChange={(e) => setNewNct({ ...newNct, goal: e.target.value })} />
            <div className="grid grid-cols-4 gap-2">
              <input placeholder="Metric" className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newNct.metric} onChange={(e) => setNewNct({ ...newNct, metric: e.target.value })} />
              <input placeholder="Target" type="number" className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newNct.target} onChange={(e) => setNewNct({ ...newNct, target: e.target.value })} />
              <input placeholder="Current" type="number" className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newNct.current} onChange={(e) => setNewNct({ ...newNct, current: e.target.value })} />
              <input placeholder="Quarter" className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newNct.quarter} onChange={(e) => setNewNct({ ...newNct, quarter: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button onClick={addNct} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md">Save</button>
              <button onClick={() => setShowAddNct(false)} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md">Cancel</button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left py-2 font-medium text-zinc-500">Goal</th>
              <th className="text-left py-2 font-medium text-zinc-500">Metric</th>
              <th className="text-right py-2 font-medium text-zinc-500">Target</th>
              <th className="text-right py-2 font-medium text-zinc-500">Current</th>
              <th className="text-left py-2 font-medium text-zinc-500">Quarter</th>
            </tr>
          </thead>
          <tbody>
            {activeNcts.map((nct) => (
              <tr key={nct.id} className="border-b border-zinc-50">
                <td className="py-2">{nct.goal}</td>
                <td className="py-2 text-zinc-500">{nct.metric}</td>
                <td className="py-2 text-right">{nct.target}</td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    step="any"
                    className="w-20 px-2 py-1 text-right border border-zinc-200 rounded text-sm"
                    defaultValue={nct.current}
                    onBlur={(e) => updateNctCurrent(nct.id, e.target.value)}
                  />
                </td>
                <td className="py-2 text-zinc-500">{nct.quarter}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {archivedNcts.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-zinc-500 cursor-pointer">Archived NCTs ({archivedNcts.length})</summary>
            <table className="w-full text-sm mt-2">
              <tbody>
                {archivedNcts.map((nct) => (
                  <tr key={nct.id} className="border-b border-zinc-50 text-zinc-400">
                    <td className="py-2">{nct.goal}</td>
                    <td className="py-2">{nct.metric}</td>
                    <td className="py-2 text-right">{nct.target}</td>
                    <td className="py-2 text-right">{nct.current}</td>
                    <td className="py-2">{nct.quarter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </Card>

      {/* Team Members */}
      <Card>
        <h2 className="text-lg font-medium mb-4">Team Members</h2>
        <div className="space-y-2 mb-4">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-zinc-50">
              <div>
                <span className="font-medium">{m.name}</span>
                {m.role && <span className="text-zinc-500 ml-2">{m.role}</span>}
              </div>
              <button onClick={() => removeMember(m.id)} className="text-zinc-400 hover:text-red-500 text-sm">Remove</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input placeholder="Name" className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} />
          <input placeholder="Role (optional)" className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} />
          <button onClick={addMember} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Add</button>
        </div>
      </Card>

      {/* States to Track */}
      <Card>
        <h2 className="text-lg font-medium mb-4">States to Track</h2>
        <div className="flex flex-wrap gap-3">
          {allStates.map((state) => (
            <label key={state} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={trackedStates.includes(state)}
                onChange={(e) => updateStates(state, e.target.checked)}
                className="rounded border-zinc-300"
              />
              <span className="text-sm">{state}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Google AI API Key */}
      <Card>
        <h2 className="text-lg font-medium mb-4">Google AI API Key</h2>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Enter Google AI API key"
            className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button onClick={saveApiKey} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Save</button>
          <button onClick={testConnection} disabled={testing || !apiKey} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-50">
            {testing ? "Testing..." : "Test Connection"}
          </button>
        </div>
        {testResult && (
          <p className={`text-sm mt-2 ${testResult.includes("successful") ? "text-emerald-600" : "text-red-600"}`}>
            {testResult}
          </p>
        )}
      </Card>
    </div>
  );
}

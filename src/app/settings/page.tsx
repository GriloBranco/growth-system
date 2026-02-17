"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [ncts, setNcts] = useState<Nct[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [newMember, setNewMember] = useState({ name: "", role: "" });
  const [newNct, setNewNct] = useState({ goal: "", metric: "", target: "", current: "0", quarter: "Q1 2026" });
  const [showAddNct, setShowAddNct] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
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
      setSheetsUrl(s.google_sheets_url || "");
    } catch {
      toast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const addMember = async () => {
    if (!newMember.name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      setNewMember({ name: "", role: "" });
      toast("Team member added");
      load();
    } catch {
      toast("Failed to add member", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (id: number) => {
    try {
      await fetch(`/api/team-members?id=${id}`, { method: "DELETE" });
      toast("Member removed");
      load();
    } catch {
      toast("Failed to remove member", "error");
    }
  };

  const updateNctCurrent = async (id: number, current: string) => {
    try {
      await fetch("/api/ncts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, current }),
      });
      load();
    } catch {
      toast("Failed to update NCT", "error");
    }
  };

  const addNct = async () => {
    if (!newNct.goal.trim() || !newNct.metric.trim() || !newNct.target) return;
    setSaving(true);
    try {
      await fetch("/api/ncts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNct),
      });
      setNewNct({ goal: "", metric: "", target: "", current: "0", quarter: "Q1 2026" });
      setShowAddNct(false);
      toast("NCT added");
      load();
    } catch {
      toast("Failed to add NCT", "error");
    } finally {
      setSaving(false);
    }
  };

  const archiveQuarter = async (quarter: string) => {
    if (!confirm(`Archive all NCTs for ${quarter}?`)) return;
    try {
      await fetch("/api/ncts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveQuarter: quarter }),
      });
      toast(`Archived ${quarter} NCTs`);
      load();
    } catch {
      toast("Failed to archive", "error");
    }
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    const parsed = lines.map((l) => parseCsvLine(l));

    const narrativesRowIdx = parsed.findIndex((row) => row.some((c) => c.toLowerCase() === "narratives"));

    if (narrativesRowIdx >= 0) {
      const headerIdx = parsed.findIndex((row, i) => i > narrativesRowIdx && row.some((c) => c.toLowerCase() === "name") && row.some((c) => c.toLowerCase() === "kr"));
      if (headerIdx < 0) { toast("Could not find Name/KR header row in the Narratives section.", "error"); return; }

      const headerRow = parsed[headerIdx];
      const nameCol = headerRow.findIndex((c) => c.toLowerCase() === "name");
      const descCol = headerRow.findIndex((c) => c.toLowerCase().includes("description"));
      const krCol = headerRow.findIndex((c) => c.toLowerCase() === "kr");

      const rows: { goal: string; metric: string; target: string; current: string; quarter: string }[] = [];
      for (let i = headerIdx + 1; i < parsed.length; i++) {
        const row = parsed[i];
        const name = row[nameCol >= 0 ? nameCol : 1] || "";
        if (!name) continue;
        if (name.toLowerCase() === "commitments" || name.toLowerCase() === "tasks") break;

        const description = descCol >= 0 ? (row[descCol] || "") : "";
        const kr = row[krCol >= 0 ? krCol : 6] || "";
        const numMatch = kr.match(/([\d,.]+)/);
        const target = numMatch ? numMatch[1].replace(/,/g, "") : "1";
        const metric = kr || name;
        const goal = description ? `${name}: ${description.split("\n")[0].trim()}` : name;

        rows.push({ goal, metric, target, current: "0", quarter: "Q1 2026" });
      }

      if (rows.length === 0) { toast("No narratives found in the spreadsheet.", "error"); return; }

      await fetch("/api/ncts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ import: true, rows }),
      });
      toast(`Imported ${rows.length} NCTs`);
      load();
      return;
    }

    const nonEmpty = parsed.filter((row) => row.some((c) => c));
    if (nonEmpty.length < 2) { toast("CSV must have a header row and at least one data row.", "error"); return; }

    const header = nonEmpty[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
    const goalIdx = header.findIndex((h) => h.includes("goal") || h.includes("description") || h.includes("name"));
    const metricIdx = header.findIndex((h) => h.includes("metric") || h.includes("kr"));
    const targetIdx = header.findIndex((h) => h.includes("target"));
    const currentIdx = header.findIndex((h) => h.includes("current"));
    const quarterIdx = header.findIndex((h) => h.includes("quarter"));

    const rows = nonEmpty.slice(1).map((parts) => ({
      goal: parts[goalIdx >= 0 ? goalIdx : 0] || "",
      metric: parts[metricIdx >= 0 ? metricIdx : 1] || "",
      target: parts[targetIdx >= 0 ? targetIdx : 2] || "",
      current: parts[currentIdx >= 0 ? currentIdx : 3] || "0",
      quarter: parts[quarterIdx >= 0 ? quarterIdx : 4] || "Q1 2026",
    })).filter((r) => r.goal && r.metric && r.target);

    if (rows.length === 0) { toast("No valid rows found. CSV should have columns: goal, metric, target, current, quarter", "error"); return; }

    await fetch("/api/ncts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ import: true, rows }),
    });
    toast(`Imported ${rows.length} NCTs`);
    load();
  };

  const saveApiKey = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_ai_api_key: apiKey }),
      });
      setTestResult(null);
      toast("API key saved");
    } catch {
      toast("Failed to save API key", "error");
    } finally {
      setSaving(false);
    }
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
    try {
      const current = (settings.tracked_states || "TX,CA,FL").split(",").filter(Boolean);
      const next = checked ? [...current, state] : current.filter((s) => s !== state);
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracked_states: next.join(",") }),
      });
      load();
    } catch {
      toast("Failed to update states", "error");
    }
  };

  const saveSheetsUrl = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_sheets_url: sheetsUrl }),
      });
      toast("Sheets URL saved");
      load();
    } catch {
      toast("Failed to save URL", "error");
    } finally {
      setSaving(false);
    }
  };

  const syncFromSheets = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/ncts/sync-sheets", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast(`Synced ${data.count} NCTs from Google Sheets`);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const trackedStates = (settings.tracked_states || "TX,CA,FL").split(",");
  const allStates = ["TX", "CA", "FL", "NY", "IL", "PA", "OH", "GA", "NC", "MI"];
  const activeNcts = ncts.filter((n) => n.isActive);
  const archivedNcts = ncts.filter((n) => !n.isActive);
  const quarters = [...new Set(activeNcts.map((n) => n.quarter))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-zinc-500">Loading settings...</span>
      </div>
    );
  }

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
              <button onClick={addNct} disabled={saving} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md disabled:opacity-50 flex items-center gap-2">
                {saving && <Spinner size="sm" />} Save
              </button>
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

      {/* Google Sheets NCT Sync */}
      <Card>
        <h2 className="text-lg font-medium mb-4">Google Sheets NCT Sync</h2>
        <p className="text-sm text-zinc-500 mb-3">
          Sync NCTs from a public Google Sheet. The sheet should have columns for Name, Description, and KR (Key Result).
          Your Google AI API key must have the Sheets API enabled in the same GCP project.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
          />
          <button onClick={saveSheetsUrl} disabled={saving} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50">
            Save URL
          </button>
          <button onClick={syncFromSheets} disabled={syncing || !settings.google_sheets_url} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-50 flex items-center gap-2">
            {syncing && <Spinner size="sm" />}
            {syncing ? "Syncing..." : "Sync from Sheets"}
          </button>
        </div>
        {settings.google_sheets_last_sync && (
          <p className="text-xs text-zinc-400">Last synced: {new Date(settings.google_sheets_last_sync).toLocaleString()}</p>
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
          <button onClick={addMember} disabled={saving} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-2">
            {saving && <Spinner size="sm" />} Add
          </button>
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
          <button onClick={saveApiKey} disabled={saving} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50">Save</button>
          <button onClick={testConnection} disabled={testing || !apiKey} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50 disabled:opacity-50 flex items-center gap-2">
            {testing && <Spinner size="sm" />}
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

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { parseNctRows } from "@/lib/nct-parser";

interface TeamMember {
  id: number;
  name: string;
  role: string | null;
}

interface Nct {
  id: number;
  goal: string;
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
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

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
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const rows = lines.map((l) => parseCsvLine(l));
      const parsed = parseNctRows(rows);

      if (parsed.narratives.length === 0) {
        toast("No narratives found in the CSV.", "error");
        setImporting(false);
        return;
      }

      const res = await fetch("/api/ncts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importHierarchy: true, data: parsed }),
      });

      if (!res.ok) throw new Error("Import failed");
      const created = await res.json();
      toast(`Imported ${created.length} narratives with full hierarchy`);
      load();
    } catch {
      toast("Failed to import CSV", "error");
    } finally {
      setImporting(false);
    }
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

      {/* NCT Import & Sync */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium">NCTs (Quarterly Goals)</h2>
            <p className="text-sm text-zinc-500">
              {activeNcts.length} active narratives.{" "}
              <Link href="/ncts" className="text-blue-600 hover:underline">View full NCT framework</Link>
            </p>
          </div>
          <div className="flex gap-2">
            <label className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md cursor-pointer hover:bg-zinc-50 flex items-center gap-2">
              {importing && <Spinner size="sm" />}
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            </label>
            {quarters.map((q) => (
              <button key={q} onClick={() => archiveQuarter(q)} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50">
                Archive {q}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Google Sheets NCT Sync */}
      <Card>
        <h2 className="text-lg font-medium mb-4">Google Sheets NCT Sync</h2>
        <p className="text-sm text-zinc-500 mb-3">
          Sync NCTs from a public Google Sheet. The sheet should follow the NCT framework layout (Objectives, Narratives, Commitments, Tasks).
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

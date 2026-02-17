"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { parseNctRows } from "@/lib/nct-parser";

interface NctTask {
  id: number;
  text: string;
  isDone: boolean;
  sortOrder: number;
}

interface NctCommitment {
  id: number;
  name: string;
  type: string;
  description: string | null;
  dri: string | null;
  sortOrder: number;
  tasks: NctTask[];
}

interface Nct {
  id: number;
  goal: string;
  metric: string;
  target: number;
  current: number;
  quarter: string;
  objective: string | null;
  description: string | null;
  isActive: boolean;
  commitments: NctCommitment[];
}

const TYPE_COLORS: Record<string, string> = {
  Quantitative: "bg-blue-100 text-blue-800",
  "Think-It": "bg-purple-100 text-purple-800",
  "Build-It": "bg-amber-100 text-amber-800",
  "Launch-It": "bg-emerald-100 text-emerald-800",
};

function parseCsvLine(line: string): string[] {
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
}

export default function NctsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ncts, setNcts] = useState<Nct[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ncts");
      setNcts(await res.json());
    } catch {
      toast("Failed to load NCTs", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(activeNcts.map((n) => n.id)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const toggleTask = async (taskId: number, isDone: boolean) => {
    // Optimistic update
    setNcts((prev) =>
      prev.map((nct) => ({
        ...nct,
        commitments: nct.commitments.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) =>
            t.id === taskId ? { ...t, isDone } : t
          ),
        })),
      }))
    );
    try {
      await fetch("/api/nct-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, isDone }),
      });
    } catch {
      toast("Failed to update task", "error");
      load();
    }
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

  const activeNcts = ncts.filter((n) => n.isActive);
  const quarters = [...new Set(activeNcts.map((n) => n.quarter))];
  const objectives = [...new Set(activeNcts.map((n) => n.objective).filter(Boolean))] as string[];

  // Progress summary
  const totalCommitments = activeNcts.reduce((sum, n) => sum + n.commitments.length, 0);
  const totalTasks = activeNcts.reduce(
    (sum, n) => sum + n.commitments.reduce((s, c) => s + c.tasks.length, 0), 0
  );
  const doneTasks = activeNcts.reduce(
    (sum, n) => sum + n.commitments.reduce((s, c) => s + c.tasks.filter((t) => t.isDone).length, 0), 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-zinc-500">Loading NCTs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">NCT Framework</h1>
          {quarters.length > 0 && (
            <p className="text-sm text-zinc-500 mt-1">
              {quarters.join(", ")} &mdash; {activeNcts.length} narratives, {totalCommitments} commitments, {doneTasks}/{totalTasks} tasks done
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50">
            Collapse All
          </button>
          <label className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md cursor-pointer hover:bg-zinc-50 flex items-center gap-2">
            {importing && <Spinner size="sm" />}
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
          </label>
        </div>
      </div>

      {/* Objectives */}
      {objectives.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-2">Objectives</h2>
          <ul className="space-y-1">
            {objectives.map((obj, i) => (
              <li key={i} className="text-sm text-zinc-700">
                {obj.split("\n").map((line, j) => (
                  <span key={j}>{line}{j < obj.split("\n").length - 1 && <br />}</span>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Empty state */}
      {activeNcts.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-500 text-center py-8">
            No NCTs yet. Import a CSV or sync from Google Sheets in <a href="/settings" className="text-blue-600 hover:underline">Settings</a>.
          </p>
        </Card>
      )}

      {/* Narratives */}
      {activeNcts.map((nct) => {
        const isExpanded = expanded.has(nct.id);
        const nctTasks = nct.commitments.flatMap((c) => c.tasks);
        const nctDone = nctTasks.filter((t) => t.isDone).length;
        const nctTotal = nctTasks.length;

        return (
          <Card key={nct.id} className="overflow-hidden">
            {/* Narrative header */}
            <button
              onClick={() => toggleExpand(nct.id)}
              className="w-full text-left flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{nct.goal}</span>
                  {nct.metric && (
                    <Badge className="bg-blue-100 text-blue-800">KR: {nct.metric}</Badge>
                  )}
                </div>
                {nct.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2">{nct.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 max-w-xs">
                    <ProgressBar current={nct.current} target={nct.target} />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {nct.current}/{nct.target}
                  </span>
                  {nctTotal > 0 && (
                    <span className="text-xs text-zinc-400">
                      {nctDone}/{nctTotal} tasks
                    </span>
                  )}
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-zinc-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded content */}
            {isExpanded && nct.commitments.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 pt-4 space-y-4">
                {/* Commitments table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left py-1.5 font-medium text-zinc-500">Commitment</th>
                      <th className="text-left py-1.5 font-medium text-zinc-500 w-28">Type</th>
                      <th className="text-left py-1.5 font-medium text-zinc-500">Description</th>
                      <th className="text-left py-1.5 font-medium text-zinc-500 w-24">DRI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nct.commitments.map((c) => (
                      <tr key={c.id} className="border-b border-zinc-50 align-top">
                        <td className="py-2 font-medium">{c.name}</td>
                        <td className="py-2">
                          <Badge className={TYPE_COLORS[c.type] || "bg-zinc-100 text-zinc-700"}>
                            {c.type}
                          </Badge>
                        </td>
                        <td className="py-2 text-zinc-600">{c.description}</td>
                        <td className="py-2 text-zinc-500">{c.dri}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tasks checklists grouped by commitment */}
                {nct.commitments
                  .filter((c) => c.tasks.length > 0)
                  .map((c) => (
                    <div key={`tasks-${c.id}`}>
                      <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                        {c.name} — Tasks
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {c.tasks.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-zinc-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={t.isDone}
                              onChange={(e) => toggleTask(t.id, e.target.checked)}
                              className="rounded border-zinc-300"
                            />
                            <span className={`text-sm ${t.isDone ? "line-through text-zinc-400" : "text-zinc-700"}`}>
                              {t.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {isExpanded && nct.commitments.length === 0 && (
              <p className="mt-4 text-sm text-zinc-400 border-t border-zinc-100 pt-4">
                No commitments yet for this narrative.
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

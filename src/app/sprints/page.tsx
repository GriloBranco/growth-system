"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { SprintCard } from "@/components/sprints/SprintCard";
import { KanbanBoard } from "@/components/sprints/KanbanBoard";
import { IceTable } from "@/components/sprints/IceTable";
import { daysRemaining, formatDateRange, SCOPES, STATUS_LABELS } from "@/lib/utils";

interface SprintTask {
  id: number;
  text: string;
  isDone: boolean;
  sortOrder: number;
}

interface SprintItem {
  id: number;
  name: string;
  scope: string;
  status: string;
  definitionOfDone: string;
  whyNow: string | null;
  calendarUrgency: number;
  impact: number;
  iceScore: number;
  deadline: string | null;
  carriedFromSprintId: number | null;
  sortOrder: number;
  owner: { id: number; name: string } | null;
  nct: { id: number; goal: string } | null;
  tasks: SprintTask[];
}

interface Sprint {
  id: number;
  name: string | null;
  startDate: string;
  endDate: string;
  status: string;
  performanceNotes: string | null;
  items: SprintItem[];
}

interface TeamMember {
  id: number;
  name: string;
}

interface Nct {
  id: number;
  goal: string;
}

interface SprintMetric {
  id: number;
  name: string | null;
  startDate: string;
  endDate: string;
  totalItems: number;
  completedItems: number;
  totalTasks: number;
  completedTasks: number;
  itemCompletionRate: number;
  taskCompletionRate: number;
}

type ViewMode = "cards" | "kanban" | "ice";

export default function SprintsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ncts, setNcts] = useState<Nct[]>([]);
  const [metrics, setMetrics] = useState<SprintMetric[]>([]);
  const [trend, setTrend] = useState<"improving" | "declining" | "stable">("stable");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showAddItem, setShowAddItem] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [itemDispositions, setItemDispositions] = useState<Record<number, "carry" | "backlog">>({});
  const [savingItem, setSavingItem] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "", scope: "Other", ownerId: "", definitionOfDone: "", whyNow: "",
    calendarUrgency: "1", impact: "1", nctId: "", deadline: "", tasks: "",
  });

  const load = useCallback(async () => {
    try {
      const [sprintsRes, membersRes, nctsRes, metricsRes] = await Promise.all([
        fetch("/api/sprints"),
        fetch("/api/team-members"),
        fetch("/api/ncts"),
        fetch("/api/sprints/metrics"),
      ]);
      setSprints(await sprintsRes.json());
      setTeamMembers(await membersRes.json());
      setNcts((await nctsRes.json()).filter((n: Nct & { isActive: boolean }) => n.isActive));
      const metricsData = await metricsRes.json();
      setMetrics(metricsData.metrics || []);
      setTrend(metricsData.trend || "stable");
    } catch {
      toast("Failed to load sprints data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const activeSprint = sprints.find((s) => s.status === "active");
  const pastSprints = sprints.filter((s) => s.status !== "active");

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch("/api/sprint-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      load();
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const updateIce = async (id: number, field: "calendarUrgency" | "impact", value: number) => {
    try {
      await fetch("/api/sprint-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      toast("ICE score updated");
      load();
    } catch {
      toast("Failed to update ICE", "error");
    }
  };

  const toggleTask = async (taskId: number, isDone: boolean) => {
    try {
      await fetch("/api/sprint-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, isDone }),
      });
      load();
    } catch {
      toast("Failed to update task", "error");
    }
  };

  const addTask = async (itemId: number, text: string) => {
    try {
      await fetch("/api/sprint-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintItemId: itemId, text }),
      });
      load();
    } catch {
      toast("Failed to add task", "error");
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await fetch(`/api/sprint-tasks?id=${taskId}`, { method: "DELETE" });
      load();
    } catch {
      toast("Failed to delete task", "error");
    }
  };

  const addItem = async () => {
    if (!activeSprint || !newItem.name.trim()) return;
    if (activeSprint.items.length >= 4) {
      toast("Max 4 sprint items. Move something to backlog first.", "error");
      return;
    }
    setSavingItem(true);
    try {
      await fetch("/api/sprint-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sprintId: activeSprint.id,
          name: newItem.name,
          scope: newItem.scope,
          ownerId: newItem.ownerId ? Number(newItem.ownerId) : null,
          definitionOfDone: newItem.definitionOfDone,
          whyNow: newItem.whyNow || null,
          calendarUrgency: Number(newItem.calendarUrgency),
          impact: Number(newItem.impact),
          nctId: newItem.nctId ? Number(newItem.nctId) : null,
          deadline: newItem.deadline || null,
          tasks: newItem.tasks ? newItem.tasks.split("\n").filter(Boolean) : [],
        }),
      });
      setNewItem({ name: "", scope: "Other", ownerId: "", definitionOfDone: "", whyNow: "", calendarUrgency: "1", impact: "1", nctId: "", deadline: "", tasks: "" });
      setShowAddItem(false);
      toast("Sprint item added");
      load();
    } catch {
      toast("Failed to add item", "error");
    } finally {
      setSavingItem(false);
    }
  };

  const completeSprint = async () => {
    if (!activeSprint) return;
    setCompleting(true);
    try {
      const incompleteItems = activeSprint.items.filter((i) => i.status !== "done");
      const carryOverIds = incompleteItems.filter((i) => itemDispositions[i.id] === "carry").map((i) => i.id);
      const backlogIds = incompleteItems.filter((i) => itemDispositions[i.id] !== "carry").map((i) => i.id);

      await fetch("/api/sprints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeSprint.id,
          complete: true,
          performanceNotes: completionNotes,
          carryOverItemIds: carryOverIds,
          moveToBacklogItemIds: backlogIds,
        }),
      });
      setShowComplete(false);
      setCompletionNotes("");
      setItemDispositions({});
      toast("Sprint completed!");
      load();
    } catch {
      toast("Failed to complete sprint", "error");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-zinc-500">Loading sprints...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sprints</h1>

      {/* Active Sprint */}
      {activeSprint ? (
        <Card className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-zinc-100">
            <div>
              <h2 className="font-medium">{activeSprint.name || "Current Sprint"}</h2>
              <p className="text-sm text-zinc-500">
                {formatDateRange(activeSprint.startDate, activeSprint.endDate)}
                <span className="ml-2">{daysRemaining(activeSprint.endDate)} days remaining</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex border border-zinc-200 rounded-md overflow-hidden">
                {(["cards", "kanban", "ice"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium ${
                      viewMode === mode ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    {mode === "cards" ? "Cards" : mode === "kanban" ? "Kanban" : "ICE Table"}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddItem(true)} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50">
                Add Item
              </button>
              <button
                onClick={() => {
                  const incompleteItems = activeSprint.items.filter((i) => i.status !== "done");
                  if (incompleteItems.length > 0) {
                    const dispositions: Record<number, "carry" | "backlog"> = {};
                    incompleteItems.forEach((i) => { dispositions[i.id] = "backlog"; });
                    setItemDispositions(dispositions);
                  }
                  setShowComplete(true);
                }}
                className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
              >
                Complete Sprint
              </button>
            </div>
          </div>

          <div className="p-4">
            {activeSprint.items.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">No items yet. Add items or start a Weekly Kickoff.</p>
            )}

            {viewMode === "cards" && (
              <div className="space-y-3">
                {activeSprint.items.map((item) => (
                  <SprintCard
                    key={item.id}
                    item={item}
                    expanded
                    onStatusChange={updateStatus}
                    onTaskToggle={toggleTask}
                    onTaskAdd={addTask}
                    onTaskDelete={deleteTask}
                  />
                ))}
              </div>
            )}

            {viewMode === "kanban" && (
              <KanbanBoard
                items={activeSprint.items}
                onStatusChange={updateStatus}
                onTaskToggle={toggleTask}
              />
            )}

            {viewMode === "ice" && (
              <IceTable
                items={activeSprint.items}
                onStatusChange={updateStatus}
                onIceUpdate={updateIce}
              />
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-zinc-500 text-center py-8">
            No active sprint. Go to <a href="/kickoff" className="text-blue-600 hover:underline">Weekly Kickoff</a> to start one.
          </p>
        </Card>
      )}

      {/* Add Item Modal */}
      {showAddItem && activeSprint && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddItem(false)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium">Add Sprint Item</h3>
            <input placeholder="Name" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newItem.scope} onChange={(e) => setNewItem({ ...newItem, scope: e.target.value })}>
                {SCOPES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newItem.ownerId} onChange={(e) => setNewItem({ ...newItem, ownerId: e.target.value })}>
                <option value="">Unassigned</option>
                {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <textarea placeholder="Definition of done" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" rows={2} value={newItem.definitionOfDone} onChange={(e) => setNewItem({ ...newItem, definitionOfDone: e.target.value })} />
            <textarea placeholder="Tasks (one per line)" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" rows={2} value={newItem.tasks} onChange={(e) => setNewItem({ ...newItem, tasks: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-zinc-500">Urgency (1-3)</label>
                <select className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newItem.calendarUrgency} onChange={(e) => setNewItem({ ...newItem, calendarUrgency: e.target.value })}>
                  <option value="1">1 - No pressure</option>
                  <option value="2">2 - 4-8 weeks</option>
                  <option value="3">3 - Within 4 weeks</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Impact (1-3)</label>
                <select className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newItem.impact} onChange={(e) => setNewItem({ ...newItem, impact: e.target.value })}>
                  <option value="1">1 - Research</option>
                  <option value="2">2 - Indirect</option>
                  <option value="3">3 - Direct</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Deadline</label>
                <input type="date" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newItem.deadline} onChange={(e) => setNewItem({ ...newItem, deadline: e.target.value })} />
              </div>
            </div>
            <select className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={newItem.nctId} onChange={(e) => setNewItem({ ...newItem, nctId: e.target.value })}>
              <option value="">No linked NCT</option>
              {ncts.map((n) => <option key={n.id} value={n.id}>{n.goal}</option>)}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddItem(false)} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md">Cancel</button>
              <button onClick={addItem} disabled={savingItem} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md disabled:opacity-50 flex items-center gap-2">
                {savingItem && <Spinner size="sm" />} Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Sprint Modal */}
      {showComplete && activeSprint && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowComplete(false)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium">Complete Sprint</h3>

            {activeSprint.items.filter((i) => i.status !== "done").length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-zinc-600">What should happen with incomplete items?</p>
                {activeSprint.items.filter((i) => i.status !== "done").map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-md">
                    <span className="text-sm">{item.name} <Badge className="ml-1 bg-zinc-100 text-zinc-600">{STATUS_LABELS[item.status]}</Badge></span>
                    <select
                      value={itemDispositions[item.id] || "backlog"}
                      onChange={(e) => setItemDispositions({ ...itemDispositions, [item.id]: e.target.value as "carry" | "backlog" })}
                      className="text-sm border border-zinc-200 rounded-md px-2 py-1"
                    >
                      <option value="backlog">Move to Backlog</option>
                      <option value="carry">Carry to Next Sprint</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Performance Notes</label>
              <textarea
                className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
                rows={3}
                placeholder="How did this sprint go? Any learnings?"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowComplete(false)} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md">Cancel</button>
              <button onClick={completeSprint} disabled={completing} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md disabled:opacity-50 flex items-center gap-2">
                {completing && <Spinner size="sm" />} Complete Sprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Velocity Metrics */}
      {metrics.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Sprint Velocity</h2>
            <Badge className={
              trend === "improving" ? "bg-emerald-100 text-emerald-700" :
              trend === "declining" ? "bg-red-100 text-red-700" :
              "bg-zinc-100 text-zinc-600"
            }>
              {trend === "improving" ? "Improving" : trend === "declining" ? "Declining" : "Stable"}
            </Badge>
          </div>
          <Card className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2.5 px-4 font-medium text-zinc-500">Sprint</th>
                  <th className="text-left py-2.5 px-4 font-medium text-zinc-500">Dates</th>
                  <th className="text-center py-2.5 px-4 font-medium text-zinc-500">Items</th>
                  <th className="text-center py-2.5 px-4 font-medium text-zinc-500">Tasks</th>
                  <th className="text-center py-2.5 px-4 font-medium text-zinc-500">Completion</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="py-2.5 px-4 font-medium">{m.name || `Sprint #${m.id}`}</td>
                    <td className="py-2.5 px-4 text-zinc-500">{formatDateRange(m.startDate, m.endDate)}</td>
                    <td className="py-2.5 px-4 text-center">{m.completedItems}/{m.totalItems}</td>
                    <td className="py-2.5 px-4 text-center">{m.completedTasks}/{m.totalTasks}</td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge className={
                        m.taskCompletionRate >= 80 ? "bg-emerald-100 text-emerald-700" :
                        m.taskCompletionRate >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }>
                        {m.taskCompletionRate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Sprint History */}
      {pastSprints.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Sprint History</h2>
          <div className="space-y-2">
            {pastSprints.map((sprint) => {
              const totalTasks = sprint.items.reduce((sum, i) => sum + i.tasks.length, 0);
              const doneTasks = sprint.items.reduce((sum, i) => sum + i.tasks.filter((t) => t.isDone).length, 0);
              const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
              const doneItems = sprint.items.filter((i) => i.status === "done").length;

              return (
                <details key={sprint.id} className="bg-white rounded-lg border border-zinc-200">
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50">
                    <div>
                      <span className="font-medium text-sm">{sprint.name || `Sprint`}</span>
                      <span className="text-sm text-zinc-500 ml-3">{formatDateRange(sprint.startDate, sprint.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-500">{doneItems}/{sprint.items.length} items done</span>
                      <Badge className={completionRate >= 80 ? "bg-emerald-100 text-emerald-700" : completionRate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                        {completionRate}% tasks
                      </Badge>
                    </div>
                  </summary>
                  <div className="p-4 pt-0 border-t border-zinc-100">
                    {sprint.performanceNotes && (
                      <p className="text-sm text-zinc-600 mb-3 italic">{sprint.performanceNotes}</p>
                    )}
                    <div className="space-y-2">
                      {sprint.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${item.status === "done" ? "text-emerald-600" : "text-zinc-500"}`}>
                              {item.status === "done" ? "\u2713" : "\u2717"} {item.name}
                            </span>
                          </div>
                          <Badge className="bg-zinc-100 text-zinc-600">{STATUS_LABELS[item.status]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

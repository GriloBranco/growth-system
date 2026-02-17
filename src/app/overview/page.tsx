"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SprintCard } from "@/components/sprints/SprintCard";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { daysUntil, formatDate, formatDateRange, EVENT_TYPE_COLORS } from "@/lib/utils";

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
  items: SprintItem[];
}

interface NctCommitment {
  id: number;
  name: string;
  tasks: { id: number; isDone: boolean }[];
}

interface Nct {
  id: number;
  goal: string;
  metric: string;
  target: number;
  current: number;
  quarter: string;
  isActive: boolean;
  commitments?: NctCommitment[];
}

interface CalendarEvent {
  id: number;
  name: string;
  type: string;
  states: string;
  startDate: string;
  endDate: string;
  prepStartDate: string | null;
  relevanceNote: string | null;
}

interface BacklogItem {
  id: number;
  name: string;
  scope: string;
  iceScore: number;
}

export default function OverviewPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [ncts, setNcts] = useState<Nct[]>([]);
  const [alerts, setAlerts] = useState<CalendarEvent[]>([]);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);

  const load = useCallback(async () => {
    try {
      const [sprintRes, nctsRes, alertsRes, backlogRes] = await Promise.all([
        fetch("/api/sprints?active=true"),
        fetch("/api/ncts"),
        fetch("/api/calendar?alerts=true"),
        fetch("/api/backlog"),
      ]);
      const sprints = await sprintRes.json();
      setActiveSprint(sprints[0] || null);
      setNcts((await nctsRes.json()).filter((n: Nct) => n.isActive));
      setAlerts(await alertsRes.json());
      setBacklog(await backlogRes.json());
    } catch {
      toast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
        <span className="ml-3 text-sm text-zinc-500">Loading overview...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left column - 65% */}
      <div className="flex-1 min-w-0 space-y-4" style={{ flexBasis: "65%" }}>
        <h1 className="text-2xl font-semibold">Overview</h1>

        {activeSprint ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-medium">{activeSprint.name || "Current Sprint"}</h2>
                <p className="text-sm text-zinc-500">
                  {formatDateRange(activeSprint.startDate, activeSprint.endDate)}
                  <span className="ml-2">{daysUntil(activeSprint.endDate)} days remaining</span>
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {activeSprint.items.map((item) => (
                <SprintCard
                  key={item.id}
                  item={item}
                  onStatusChange={updateStatus}
                  onTaskToggle={toggleTask}
                  onTaskAdd={addTask}
                  onTaskDelete={deleteTask}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <p className="text-sm text-zinc-500 text-center py-8">
              No active sprint. Go to <a href="/kickoff" className="text-blue-600 hover:underline">Weekly Kickoff</a> to start one.
            </p>
          </Card>
        )}
      </div>

      {/* Right column - 35% */}
      <div className="space-y-4" style={{ flexBasis: "35%", minWidth: "300px" }}>
        {/* Calendar Alerts */}
        <Card>
          <h3 className="font-medium mb-3">Calendar Alerts</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming events in the next 30 days.</p>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 8).map((event) => {
                const days = daysUntil(event.startDate);
                const prepDays = event.prepStartDate ? daysUntil(event.prepStartDate) : null;
                return (
                  <div key={event.id} className="py-2 border-b border-zinc-50 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{event.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {event.states.split(",").map((s) => (
                            <Badge key={s} className="bg-zinc-100 text-zinc-600">{s}</Badge>
                          ))}
                          <Badge className={EVENT_TYPE_COLORS[event.type]}>{event.type}</Badge>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className={`text-sm font-medium ${days <= 7 ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-zinc-600"}`}>
                          {days <= 0 ? "Now" : `${days}d`}
                        </p>
                        {prepDays !== null && prepDays <= 0 && days > 0 && (
                          <span className="text-xs text-amber-600 font-medium">Prep NOW</span>
                        )}
                      </div>
                    </div>
                    {event.relevanceNote && (
                      <p className="text-xs text-zinc-500 mt-1">{event.relevanceNote}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* NCT Progress */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">NCT Progress</h3>
            <a href="/ncts" className="text-xs text-blue-600 hover:underline">View all</a>
          </div>
          {ncts.length === 0 ? (
            <p className="text-sm text-zinc-500">No active NCTs. Add them in Settings.</p>
          ) : (
            <div className="space-y-3">
              {ncts.map((nct) => {
                const commitCount = nct.commitments?.length || 0;
                const taskCount = nct.commitments?.reduce((s, c) => s + c.tasks.length, 0) || 0;
                const doneCount = nct.commitments?.reduce((s, c) => s + c.tasks.filter((t) => t.isDone).length, 0) || 0;
                return (
                  <div key={nct.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate mr-2">{nct.goal}</p>
                      <span className="text-xs text-zinc-500 flex-shrink-0">{nct.quarter}</span>
                    </div>
                    <ProgressBar current={nct.current} target={nct.target} />
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-zinc-500">
                        {nct.current} / {nct.target} {nct.metric}
                      </p>
                      {commitCount > 0 && (
                        <p className="text-xs text-zinc-400">
                          {commitCount} commitments{taskCount > 0 ? `, ${doneCount}/${taskCount} tasks` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Backlog Top 5 */}
        <Card>
          <h3 className="font-medium mb-3">Up Next from Backlog</h3>
          {backlog.length === 0 ? (
            <p className="text-sm text-zinc-500">Backlog is empty.</p>
          ) : (
            <div className="space-y-2">
              {backlog.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-sm truncate mr-2">{item.name}</span>
                  <Badge className={item.iceScore >= 7 ? "bg-red-100 text-red-700" : item.iceScore >= 4 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}>
                    ICE: {item.iceScore}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

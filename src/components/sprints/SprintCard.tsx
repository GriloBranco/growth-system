"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { TaskChecklist } from "./TaskChecklist";
import { SCOPE_COLORS, STATUS_COLORS, STATUS_LABELS, STATUSES, formatDate } from "@/lib/utils";

interface SprintTask {
  id: number;
  text: string;
  isDone: boolean;
  sortOrder: number;
}

interface SprintItemData {
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

interface SprintCardProps {
  item: SprintItemData;
  expanded?: boolean;
  onStatusChange: (id: number, status: string) => void;
  onTaskToggle: (taskId: number, isDone: boolean) => void;
  onTaskAdd: (itemId: number, text: string) => void;
  onTaskDelete: (taskId: number) => void;
}

export function SprintCard({ item, expanded = false, onStatusChange, onTaskToggle, onTaskAdd, onTaskDelete }: SprintCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const completedTasks = item.tasks.filter((t) => t.isDone).length;

  return (
    <div className={`bg-white rounded-lg border ${item.status === "done" ? "border-emerald-200" : "border-zinc-200"} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="font-medium text-sm hover:text-blue-600">
              {item.name}
            </button>
            {item.carriedFromSprintId && (
              <Badge className="bg-amber-50 text-amber-700">Carried Over</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={SCOPE_COLORS[item.scope] || "bg-zinc-100 text-zinc-700"}>{item.scope}</Badge>
            {item.owner && <span className="text-xs text-zinc-500">{item.owner.name}</span>}
            {item.tasks.length > 0 && (
              <span className="text-xs text-zinc-500">{completedTasks}/{item.tasks.length} tasks</span>
            )}
            {item.deadline && (
              <span className="text-xs text-zinc-500">Due {formatDate(item.deadline)}</span>
            )}
            <Badge className={item.iceScore >= 7 ? "bg-red-100 text-red-700" : item.iceScore >= 4 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}>
              ICE: {item.iceScore}
            </Badge>
          </div>
        </div>
        <select
          value={item.status}
          onChange={(e) => onStatusChange(item.id, e.target.value)}
          className={`text-xs px-2 py-1 rounded-full border-0 font-medium ${STATUS_COLORS[item.status]}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-zinc-100 space-y-3">
          <div>
            <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">Definition of Done</h4>
            <p className="text-sm text-zinc-700">{item.definitionOfDone}</p>
          </div>

          {item.whyNow && (
            <div>
              <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1">Why Now</h4>
              <p className="text-sm text-zinc-600">{item.whyNow}</p>
            </div>
          )}

          {item.nct && (
            <div className="text-xs text-zinc-500">
              Linked NCT: {item.nct.goal}
            </div>
          )}

          <TaskChecklist
            tasks={item.tasks}
            onToggle={onTaskToggle}
            onAdd={(text) => onTaskAdd(item.id, text)}
            onDelete={onTaskDelete}
          />
        </div>
      )}
    </div>
  );
}

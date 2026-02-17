"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { SCOPE_COLORS, STATUS_COLORS, STATUS_LABELS, STATUSES, formatDate } from "@/lib/utils";

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

interface KanbanBoardProps {
  items: SprintItem[];
  onStatusChange: (id: number, status: string) => void;
  onTaskToggle: (taskId: number, isDone: boolean) => void;
}

const COLUMNS = STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s] }));

const COLUMN_COLORS: Record<string, string> = {
  not_started: "border-t-zinc-400",
  in_progress: "border-t-blue-500",
  review: "border-t-amber-500",
  done: "border-t-emerald-500",
};

export function KanbanBoard({ items, onStatusChange, onTaskToggle }: KanbanBoardProps) {
  const [dragItem, setDragItem] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDragStart = (itemId: number) => {
    setDragItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOver(status);
  };

  const handleDrop = (status: string) => {
    if (dragItem !== null) {
      onStatusChange(dragItem, status);
    }
    setDragItem(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOver(null);
  };

  return (
    <div className="grid grid-cols-4 gap-3 min-h-[300px]">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.key);
        return (
          <div
            key={col.key}
            className={`bg-zinc-50 rounded-lg border-t-2 ${COLUMN_COLORS[col.key]} ${
              dragOver === col.key ? "ring-2 ring-blue-300 bg-blue-50/30" : ""
            }`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.key)}
          >
            <div className="px-3 py-2 border-b border-zinc-200/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">{col.label}</span>
                <span className="text-xs text-zinc-400 bg-zinc-200/60 px-1.5 py-0.5 rounded-full">{colItems.length}</span>
              </div>
            </div>
            <div className="p-2 space-y-2">
              {colItems.map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  isDragging={dragItem === item.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onTaskToggle={onTaskToggle}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  item,
  isDragging,
  onDragStart,
  onDragEnd,
  onTaskToggle,
}: {
  item: SprintItem;
  isDragging: boolean;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onTaskToggle: (taskId: number, isDone: boolean) => void;
}) {
  const completedTasks = item.tasks.filter((t) => t.isDone).length;
  const totalTasks = item.tasks.length;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-md border border-zinc-200 p-3 cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? "opacity-40" : "hover:shadow-sm"
      }`}
    >
      <p className="text-sm font-medium mb-1.5">{item.name}</p>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Badge className={SCOPE_COLORS[item.scope] || "bg-zinc-100 text-zinc-700"}>{item.scope}</Badge>
        {item.owner && <span className="text-xs text-zinc-500">{item.owner.name}</span>}
        <Badge className={item.iceScore >= 7 ? "bg-red-100 text-red-700" : item.iceScore >= 4 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}>
          ICE: {item.iceScore}
        </Badge>
      </div>
      {item.deadline && (
        <p className="text-xs text-zinc-500 mb-1.5">Due {formatDate(item.deadline)}</p>
      )}
      {totalTasks > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">{completedTasks}/{totalTasks} tasks</span>
            <span className="text-xs text-zinc-400">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${completedTasks === totalTasks ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 space-y-0.5">
            {item.tasks.map((task) => (
              <label key={task.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.isDone}
                  onChange={() => onTaskToggle(task.id, !task.isDone)}
                  className="rounded border-zinc-300 h-3 w-3"
                />
                <span className={`text-xs ${task.isDone ? "line-through text-zinc-400" : "text-zinc-600"}`}>
                  {task.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { SCOPE_COLORS, STATUS_COLORS, STATUS_LABELS, STATUSES } from "@/lib/utils";

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

type SortKey = "name" | "iceScore" | "calendarUrgency" | "impact" | "status" | "scope";

interface IceTableProps {
  items: SprintItem[];
  onStatusChange: (id: number, status: string) => void;
  onIceUpdate: (id: number, field: "calendarUrgency" | "impact", value: number) => void;
}

export function IceTable({ items, onStatusChange, onIceUpdate }: IceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("iceScore");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  const sorted = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "scope") cmp = a.scope.localeCompare(b.scope);
    else if (sortKey === "status") cmp = STATUSES.indexOf(a.status as typeof STATUSES[number]) - STATUSES.indexOf(b.status as typeof STATUSES[number]);
    else cmp = (a[sortKey] as number) - (b[sortKey] as number);
    return sortAsc ? cmp : -cmp;
  });

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <th
      className="text-left py-2.5 px-3 font-medium text-zinc-500 cursor-pointer hover:text-zinc-900 select-none text-xs uppercase tracking-wide"
      onClick={() => handleSort(sortKeyVal)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyVal && (
          <span className="text-zinc-400">{sortAsc ? "\u25B2" : "\u25BC"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200">
            <SortHeader label="Item" sortKeyVal="name" />
            <SortHeader label="Scope" sortKeyVal="scope" />
            <th className="text-left py-2.5 px-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Owner</th>
            <SortHeader label="Status" sortKeyVal="status" />
            <SortHeader label="Urgency" sortKeyVal="calendarUrgency" />
            <SortHeader label="Impact" sortKeyVal="impact" />
            <SortHeader label="ICE" sortKeyVal="iceScore" />
            <th className="text-left py-2.5 px-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Tasks</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const completedTasks = item.tasks.filter((t) => t.isDone).length;
            return (
              <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                <td className="py-2.5 px-3">
                  <span className="font-medium">{item.name}</span>
                  {item.carriedFromSprintId && (
                    <Badge className="ml-1.5 bg-amber-50 text-amber-700">Carried</Badge>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <Badge className={SCOPE_COLORS[item.scope] || "bg-zinc-100 text-zinc-700"}>{item.scope}</Badge>
                </td>
                <td className="py-2.5 px-3 text-zinc-600">{item.owner?.name || "—"}</td>
                <td className="py-2.5 px-3">
                  <select
                    value={item.status}
                    onChange={(e) => onStatusChange(item.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${STATUS_COLORS[item.status]}`}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 px-3">
                  <select
                    value={item.calendarUrgency}
                    onChange={(e) => onIceUpdate(item.id, "calendarUrgency", Number(e.target.value))}
                    className="text-sm border border-zinc-200 rounded px-2 py-1 w-full max-w-[120px]"
                  >
                    <option value={1}>1 - None</option>
                    <option value={2}>2 - 4-8wk</option>
                    <option value={3}>3 - &lt;4wk</option>
                  </select>
                </td>
                <td className="py-2.5 px-3">
                  <select
                    value={item.impact}
                    onChange={(e) => onIceUpdate(item.id, "impact", Number(e.target.value))}
                    className="text-sm border border-zinc-200 rounded px-2 py-1 w-full max-w-[120px]"
                  >
                    <option value={1}>1 - Research</option>
                    <option value={2}>2 - Indirect</option>
                    <option value={3}>3 - Direct</option>
                  </select>
                </td>
                <td className="py-2.5 px-3">
                  <Badge className={
                    item.iceScore >= 7 ? "bg-red-100 text-red-700" :
                    item.iceScore >= 4 ? "bg-amber-100 text-amber-700" :
                    "bg-zinc-100 text-zinc-600"
                  }>
                    {item.iceScore}
                  </Badge>
                </td>
                <td className="py-2.5 px-3">
                  {item.tasks.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-zinc-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${completedTasks === item.tasks.length ? "bg-emerald-500" : "bg-blue-500"}`}
                          style={{ width: `${(completedTasks / item.tasks.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{completedTasks}/{item.tasks.length}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

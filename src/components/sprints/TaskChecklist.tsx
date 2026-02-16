"use client";

import { useState } from "react";

interface SprintTask {
  id: number;
  text: string;
  isDone: boolean;
  sortOrder: number;
}

interface TaskChecklistProps {
  tasks: SprintTask[];
  onToggle: (taskId: number, isDone: boolean) => void;
  onAdd: (text: string) => void;
  onDelete: (taskId: number) => void;
}

export function TaskChecklist({ tasks, onToggle, onAdd, onDelete }: TaskChecklistProps) {
  const [newTask, setNewTask] = useState("");

  const handleAdd = () => {
    if (!newTask.trim()) return;
    onAdd(newTask.trim());
    setNewTask("");
  };

  return (
    <div>
      <h4 className="text-xs font-medium text-zinc-500 uppercase mb-2">Tasks</h4>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={task.isDone}
              onChange={() => onToggle(task.id, !task.isDone)}
              className="rounded border-zinc-300"
            />
            <span className={`text-sm flex-1 ${task.isDone ? "line-through text-zinc-400" : "text-zinc-700"}`}>
              {task.text}
            </span>
            <button
              onClick={() => onDelete(task.id)}
              className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-xs"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          placeholder="Add task..."
          className="flex-1 px-2 py-1 text-sm border border-zinc-200 rounded-md"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button onClick={handleAdd} className="text-sm text-zinc-500 hover:text-zinc-900">Add</button>
      </div>
    </div>
  );
}

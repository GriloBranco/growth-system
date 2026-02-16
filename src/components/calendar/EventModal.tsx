"use client";

import { useState, useEffect } from "react";
import { EVENT_TYPES } from "@/lib/utils";

interface CalendarEvent {
  id?: number;
  name: string;
  type: string;
  states: string;
  startDate: string;
  endDate: string;
  prepStartDate: string | null;
  relevanceNote: string | null;
  isRecurring?: boolean;
}

interface EventModalProps {
  event: CalendarEvent | null;
  isNew?: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => Promise<void> | void;
  onDelete?: (id: number) => void;
}

function toDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export function EventModal({ event, isNew, onClose, onSave, onDelete }: EventModalProps) {
  const [form, setForm] = useState<CalendarEvent>({
    name: "",
    type: "test",
    states: "ALL",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    prepStartDate: null,
    relevanceNote: null,
  });

  useEffect(() => {
    if (event) setForm(event);
  }, [event]);

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium">{isNew ? "Add Event" : "Edit Event"}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
              <select className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">States</label>
              <input className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" placeholder="TX,CA or ALL" value={form.states} onChange={(e) => setForm({ ...form, states: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Start Date</label>
              <input type="date" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={toDateInput(form.startDate)} onChange={(e) => setForm({ ...form, startDate: new Date(e.target.value).toISOString() })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">End Date</label>
              <input type="date" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={toDateInput(form.endDate)} onChange={(e) => setForm({ ...form, endDate: new Date(e.target.value).toISOString() })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Prep Start Date (optional)</label>
            <input type="date" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={toDateInput(form.prepStartDate)} onChange={(e) => setForm({ ...form, prepStartDate: e.target.value ? new Date(e.target.value).toISOString() : null })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Relevance Note</label>
            <textarea className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" rows={2} value={form.relevanceNote || ""} onChange={(e) => setForm({ ...form, relevanceNote: e.target.value || null })} />
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <div>
            {!isNew && event?.id && onDelete && (
              <button onClick={() => { onDelete(event.id!); onClose(); }} className="text-sm text-red-500 hover:text-red-700">
                Delete Event
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md hover:bg-zinc-50">Cancel</button>
            <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

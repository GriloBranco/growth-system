"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ListView } from "@/components/calendar/ListView";
import { EventModal } from "@/components/calendar/EventModal";

interface CalendarEvent {
  id: number;
  name: string;
  type: string;
  states: string;
  startDate: string;
  endDate: string;
  prepStartDate: string | null;
  relevanceNote: string | null;
  isRecurring?: boolean;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [filterState, setFilterState] = useState("ALL");
  const [filterType, setFilterType] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterState !== "ALL") params.set("state", filterState);
    if (filterType) params.set("type", filterType);
    const res = await fetch(`/api/calendar?${params}`);
    setEvents(await res.json());
  }, [filterState, filterType]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const saveEvent = async (event: { id?: number; name: string; type: string; states: string; startDate: string; endDate: string; prepStartDate: string | null; relevanceNote: string | null }) => {
    if (event.id) {
      await fetch("/api/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } else {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    }
    load();
  };

  const deleteEvent = async (id: number) => {
    await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">School Calendar</h1>
        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
            <option value="ALL">All States</option>
            <option value="TX">Texas</option>
            <option value="CA">California</option>
            <option value="FL">Florida</option>
          </select>
          <select className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="test">Tests</option>
            <option value="break">Breaks</option>
            <option value="milestone">Milestones</option>
            <option value="marketing">Marketing</option>
          </select>
          <div className="flex border border-zinc-200 rounded-md overflow-hidden">
            <button onClick={() => setView("grid")} className={`px-3 py-1.5 text-sm ${view === "grid" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"}`}>Grid</button>
            <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"}`}>List</button>
          </div>
          <button onClick={() => setShowNewModal(true)} className="px-3 py-1.5 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800">Add Event</button>
        </div>
      </div>

      {view === "grid" && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 rounded-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-lg font-medium">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 rounded-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <CalendarGrid year={year} month={month} events={events} onEventClick={setSelectedEvent} />
        </>
      )}

      {view === "list" && (
        <ListView events={events} onEventClick={setSelectedEvent} />
      )}

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onSave={saveEvent} onDelete={deleteEvent} />
      )}

      {showNewModal && (
        <EventModal event={null} isNew onClose={() => setShowNewModal(false)} onSave={saveEvent} />
      )}
    </div>
  );
}

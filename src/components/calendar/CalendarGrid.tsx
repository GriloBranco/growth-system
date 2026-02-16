"use client";

import { EVENT_TYPE_BAR_COLORS } from "@/lib/utils";

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

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarGrid({ year, month, events, onEventClick }: CalendarGridProps) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const getEventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(12, 0, 0, 0);
    return events.filter((e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Fill leading empty cells (Mon-based: shift so Mon=0)
  const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  for (let i = 0; i < adjustedStart; i++) currentWeek.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-zinc-50">
        {dayNames.map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-zinc-500 text-center border-b border-zinc-200">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            // Deduplicate events by id
            const uniqueEvents = dayEvents.filter(
              (e, i, arr) => arr.findIndex((x) => x.id === e.id) === i
            );
            return (
              <div
                key={di}
                className={`min-h-[80px] border-b border-r border-zinc-100 p-1 ${
                  day ? "bg-white" : "bg-zinc-50"
                }`}
              >
                {day && (
                  <>
                    <div
                      className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday(day) ? "bg-blue-600 text-white" : "text-zinc-700"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {uniqueEvents.slice(0, 3).map((e) => (
                        <button
                          key={e.id}
                          onClick={() => onEventClick(e)}
                          className={`w-full text-left px-1 py-0.5 rounded text-[10px] leading-tight truncate text-white ${EVENT_TYPE_BAR_COLORS[e.type] || "bg-zinc-400"}`}
                        >
                          {e.name}
                        </button>
                      ))}
                      {uniqueEvents.length > 3 && (
                        <span className="text-[10px] text-zinc-500">+{uniqueEvents.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

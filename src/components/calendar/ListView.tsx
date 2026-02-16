"use client";

import { Badge } from "@/components/ui/Badge";
import { formatDateRange, daysUntil, EVENT_TYPE_COLORS } from "@/lib/utils";

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

interface ListViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function ListView({ events, onEventClick }: ListViewProps) {
  return (
    <div className="space-y-1">
      {events.length === 0 && (
        <p className="text-sm text-zinc-500 py-8 text-center">No events match your filters.</p>
      )}
      {events.map((event) => {
        const days = daysUntil(event.startDate);
        const prepDays = event.prepStartDate ? daysUntil(event.prepStartDate) : null;
        const isPast = days < 0;

        return (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-lg hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition ${isPast ? "opacity-60" : ""}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{event.name}</div>
                <div className="text-xs text-zinc-500">{formatDateRange(event.startDate, event.endDate)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {event.states.split(",").map((s) => (
                <Badge key={s} className="bg-zinc-100 text-zinc-600">{s}</Badge>
              ))}
              <Badge className={EVENT_TYPE_COLORS[event.type] || "bg-zinc-100 text-zinc-600"}>
                {event.type}
              </Badge>
              <span className={`text-xs font-medium w-20 text-right ${
                days < 0 ? "text-zinc-400" : days <= 7 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-zinc-500"
              }`}>
                {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "Today" : `in ${days}d`}
              </span>
              {prepDays !== null && prepDays <= 0 && days >= 0 && (
                <Badge className="bg-amber-100 text-amber-800">Prep NOW</Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

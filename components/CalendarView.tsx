// @ts-nocheck
"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";

interface MoodleEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  course: string;
  approved: boolean;
}

interface Props {
  events: MoodleEvent[];
  completed: Set<string>;
  onEventClick?: (id: string) => void;
}

function typeColor(type: string) {
  switch (type) {
    case "exam": return "#f87171";         // red
    case "quiz": return "#fb923c";         // orange
    case "assignment": return "#60a5fa";   // blue
    case "presentation": return "#a78bfa"; // purple
    case "class": return "#d1d5db";        // grey
    default: return "#9ca3af";
  }
}

export default function CalendarView({ events, completed, onEventClick }: Props) {
  const calEvents = events
    .filter((e) => e.approved && e.date && !completed.has(e.id))
    .map((e) => ({
      id: e.id,
      title: e.title,
      start: e.date,
      backgroundColor: typeColor(e.type),
      borderColor: typeColor(e.type),
      textColor: e.type === "class" ? "#6b7280" : "#fff",
      extendedProps: { course: e.course, type: e.type },
    }));

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 fc-dark">
      <style>{`
        .fc-dark .fc-toolbar-title { color: #1c1917; font-weight: 600; }
        .fc-dark .fc-col-header-cell-cushion { color: #44403c; font-weight: 600; text-decoration: none; }
        .fc-dark .fc-daygrid-day-number { color: #1c1917; font-weight: 500; text-decoration: none; }
        .fc-dark .fc-button { background: #1c1917; border-color: #1c1917; color: #fff; }
        .fc-dark .fc-button:hover { background: #44403c; border-color: #44403c; }
        .fc-dark .fc-button-active { background: #57534e !important; border-color: #57534e !important; }
        .fc-dark .fc-day-other .fc-daygrid-day-number { color: #a8a29e; }
        .fc-dark .fc-list-day-text, .fc-dark .fc-list-day-side-text { color: #1c1917; font-weight: 600; }
        .fc-dark .fc-list-event-title { color: #1c1917; }
        .fc-dark .fc-list-event-time { color: #78716c; }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listMonth",
        }}
        events={calEvents}
        eventClick={(info) => onEventClick?.(info.event.id)}
        height={600}
        eventDisplay="block"
        displayEventTime={false}
      />
    </div>
  );
}

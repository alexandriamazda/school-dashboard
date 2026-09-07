"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { format, parseISO, isToday, isTomorrow, differenceInDays } from "date-fns";
import {
  CheckCircle, Clock, BookOpen, LogOut, RefreshCw,
  X, Check, FileText, ClipboardList, FolderOpen
} from "lucide-react";

const CalendarView = lazy(() => import("../components/CalendarView"));

interface MoodleEvent {
  id: string;
  title: string;
  date: string;
  course: string;
  description?: string;
  type: string;
  approved: boolean;
  url?: string;
  attachments?: string[];
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
}

function typeColor(type: string) {
  switch (type) {
    case "exam": return "bg-red-50 text-red-600 border-red-200";
    case "quiz": return "bg-orange-50 text-orange-600 border-orange-200";
    case "assignment": return "bg-blue-50 text-blue-600 border-blue-200";
    case "presentation": return "bg-purple-50 text-purple-600 border-purple-200";
    default: return "bg-stone-50 text-stone-500 border-stone-200";
  }
}

function typeBar(type: string) {
  switch (type) {
    case "exam": return "bg-red-400";
    case "quiz": return "bg-orange-400";
    case "assignment": return "bg-blue-400";
    case "presentation": return "bg-purple-400";
    default: return "bg-stone-200";
  }
}

function formatDate(dateStr: string) {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "MMM d, h:mm a");
  } catch { return dateStr; }
}

export default function Dashboard() {
  const { data: session, status } = useSession();

  const [moodleEvents, setMoodleEvents] = useState<MoodleEvent[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw: MoodleEvent[] = JSON.parse(localStorage.getItem("alex_events") || "[]");
      // Deduplicate by id
      const seen = new Set<string>();
      return raw.filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    } catch { return []; }
  });
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [pendingReview, setPendingReview] = useState<MoodleEvent[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("alex_pending") || "[]"); } catch { return []; }
  });
  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("alex_completed") || "[]")); } catch { return new Set(); }
  });

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "review">("dashboard");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteCourse, setPasteCourse] = useState("");
  const [showFolderLoad, setShowFolderLoad] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [folderCourse, setFolderCourse] = useState("");
  const [folderLoading, setFolderLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MoodleEvent | null>(null);

  // Persist to localStorage (local cache) + KV (server sync)
  useEffect(() => {
    localStorage.setItem("alex_events", JSON.stringify(moodleEvents));
    // Sync to server in background
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: moodleEvents }),
    }).catch(() => {});
  }, [moodleEvents]);

  useEffect(() => {
    localStorage.setItem("alex_pending", JSON.stringify(pendingReview));
  }, [pendingReview]);

  useEffect(() => {
    localStorage.setItem("alex_completed", JSON.stringify([...completed]));
    fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: [...completed] }),
    }).catch(() => {});
  }, [completed]);

  // On load: if localStorage is empty, pull from KV
  useEffect(() => {
    if (moodleEvents.length === 0) {
      fetch("/api/data").then(r => r.json()).then(data => {
        if (data.events?.length > 0) {
          setMoodleEvents(data.events);
          localStorage.setItem("alex_events", JSON.stringify(data.events));
        }
        if (data.completed?.length > 0) {
          setCompleted(new Set(data.completed));
          localStorage.setItem("alex_completed", JSON.stringify(data.completed));
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => { if (session) fetchCalendar(); }, [session]);

  function toggleComplete(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function mergeEvents(newEvents: MoodleEvent[]) {
    setMoodleEvents((prev) => {
      const existing = new Set(prev.map((e) => e.id));
      const fresh = newEvents
        .filter((e) => !existing.has(e.id))
        .map((e) => existing.has(e.id) ? { ...e, id: `${e.id}-${Date.now()}-${Math.random().toString(36).slice(2)}` } : e);
      return [...prev, ...fresh];
    });
    setPendingReview((prev) => {
      const existing = new Set(prev.map((e) => e.id));
      const fresh = newEvents
        .filter((e) => !existing.has(e.id))
        .map((e) => existing.has(e.id) ? { ...e, id: `${e.id}-${Date.now()}-${Math.random().toString(36).slice(2)}` } : e);
      return [...prev, ...fresh];
    });
  }

  async function fetchCalendar() {
    setLoading(true);
    const res = await fetch("/api/calendar");
    const data = await res.json();
    setCalendarEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleICSUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await fetch("/api/ics", { method: "POST", body: text });
    const data = await res.json();
    mergeEvents(data.events || []);
    setActiveTab("review");
  }

  async function handlePasteParse() {
    if (!pasteText.trim()) return;
    setSyncing(true);
    const res = await fetch("/api/parse-course", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pasteText, courseName: pasteCourse }),
    });
    const data = await res.json();
    mergeEvents(data.events || []);
    setShowPaste(false);
    setPasteText("");
    setPasteCourse("");
    setSyncing(false);
    setActiveTab("review");
  }

  async function loadFolder() {
    if (!folderPath.trim()) return;
    setFolderLoading(true);
    const res = await fetch("/api/load-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath: folderPath.trim(), courseName: folderCourse.trim() }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); setFolderLoading(false); return; }
    mergeEvents(data.events || []);
    setShowFolderLoad(false);
    setFolderPath("");
    setFolderCourse("");
    setFolderLoading(false);
    setActiveTab("review");
  }

  async function approveEvent(event: MoodleEvent) {
    const startDate = event.date ? new Date(event.date).toISOString() : new Date().toISOString();
    const description = [
      `Course: ${event.course}`,
      event.description || "",
      event.attachments?.length
        ? "📎 Files:\n" + event.attachments.map((a: any) => `${typeof a === "string" ? a : a.name}: ${typeof a === "string" ? "" : a.url}`).join("\n")
        : "",
    ].filter(Boolean).join("\n\n");

    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `📚 ${event.title}`,
        description,
        startDate,
        endDate: startDate,
      }),
    });
    setPendingReview((prev) => prev.filter((e) => e.id !== event.id));
    setMoodleEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, approved: true } : e));
    fetchCalendar();
  }

  async function approveAll() {
    for (const event of [...pendingReview]) {
      await approveEvent(event);
    }
  }

  function dismissEvent(id: string) {
    setPendingReview((prev) => prev.filter((e) => e.id !== id));
  }

  // To-do: approved items entering their window by type
  const todoItems = useMemo(() => {
    const now = new Date();
    return moodleEvents
      .filter((e) => e.approved && e.date && !completed.has(e.id))
      .filter((e) => {
        const days = differenceInDays(parseISO(e.date), now);
        if (days < 0) return false;
        const t = e.type.toLowerCase();
        if (t === "exam") return days <= 20;
        if (t === "quiz") return days <= 14;
        return days <= 10;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [moodleEvents, completed]);

  // Upcoming: all approved + calendar events sorted soonest first, deduped
  const upcomingItems = useMemo(() => {
    const now = new Date();
    const seen = new Set<string>();

    const all = [
      ...moodleEvents
        .filter((e) => e.approved && e.date && new Date(e.date) >= now && !completed.has(e.id))
        .map((e) => ({ id: e.id, title: e.title, date: e.date, type: e.type, course: e.course })),
      ...calendarEvents
        .filter((e) => e.start?.dateTime && new Date(e.start.dateTime) >= now)
        .map((e) => ({ id: e.id, title: e.summary, date: e.start.dateTime, type: "calendar", course: "" })),
    ];

    return all
      .filter((e) => {
        const key = `${e.title?.slice(0, 30)}-${e.date?.slice(0, 10)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [moodleEvents, calendarEvents, completed]);

  if (status === "loading") {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-400 text-sm">Loading...</p></div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-10 text-center max-w-sm w-full">
          <h1 className="text-2xl font-semibold text-stone-800 mb-2">Alex's Dashboard</h1>
          <p className="text-stone-400 text-sm mb-8">School assignments, deadlines & materials — all in one place.</p>
          <div className="space-y-3">
            <button onClick={() => signIn("google")} className="w-full bg-stone-800 text-white py-3 px-6 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
              Sign in with Google (Calendar & Drive)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Folder load modal */}
      {showFolderLoad && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-stone-800">Load Course Folder</h2>
              <button onClick={() => setShowFolderLoad(false)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <p className="text-xs text-stone-400 mb-3">Folder name from Downloads (e.g. <span className="font-mono text-stone-600">FA26HP1 Marketing Principles</span>) or full path.</p>
            <input type="text" placeholder="Folder name or full path" value={folderPath} onChange={(e) => setFolderPath(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <input type="text" placeholder="Course name (e.g. Marketing Principles)" value={folderCourse} onChange={(e) => setFolderCourse(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-4 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowFolderLoad(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancel</button>
              <button onClick={loadFolder} disabled={folderLoading} className="px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50">
                {folderLoading ? "Loading..." : "Load"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste modal */}
      {showPaste && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-stone-800">Paste Course Page Content</h2>
              <button onClick={() => setShowPaste(false)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <input type="text" placeholder="Course name (optional)" value={pasteCourse} onChange={(e) => setPasteCourse(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <textarea className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm h-64 focus:outline-none focus:ring-2 focus:ring-stone-300 font-mono resize-none text-stone-800 placeholder:text-stone-400"
              placeholder="Paste the full text from your Moodle course page here..." value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowPaste(false)} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Cancel</button>
              <button onClick={handlePasteParse} disabled={syncing} className="px-4 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50">
                {syncing ? "Extracting..." : "Extract Events"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColor(selectedEvent.type)}`}>{selectedEvent.type}</span>
              <button onClick={() => setSelectedEvent(null)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <h2 className="text-base font-semibold text-stone-800 mb-1">{selectedEvent.title}</h2>
            <p className="text-xs text-stone-400 mb-3">{selectedEvent.course}</p>
            {selectedEvent.date && <p className="text-sm text-stone-600 mb-3">📅 {formatDate(selectedEvent.date)}</p>}
            {selectedEvent.description && <p className="text-sm text-stone-600 whitespace-pre-wrap">{selectedEvent.description}</p>}
            {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-stone-500 mb-2">ATTACHMENTS</p>
                {selectedEvent.attachments.map((f: any, i: number) => {
                  const name = typeof f === "string" ? f : f.name;
                  const url = typeof f === "string" ? null : f.url;
                  return (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <FileText size={12} className="text-stone-400 flex-shrink-0" />
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">{name}</a>
                      ) : (
                        <span className="text-sm text-stone-600">{name}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-stone-800">Alex's Dashboard</h1>
          <nav className="flex gap-1">
            {(["dashboard", "calendar", "review"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-stone-100 text-stone-800" : "text-stone-400 hover:text-stone-600"}`}>
                {tab === "dashboard" ? "Dashboard" : tab === "calendar" ? "Calendar" : `Review${pendingReview.length > 0 ? ` (${pendingReview.length})` : ""}`}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchCalendar} disabled={loading} className="flex items-center gap-2 text-stone-400 hover:text-stone-600 text-sm transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />Sync
          </button>
          <label className="flex items-center gap-2 text-stone-400 hover:text-stone-600 text-sm transition-colors cursor-pointer">
            <FileText size={14} />Import .ics
            <input type="file" accept=".ics" className="hidden" onChange={handleICSUpload} />
          </label>
          <button onClick={() => setShowFolderLoad(true)} className="flex items-center gap-2 text-stone-400 hover:text-stone-600 text-sm transition-colors">
            <FolderOpen size={14} />Load Folder
          </button>
          <button onClick={() => setShowPaste(true)} className="flex items-center gap-2 text-stone-400 hover:text-stone-600 text-sm transition-colors">
            <ClipboardList size={14} />Paste Course
          </button>
          <button onClick={() => signOut()} className="flex items-center gap-2 text-stone-400 hover:text-stone-600 text-sm transition-colors">
            <LogOut size={14} />Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-3">
              <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">Upcoming</h2>
              {upcomingItems.length === 0 && (
                <div className="bg-white rounded-xl border border-stone-200 p-6 text-center text-stone-400 text-sm">
                  No upcoming events. Approve items from the Review tab to add them here.
                </div>
              )}
              {upcomingItems.map((event) => (
                <div key={event.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
                  <button onClick={() => toggleComplete(event.id)}
                    className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-stone-500 flex-shrink-0 transition-colors" />
                  <div className={`w-2 self-stretch rounded-full flex-shrink-0 ${typeBar(event.type)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-stone-400">{formatDate(event.date)}</p>
                      {event.course && <p className="text-xs text-stone-300">· {event.course}</p>}
                    </div>
                  </div>
                  {event.type !== "calendar" && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${typeColor(event.type)}`}>{event.type}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">To-do</h2>
                <p className="text-xs text-stone-400 mt-0.5">Assignments 10d · Quizzes 14d · Exams 20d</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
                {todoItems.length === 0 && (
                  <p className="text-stone-400 text-sm text-center py-6">Nothing due soon.</p>
                )}
                {todoItems.map((event) => {
                  const days = differenceInDays(parseISO(event.date), new Date());
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3">
                      <button onClick={() => toggleComplete(event.id)}
                        className="w-4 h-4 rounded border-2 border-stone-300 hover:border-stone-500 flex-shrink-0 mt-0.5 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 leading-snug">{event.title}</p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          {days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">Calendar</h2>
              <div className="flex items-center gap-4">
                <div className="flex gap-3 text-xs text-stone-400">
                  {[["bg-red-400","Exam"],["bg-orange-400","Quiz"],["bg-blue-400","Assignment"],["bg-purple-400","Presentation"],["bg-stone-300","Class"]].map(([color, label]) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${color} inline-block`}/>{label}
                    </span>
                  ))}
                </div>
                <button
                  disabled={syncing}
                  onClick={async () => {
                    if (syncing) return;
                    setSyncing(true);
                    setSyncResult(null);
                    const toSync = moodleEvents.filter((e) => e.approved && e.date);
                    let added = 0;
                    let skipped = 0;
                    for (const event of toSync) {
                      const startDate = new Date(event.date).toISOString();
                      try {
                        const res = await fetch("/api/calendar", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: `📚 ${event.title}`,
                            description: [
                              `Course: ${event.course}`,
                              event.description || "",
                              event.attachments?.length
                                ? "📎 Files:\n" + event.attachments.map((a: any) => `${typeof a === "string" ? a : a.name}: ${typeof a === "string" ? "" : a.url}`).join("\n")
                                : "",
                            ].filter(Boolean).join("\n\n"),
                            startDate,
                            endDate: startDate,
                          }),
                        });
                        const data = await res.json();
                        if (data.skipped) skipped++;
                        else added++;
                      } catch {}
                    }
                    await fetchCalendar();
                    setSyncing(false);
                    setSyncResult(`✅ Added ${added} events · ${skipped} already existed`);
                    setTimeout(() => setSyncResult(null), 5000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? <><RefreshCw size={12} className="animate-spin" />Syncing...</> : <><Check size={12} />Sync All to Google Calendar</>}
                </button>
                {syncResult && (
                  <span className="text-xs text-stone-500">{syncResult}</span>
                )}
              </div>
            </div>
            <Suspense fallback={<div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400 text-sm">Loading calendar...</div>}>
              <CalendarView
                events={moodleEvents}
                completed={completed}
                onEventClick={(id) => {
                  const ev = moodleEvents.find((e) => e.id === id);
                  if (ev) setSelectedEvent(ev);
                }}
              />
            </Suspense>
          </div>
        )}

        {/* REVIEW TAB */}
        {activeTab === "review" && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">Review new items</h2>
              <div className="flex gap-3">
                {pendingReview.length > 0 && (
                  <button onClick={approveAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors">
                    <Check size={12} />Accept All ({pendingReview.length})
                  </button>
                )}
                <button onClick={() => setShowPaste(true)} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1">
                  <ClipboardList size={12} />Paste course
                </button>
              </div>
            </div>

            {pendingReview.length === 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
                <CheckCircle size={24} className="text-stone-300 mx-auto mb-3" />
                <p className="text-stone-400 text-sm">All caught up! Import a .ics or paste a course page to add items.</p>
              </div>
            )}

            {pendingReview.map((event) => (
              <div key={event.id} className="bg-white rounded-xl border border-stone-200 p-5 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen size={14} className="text-stone-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-stone-800">{event.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColor(event.type)}`}>{event.type}</span>
                  </div>
                  <p className="text-xs text-stone-400">{event.course}</p>
                  {event.date && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock size={11} className="text-stone-300" />
                      <span className="text-xs text-stone-400">{formatDate(event.date)}</span>
                    </div>
                  )}
                  {event.description && event.description !== event.title && (
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">{event.description}</p>
                  )}
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                      Open in Moodle →
                    </a>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => dismissEvent(event.id)} className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors" title="Dismiss">
                    <X size={14} />
                  </button>
                  <button onClick={() => approveEvent(event)} className="w-8 h-8 rounded-lg bg-stone-800 flex items-center justify-center text-white hover:bg-stone-700 transition-colors" title="Add to calendar">
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

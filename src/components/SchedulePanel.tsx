import React, { useState, useEffect } from "react";
import { Task, CalendarEvent } from "../types";
import { Calendar as CalendarIcon, Clock, AlertTriangle, RefreshCw, ChevronRight, Check, Play, ShieldAlert, Sparkles } from "lucide-react";
import { getAccessToken } from "../lib/firebase";
import { checkIsOverdue, getLocalDateString } from "../utils/date";

interface SchedulePanelProps {
  tasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  googleToken: string | null;
}

export default function SchedulePanel({ tasks, onUpdateTask, googleToken }: SchedulePanelProps) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [daemonActive, setDaemonActive] = useState(true);
  const [rescheduleLogs, setRescheduleLogs] = useState<string[]>([]);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Custom confirmation modal states
  const [showConfirmReschedule, setShowConfirmReschedule] = useState(false);
  const [overdueTasksToReschedule, setOverdueTasksToReschedule] = useState<Task[]>([]);

  // Fetch Google Calendar events if we have a token
  const fetchCalendarEvents = async () => {
    if (!googleToken) {
      // Use premium mock events if not signed in via Google to allow the user to test conflict detection
      setCalendarEvents([
        {
          id: "mock-1",
          summary: "Q3 Strategy Board Meeting",
          description: "Crucial team meeting",
          start: { dateTime: new Date(new Date().setHours(10, 0, 0)).toISOString() },
          end: { dateTime: new Date(new Date().setHours(11, 30, 0)).toISOString() }
        },
        {
          id: "mock-2",
          summary: "Autonomous Task Assist Demo",
          description: "System launch testing",
          start: { dateTime: new Date(new Date().setHours(14, 0, 0)).toISOString() },
          end: { dateTime: new Date(new Date().setHours(15, 0, 0)).toISOString() }
        }
      ]);
      return;
    }

    setLoadingCalendar(true);
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=10`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${googleToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const events = (data.items || []).map((item: any) => ({
          id: item.id,
          summary: item.summary || "Untitled Event",
          description: item.description || "",
          start: item.start || {},
          end: item.end || {}
        }));
        setCalendarEvents(events);
      } else {
        console.warn("Failed to fetch Google Calendar. Falling back to simulations.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, [googleToken]);

  // Compute Conflicts
  // An event conflict exists if a task is scheduled on the same day as a calendar event
  const conflicts = tasks
    .filter(t => t.status === "pending")
    .map(task => {
      const taskDateStr = task.dueDate; // YYYY-MM-DD
      const conflictingEvent = calendarEvents.find(event => {
        const eventStart = event.start.dateTime || event.start.date;
        if (!eventStart) return false;
        const eventDateStr = eventStart.split("T")[0];
        return eventDateStr === taskDateStr;
      });

      if (conflictingEvent) {
        return {
          task,
          event: conflictingEvent,
          reason: `Task conflicts with high-focus window: "${conflictingEvent.summary}"`
        };
      }
      return null;
    })
    .filter(Boolean) as { task: Task; event: CalendarEvent; reason: string }[];

  // Auto reschedule routine: shifts unfinished overdue tasks to today/tomorrow
  const handleAutoReschedule = async () => {
    setIsRescheduling(true);
    
    // Find overdue tasks
    const overdue = tasks.filter(t => {
      const isPending = t.status === "pending";
      const isOverdue = checkIsOverdue(t.dueDate, t.dueTime);
      return isPending && isOverdue;
    });

    if (overdue.length === 0) {
      setRescheduleLogs(prev => [
        `[${new Date().toLocaleTimeString()}] No overdue tasks detected. Schedule is optimized.`,
        ...prev
      ]);
      setIsRescheduling(false);
      return;
    }

    setOverdueTasksToReschedule(overdue);
    setShowConfirmReschedule(true);
  };

  const confirmAndExecuteReschedule = async () => {
    setShowConfirmReschedule(false);
    const todayStr = getLocalDateString();
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    try {
      for (const task of overdueTasksToReschedule) {
        // Shift task date to today or tomorrow
        const newDate = task.priority === "high" ? todayStr : tomorrowStr;
        await onUpdateTask(task.id, { dueDate: newDate });
        setRescheduleLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Autonomous rescheduled: "${task.title}" shifted from ${task.dueDate} to ${newDate} (${task.priority.toUpperCase()} Priority adjustment)`,
          ...prev
        ]);
      }
    } catch (err) {
      console.error(err);
      setRescheduleLogs(prev => [`[${new Date().toLocaleTimeString()}] Rescheduling error occurred. Check container logs.`, ...prev]);
    } finally {
      setIsRescheduling(false);
      setOverdueTasksToReschedule([]);
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.dateTime;
    if (!start) return "All Day";
    const dateObj = new Date(start);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 font-sans text-zinc-800" id="schedule_panel">
      {/* Overview Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-5" id="schedule_header">
        <div>
          <h2 className="text-xl font-light tracking-tight text-zinc-900 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-zinc-500 shrink-0" />
            Schedule
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {googleToken ? "Google Calendar connected" : "Using sandbox calendar"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchCalendarEvents}
            disabled={loadingCalendar}
            className="flex items-center gap-2 bg-white/45 hover:bg-white/60 text-zinc-800 border border-white/50 rounded-xl px-4 py-2 text-xs font-mono transition-all cursor-pointer shadow-md backdrop-blur-sm"
            id="sync_calendar_btn"
          >
            <RefreshCw className={`h-3 w-3 ${loadingCalendar ? "animate-spin text-zinc-700" : ""}`} />
            Sync Calendar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="schedule_grid">
        {/* Calendar / Agenda Column */}
        <div className="glass-card rounded-2xl p-6 md:col-span-2 space-y-4 shadow-md" id="agenda_column">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-white/20 pb-3">
            <Clock className="h-4 w-4 text-zinc-400" /> Today's Schedule
          </h3>

          <div className="space-y-3" id="agenda_list">
            {calendarEvents.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs font-mono">
                No events today.
              </div>
            ) : (
              calendarEvents.map(event => (
                <div key={event.id} className="p-4 bg-white/40 rounded-2xl border border-white/45 flex items-start gap-4 hover:bg-white/60 hover:border-white/60 shadow-sm transition-all backdrop-blur-sm">
                  <div className="bg-white/50 border border-white/65 text-zinc-800 font-mono text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0 mt-0.5 shadow-sm">
                    {formatEventTime(event)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 tracking-tight">{event.summary}</h4>
                    {event.description && <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{event.description}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Autonomous Daemon / Conflicts Panel */}
        <div className="space-y-6 md:col-span-1" id="conflict_daemon_column">
          {/* Conflict Alert Box */}
          <div className="glass-card rounded-2xl p-5 space-y-4 shadow-md" id="conflicts_box">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2 border-b border-white/20 pb-3">
              <ShieldAlert className="h-4 w-4 text-amber-500 opacity-80" /> Conflicts
            </h3>

            <div className="space-y-2.5" id="conflicts_list">
              {conflicts.length === 0 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl flex items-start gap-2.5 shadow-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    No scheduling conflicts found.
                  </p>
                </div>
              ) : (
                conflicts.map((c, idx) => (
                  <div key={idx} className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl flex flex-col gap-1 shadow-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-bold text-rose-700">Conflict</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed mt-1">{c.reason}</p>
                    <button 
                      onClick={() => onUpdateTask(c.task.id, { dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0] })}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 font-mono mt-2.5 self-start flex items-center gap-1 cursor-pointer"
                    >
                      Move to tomorrow <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Autonomous Rescheduling Daemon */}
          <div className="glass-card rounded-2xl p-5 space-y-4 shadow-md" id="daemon_box">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" /> Auto-Reschedule
              </h3>
              <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-full">
                Idle
              </span>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Move late tasks to tomorrow.
            </p>

            <button 
              onClick={handleAutoReschedule}
              disabled={isRescheduling}
              className="w-full glass-btn-primary text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-md"
              id="trigger_reschedule_daemon_btn"
            >
              <Play className="h-3 w-3 text-white shrink-0 fill-current" />
              Run auto-reschedule
            </button>

            {/* Daemon Logs terminal style */}
            <div className="bg-zinc-900/90 rounded-xl p-3 border border-white/10 font-mono text-[10px] text-emerald-400 space-y-1 h-28 overflow-y-auto shadow-inner" id="daemon_terminal_logs">
              <span className="text-zinc-500 block">[System] Ready...</span>
              {rescheduleLogs.map((log, idx) => (
                <span key={idx} className="block leading-relaxed">{log}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Confirmation custom Modal */}
      {showConfirmReschedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4" id="reschedule_confirm_modal">
          <div className="w-full max-w-sm bg-white/70 border border-white/50 backdrop-blur-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 font-mono">Auto-Reschedule</h3>
            <p className="text-xs text-zinc-650 leading-relaxed">
              Found <span className="text-emerald-700 font-semibold">{overdueTasksToReschedule.length} late tasks</span>. Do you want to move them to tomorrow?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setShowConfirmReschedule(false);
                  setIsRescheduling(false);
                  setOverdueTasksToReschedule([]);
                }}
                className="px-3.5 py-2 bg-white/40 border border-white/40 hover:bg-white/50 text-zinc-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndExecuteReschedule}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md"
              >
                Move tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

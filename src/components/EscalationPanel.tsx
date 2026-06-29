import React, { useState, useEffect } from "react";
import { Task, CallLog } from "../types";
import { Phone, AlertTriangle, ShieldAlert, Check, ShieldCheck, Play, Volume2, VolumeX, ListRestart, HelpCircle, Mail, ExternalLink } from "lucide-react";
import { collection, query, where, onSnapshot, db } from "../lib/firebase";

interface EscalationPanelProps {
  tasks: Task[];
  userId: string;
  userPhone: string;
  onUpdateUserPhone: (phone: string) => Promise<void>;
  defaultNotificationTime?: string;
  onUpdateNotificationTime?: (time: string) => Promise<void>;
  
  // Lifted calling simulation props
  activeSimulation: Task | null;
  simTier: number;
  simState: "idle" | "ringing" | "connected" | "ended";
  simScript: string;
  simUrgency: string;
  isSynthesizing: boolean;
  startSimulation: (task: Task, tier: number) => Promise<void>;
  answerCall: () => void;
  endCall: (completed?: boolean) => Promise<void>;
}

export default function EscalationPanel({ 
  tasks, 
  userId, 
  userPhone, 
  onUpdateUserPhone,
  defaultNotificationTime,
  onUpdateNotificationTime,
  activeSimulation,
  simTier,
  simState,
  simScript,
  simUrgency,
  isSynthesizing,
  startSimulation,
  answerCall,
  endCall
}: EscalationPanelProps) {
  const [phoneNumber, setPhoneNumber] = useState(userPhone);
  const [prefTime, setPrefTime] = useState(defaultNotificationTime || "09:00");
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  useEffect(() => {
    if (defaultNotificationTime) {
      setPrefTime(defaultNotificationTime);
    }
  }, [defaultNotificationTime]);

  // Real-time call logs sync using onSnapshot
  useEffect(() => {
    setPhoneNumber(userPhone);
    setFetchingLogs(true);

    const q = query(
      collection(db, "callLogs"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items: CallLog[] = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as CallLog);
      });
      // Sort client-side to avoid needing complex Firestore indexes
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(items);
      setFetchingLogs(false);
    }, (err) => {
      console.error("Failed to load call logs:", err);
      setFetchingLogs(false);
    });

    return () => unsubscribe();
  }, [userPhone, userId]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setLoadingPhone(true);
    setPhoneMessage(null);
    try {
      await onUpdateUserPhone(phoneNumber);
      setPhoneMessage({
        type: "success",
        text: "Phone saved."
      });
      setTimeout(() => setPhoneMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setPhoneMessage({
        type: "error",
        text: err.message || "Save failed."
      });
    } finally {
      setLoadingPhone(false);
    }
  };

  // Filter tasks with high priority or escalation settings
  const highPriorityTasks = tasks.filter(t => t.priority === "high" || t.escalationEnabled);

  return (
    <div className="space-y-6 font-sans text-zinc-800" id="escalation_panel">
      {/* Alarm Settings / Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="escalation_layout">
        <div className="space-y-6 md:col-span-1">
          {/* Active Alarm Status Display */}
          <div className="glass-card rounded-2xl p-5 space-y-4 shadow-md bg-emerald-50/25 border-emerald-250/20" id="engine_status_box">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-950 border-b border-white/20 pb-2 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Alarm Engine Status
            </h3>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800">ENGINE ACTIVE (Task Assist)</span>
            </div>
            <p className="text-xs text-zinc-650 leading-relaxed">
              Task Assist is running fully client-side and offline. The background Alarm service scans your Dexie.js database every 60 seconds.
            </p>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/25">
              <span className="text-[10px] font-bold text-emerald-900 block uppercase tracking-wider">Tab-Closed Resilience</span>
              <span className="text-[10px] text-zinc-600">The registered Service Worker monitors task schedules and triggers notifications even when this application is closed.</span>
            </div>
          </div>

          {/* Explanation box */}
          <div className="glass-card rounded-2xl p-5 space-y-3 shadow-md backdrop-blur-sm" id="hierarchy_info">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="h-4 w-4 text-emerald-600" /> Alert Hierarchy
            </h4>
            <div className="space-y-2 text-[11px] leading-relaxed text-zinc-600">
              <div className="p-2 bg-white/30 rounded border border-white/35 backdrop-blur-sm">
                <span className="font-bold text-zinc-800 block">1. Gentle Alert (45 mins left)</span>
                A quick reminder before the task.
              </div>
              <div className="p-2 bg-white/30 rounded border border-white/35 backdrop-blur-sm">
                <span className="font-bold text-zinc-800 block">2. Urgent Alert (15 mins left)</span>
                An urgent warning.
              </div>
              <div className="p-2 bg-white/30 rounded border border-white/35 backdrop-blur-sm">
                <span className="font-bold text-zinc-800 block">3. Final Alert (On Time)</span>
                A call when the task is due.
              </div>
            </div>
          </div>
        </div>

        {/* Core Escalation Scheduler list */}
        <div className="glass-card rounded-2xl p-5 md:col-span-2 space-y-4 shadow-md" id="simulators_list_box">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 border-b border-white/20 pb-2">
            Test Voice Alerts
          </h3>

          <div className="space-y-3">
            {highPriorityTasks.length === 0 ? (
              <div className="py-12 border border-dashed border-white/40 bg-white/20 rounded-xl text-center text-zinc-500 text-xs shadow-inner">
                No urgent tasks. Add tasks and check "Enable phone alerts" to test.
              </div>
            ) : (
              highPriorityTasks.map(task => (
                <div key={task.id} className="p-4 bg-white/40 rounded-xl border border-white/45 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:bg-white/50 transition-all backdrop-blur-sm">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      {task.title}
                      <span className="bg-rose-500/10 text-rose-700 border border-rose-500/20 px-2 py-0.5 rounded text-[8px] font-mono font-bold shadow-sm">HIGH</span>
                    </h4>
                    {task.description && <p className="text-[11px] text-zinc-500 truncate max-w-md">{task.description}</p>}
                    <span className="text-[9px] text-emerald-600 font-mono font-bold block">Dispatch System: Task Assist</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => startSimulation(task, 1)}
                      className="bg-white/40 hover:bg-white/60 text-zinc-750 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-white/50 cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Play className="h-2.5 w-2.5 text-emerald-600 fill-current" /> T-45m
                    </button>
                    <button 
                      onClick={() => startSimulation(task, 2)}
                      className="bg-white/40 hover:bg-white/60 text-zinc-750 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-white/50 cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Play className="h-2.5 w-2.5 text-emerald-600 fill-current" /> T-15m
                    </button>
                    <button 
                      onClick={() => startSimulation(task, 3)}
                      className="bg-white/40 hover:bg-white/60 text-zinc-750 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-white/50 cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Play className="h-2.5 w-2.5 text-emerald-600 fill-current" /> At Time
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Security Database */}
      <div className="glass-card rounded-2xl p-5 shadow-md" id="audit_logs_box">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/20 pb-2 mb-4 gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
            <ListRestart className="h-4 w-4 text-emerald-600" /> System Dispatch Logs (Call Alerts)
          </h3>
        </div>

        <div className="overflow-x-auto" id="audit_log_table_container">
          {fetchingLogs ? (
            <div className="py-8 text-center text-zinc-500 text-xs font-mono">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs font-mono">No calls yet.</div>
          ) : (
            <table className="w-full text-left text-xs text-zinc-500" id="audit_log_table">
              <thead>
                <tr className="border-b border-white/20 text-zinc-400 text-[10px] uppercase font-mono tracking-wider">
                  <th className="py-2">Time</th>
                  <th className="py-2">Task</th>
                  <th className="py-2">Tier</th>
                  <th className="py-2">To</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 font-mono text-[11px]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/20 transition-colors">
                    <td className="py-2 text-zinc-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 font-semibold text-zinc-800">{log.taskTitle}</td>
                    <td className="py-2">T-{log.tier === 1 ? "60" : log.tier === 2 ? "15" : "0"}</td>
                    <td className="py-2">Task Assist</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === "completed" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 text-zinc-700">{log.urgency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

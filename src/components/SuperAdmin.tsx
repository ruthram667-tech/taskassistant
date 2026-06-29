import React, { useState, useEffect } from "react";
import {
  Shield, Lock, Users, Clock, LogIn, Eye, EyeOff,
  TrendingUp, Calendar, Activity, BarChart3, User,
  AlertTriangle, CheckCircle, Globe, Monitor
} from "lucide-react";

// ── Secret Admin Password ─────────────────────────────────────────────────────
// Only you know this. Change it to whatever you want.
const ADMIN_PASSWORD = "ruthram@admin667";

interface SessionRecord {
  id: string;
  email: string;
  displayName: string;
  loginTime: string;       // ISO string
  logoutTime?: string;     // ISO string, set on session end
  durationMs?: number;     // ms
  date: string;            // YYYY-MM-DD
  device: string;
}

function getStoredSessions(): SessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem("taskassist_admin_sessions") || "[]");
  } catch {
    return [];
  }
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "Active now";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  }
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

interface SuperAdminProps {
  onSignOut?: () => void;       // called when admin clicks Sign Out
  isDirectLogin?: boolean;      // true = came via login page (skip password gate)
}

export default function SuperAdmin({ onSignOut, isDirectLogin = false }: SuperAdminProps) {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(isDirectLogin); // bypass if direct login
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("all");

  // Load sessions on mount
  useEffect(() => {
    if (authenticated) {
      setSessions(getStoredSessions().reverse()); // newest first
    }
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Access denied. Invalid credentials.");
      setPassword("");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 font-sans">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-700/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-700/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative w-full max-w-sm">
          {/* Card */}
          <div className="bg-white/4 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl">
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent rounded-t-3xl" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                <Shield className="w-7 h-7 text-violet-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">SuperAdmin Access</h1>
              <p className="text-xs text-zinc-500 mt-1 font-mono">Restricted Area — Authorised Personnel Only</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl text-sm tracking-wide transition-all shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Authenticate
              </button>
            </form>

            <p className="text-center text-[10px] text-zinc-600 font-mono mt-6 uppercase tracking-widest">
              Task Assist • Admin Console v1.0
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Analytics computations ──────────────────────────────────────────────────
  const uniqueDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
  const filtered = selectedDate === "all" ? sessions : sessions.filter(s => s.date === selectedDate);

  const totalLogins = filtered.length;
  const uniqueUsers = new Set(filtered.map(s => s.email)).size;
  const completedSessions = filtered.filter(s => s.durationMs);
  const avgDuration = completedSessions.length > 0
    ? completedSessions.reduce((acc, s) => acc + (s.durationMs || 0), 0) / completedSessions.length
    : 0;
  const totalTime = completedSessions.reduce((acc, s) => acc + (s.durationMs || 0), 0);

  const loginsByDay = uniqueDates.slice(0, 7).map(date => ({
    date,
    count: sessions.filter(s => s.date === date).length,
  }));
  const maxLoginDay = Math.max(...loginsByDay.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans p-4 sm:p-6 lg:p-8">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-700/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-700/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-violet-400">SuperAdmin Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">User Analytics</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Live session monitoring and login intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-violet-500/40 cursor-pointer"
            >
              <option value="all">All Time</option>
              {uniqueDates.map(d => (
                <option key={d} value={d}>{formatDate(d + "T00:00:00")}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setAuthenticated(false);
                setPassword("");
                if (onSignOut) onSignOut();
              }}
              className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-zinc-400 hover:text-white transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Logins", value: totalLogins, icon: LogIn, color: "from-violet-500 to-indigo-500", glow: "rgba(139,92,246,0.2)" },
            { label: "Unique Users", value: uniqueUsers, icon: Users, color: "from-emerald-500 to-teal-500", glow: "rgba(16,185,129,0.2)" },
            { label: "Avg Session", value: formatDuration(avgDuration), icon: Clock, color: "from-amber-500 to-orange-500", glow: "rgba(245,158,11,0.2)" },
            { label: "Total Time Spent", value: formatDuration(totalTime), icon: Activity, color: "from-sky-500 to-blue-500", glow: "rgba(14,165,233,0.2)" },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white/4 border border-white/8 rounded-2xl p-4 backdrop-blur-xl relative overflow-hidden"
              style={{ boxShadow: `0 0 30px ${card.glow}` }}
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${card.color} opacity-10 rounded-full blur-2xl -z-10`} />
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-lg`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-xl font-black tracking-tight">{card.value}</div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Login Trend Chart (simple bar chart) */}
        <div className="bg-white/4 border border-white/8 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-bold text-white">Logins Per Day (Last 7 Days)</h2>
          </div>
          <div className="flex items-end gap-2 h-24">
            {loginsByDay.length === 0 ? (
              <p className="text-zinc-600 text-xs font-mono">No data yet</p>
            ) : (
              loginsByDay.slice(0, 7).reverse().map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-violet-400">{day.count}</span>
                  <div
                    className="w-full bg-gradient-to-t from-violet-600 to-indigo-500 rounded-t-lg transition-all"
                    style={{ height: `${(day.count / maxLoginDay) * 80}px`, minHeight: day.count > 0 ? 6 : 2 }}
                  />
                  <span className="text-[8px] text-zinc-600 font-mono">{new Date(day.date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Session Table */}
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between p-5 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Session Logs</h2>
              <span className="text-[9px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">{filtered.length} records</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-white/5">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Login Time</th>
                  <th className="px-5 py-3">Session Duration</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-zinc-600 font-mono text-xs">
                      No session records found yet. Sessions are recorded when users log in.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {(s.displayName || s.email).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-zinc-200 text-[11px]">{s.displayName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 font-mono text-[10px]">{s.email}</td>
                      <td className="px-5 py-3.5 text-zinc-400 font-mono text-[10px]">{formatDate(s.loginTime)}</td>
                      <td className="px-5 py-3.5 text-zinc-300 font-mono text-[10px]">{formatTime(s.loginTime)}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[10px] text-violet-300 font-bold">
                          {formatDuration(s.durationMs)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.durationMs ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-2.5 h-2.5" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            <Activity className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 font-mono text-[10px]">{s.device}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

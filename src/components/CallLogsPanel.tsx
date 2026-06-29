import React, { useEffect, useState } from "react";
import { localDb, DBCallLog } from "../db";
import { Phone, CheckCircle, Clock, XCircle, Search, Filter } from "lucide-react";

export default function CallLogsPanel() {
  const [logs, setLogs] = useState<DBCallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await localDb.call_logs.orderBy('timestamp').reverse().toArray();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'completed': return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' };
      case 'answered': return { icon: Phone, color: 'text-sky-600', bg: 'bg-sky-100', border: 'border-sky-200' };
      case 'snoozed': return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' };
      default: return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
    }
  };

  if (loading) return <div className="p-8 text-center text-sm font-mono text-zinc-500">Loading call history...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">System Call Logs</h2>
          <p className="text-xs text-zinc-500 mt-1">History of automated background escalations and actions taken.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLogs} className="bg-white border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-zinc-50">Refresh</button>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl border border-zinc-200/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/50 text-[10px] uppercase font-bold text-zinc-500 tracking-widest border-b border-zinc-200/50">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Task ID</th>
                <th className="px-6 py-4 text-center">Tier</th>
                <th className="px-6 py-4">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 font-mono text-xs">No call logs recorded yet.</td>
                </tr>
              ) : (
                logs.map(log => {
                  const conf = getStatusConfig(log.status);
                  const Icon = conf.icon;
                  return (
                    <tr key={log.id} className="hover:bg-white/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-600 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-800 font-medium truncate max-w-[200px]">
                        {log.task_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${log.tier === 3 ? 'bg-red-100 text-red-600' : log.tier === 2 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {log.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${conf.bg} ${conf.color} border ${conf.border}`}>
                          <Icon className="w-3 h-3" />
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

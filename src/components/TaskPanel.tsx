import React, { useState } from "react";
import { Task } from "../types";
import { Plus, Trash2, CheckCircle2, Circle, Clock, AlertTriangle, Sparkles, Filter, Shield, Compass, RefreshCw, Hourglass, BookOpen, ExternalLink } from "lucide-react";
import { checkIsOverdue, getLocalDateString } from "../utils/date";

interface TaskPanelProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id" | "userId" | "createdAt">) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export default function TaskPanel({ tasks, onAddTask, onUpdateTask, onDeleteTask }: TaskPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState(getLocalDateString());
  const [dueTime, setDueTime] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState<number>(30);
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationPhone, setEscalationPhone] = useState("");

  const [filterPriority, setFilterPriority] = useState<"all" | "low" | "medium" | "high">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("all");

  const [loading, setLoading] = useState(false);

  // Custom Inline Modals States
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<"low" | "medium" | "high">("medium");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueTime, setEditDueTime] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [editEstimatedDuration, setEditEstimatedDuration] = useState<number>(30);
  const [editEscalationEnabled, setEditEscalationEnabled] = useState(false);

  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const handleStartEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate);
    setEditDueTime(task.dueTime || "");
    setEditScheduledTime(task.scheduledTime || "");
    setEditEstimatedDuration(task.estimatedDuration || 30);
    setEditEscalationEnabled(task.escalationEnabled || false);
  };

  const [focusQueue, setFocusQueue] = useState<{
    explanation: string;
    queue: Array<{
      taskId: string;
      title: string;
      recommendedStartTime: string;
      duration: number;
      reason: string;
    }>;
    productivityTip: string;
  } | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [expandedReferenceTaskId, setExpandedReferenceTaskId] = useState<string | null>(null);
  const [loadingReferenceTaskId, setLoadingReferenceTaskId] = useState<string | null>(null);

  const handleFetchReference = async (task: Task, forceRefresh = false) => {
    // If clicking same and already open and not forcing refresh, close it
    if (expandedReferenceTaskId === task.id && !forceRefresh) {
      setExpandedReferenceTaskId(null);
      return;
    }

    // If already has reference and not forcing refresh, just expand
    if (task.reference && !forceRefresh) {
      setExpandedReferenceTaskId(task.id);
      return;
    }

    setLoadingReferenceTaskId(task.id);
    try {
      const response = await fetch("/api/gemini/task-reference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: task.title,
          description: task.description || ""
        })
      });
      if (!response.ok) {
        throw new Error("Reference API responded with error status");
      }
      const data = await response.json();
      await onUpdateTask(task.id, { reference: data });
      setExpandedReferenceTaskId(task.id);
    } catch (err: any) {
      console.error("Failed to fetch task study reference suggestions:", err);
    } finally {
      setLoadingReferenceTaskId(null);
    }
  };

  const handleGenerateFocusQueue = async () => {
    setQueueError(null);
    const pendingTasks = tasks.filter(t => t.status !== "completed");
    if (pendingTasks.length === 0) {
      setQueueError("No pending tasks available to structure into a Focus Queue.");
      return;
    }

    setLoadingQueue(true);
    try {
      const res = await fetch("/api/gemini/focus-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: pendingTasks })
      });
      if (res.ok) {
        const data = await res.json();
        setFocusQueue(data);
      } else {
        throw new Error("Failed to load Focus Queue");
      }
    } catch (err: any) {
      console.error(err);
      setQueueError("Failed to analyze tasks: " + err.message);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);
    try {
      await onAddTask({
        title,
        description,
        dueDate,
        dueTime: dueTime || "",
        scheduledTime: scheduledTime || (dueTime ? `${dueDate}T${dueTime}` : ""),
        estimatedDuration: estimatedDuration || 30,
        status: "pending",
        priority,
        escalationEnabled,
        escalationPhone: escalationEnabled ? escalationPhone : ""
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate(getLocalDateString());
      setDueTime("");
      setScheduledTime("");
      setEstimatedDuration(30);
      setEscalationEnabled(false);
      setEscalationPhone("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error creating task", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchStatus = filterStatus === "all" || task.status === filterStatus;
    return matchPriority && matchStatus;
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "border-red-200 bg-red-50 text-red-650";
      case "medium": return "border-amber-200 bg-amber-50 text-amber-700";
      default: return "border-zinc-200 bg-zinc-50 text-zinc-600";
    }
  };

  return (
    <div className="space-y-6 font-sans text-zinc-850" id="task_panel_container">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between border-b border-white/20 pb-4" id="task_panel_header">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Tasks</h2>
          <p className="text-xs text-zinc-500 mt-1">Manage your tasks and phone alerts</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-white/45 border border-white/50 hover:bg-white/60 text-zinc-800 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md backdrop-blur-sm"
          id="toggle_add_task_btn"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? "Cancel" : "Add Task"}
        </button>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4 animate-fade-in shadow-md" id="add_task_form">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-white/20 pb-2">New Task</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Title</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Send report to manager"
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:bg-white/70 transition-all placeholder:text-zinc-400 shadow-sm"
                  id="task_title_input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what needs to be done..."
                  className="w-full h-24 glass-input rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:bg-white/70 transition-all resize-none placeholder:text-zinc-400 shadow-sm"
                  id="task_description_input"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-white/40 border border-white/45 rounded-xl px-3 py-3 text-sm text-zinc-900 focus:outline-none focus:bg-white/75 transition-all font-mono shadow-sm cursor-pointer"
                    id="task_priority_input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (alerts available)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-3 text-sm text-zinc-900 focus:outline-none focus:bg-white/70 transition-all font-mono shadow-sm"
                    id="task_duedate_input"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Due Time</label>
                  <input 
                    type="time" 
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-3 text-sm text-zinc-900 focus:outline-none focus:bg-white/70 transition-all font-mono shadow-sm"
                    id="task_duetime_input"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Duration (mins)</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 30)}
                    className="w-full glass-input rounded-xl px-3 py-3 text-sm text-zinc-900 focus:outline-none focus:bg-white/70 transition-all font-mono shadow-sm"
                    id="task_duration_input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Scheduled Alarm Time (Task Assist Service Worker)</label>
                <input 
                  type="datetime-local" 
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:bg-white/70 transition-all font-mono shadow-sm"
                  id="task_scheduledtime_input"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Our software-based alarm will check Dexie.js and trigger a persistent sound even if closed.</p>
              </div>

              {/* Calling Escalation Integration Trigger */}
              <div className="bg-white/35 p-4 rounded-xl border border-white/40 space-y-3 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-600 opacity-80" />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">Phone alerts</span>
                      <span className="text-[10px] text-zinc-500">Call me if task is overdue</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={escalationEnabled}
                      onChange={(e) => setEscalationEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/50 border border-white/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:height-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {escalationEnabled && (
                  <div className="animate-slide-down space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Phone number</label>
                    <input 
                      type="tel" 
                      required
                      value={escalationPhone}
                      onChange={(e) => setEscalationPhone(e.target.value)}
                      placeholder="e.g., +1234567890"
                      className="w-full glass-input rounded-lg px-3 py-2 text-xs text-zinc-900 font-mono placeholder-zinc-400 focus:outline-none focus:bg-white/70 shadow-sm"
                      id="task_escalation_phone_input"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/20 pt-4">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="bg-white/30 border border-white/45 hover:bg-white/50 text-zinc-650 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm backdrop-blur-sm"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="glass-btn-primary font-bold px-5 py-2.5 rounded-xl text-xs shadow-md cursor-pointer disabled:opacity-50 text-white"
              id="save_task_btn"
            >
              {loading ? "Saving..." : "Add task"}
            </button>
          </div>
        </form>
      )}

      {/* Gemini Focus Queue Card */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden mb-6 shadow-md" id="gemini_focus_queue_section">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-full"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shadow-sm">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Focus Queue</h3>
              <p className="text-xs text-zinc-500">AI orders your tasks for maximum productivity</p>
            </div>
          </div>
          <button
            onClick={handleGenerateFocusQueue}
            disabled={loadingQueue || tasks.filter(t => t.status !== "completed").length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md"
          >
            {loadingQueue ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sorting...
              </>
            ) : (
              <>
                <Compass className="h-4 w-4" />
                Sort tasks
              </>
            )}
          </button>
        </div>

        {queueError && (
          <div 
            className="p-3 mb-4 rounded-xl text-xs border bg-rose-50 border-rose-200 text-rose-700 animate-fade-in"
            id="focus_queue_error"
          >
            {queueError}
          </div>
        )}

        {focusQueue ? (
          <div className="space-y-4 animate-fade-in" id="focus_queue_results">
            {/* Explanation */}
            <p className="text-xs text-zinc-600 italic bg-white/30 border border-white/35 p-3 rounded-xl leading-relaxed shadow-inner">
              &ldquo;{focusQueue.explanation}&rdquo;
            </p>

            {/* List of ordered task blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="focus_queue_list">
              {focusQueue.queue.map((item, idx) => (
                <div key={idx} className="bg-white/40 border border-white/45 p-4 rounded-xl flex flex-col justify-between space-y-2 shadow-sm backdrop-blur-sm">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase tracking-widest">
                        {item.recommendedStartTime} ({item.duration}m)
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">Step {idx + 1}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-zinc-900 mt-1 line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-zinc-600 leading-relaxed mt-1">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Productivity Tip footer */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/20 flex-wrap">
              <span className="text-emerald-600 font-bold uppercase tracking-wider">Tip:</span>
              <span>{focusQueue.productivityTip}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center" id="focus_queue_placeholder">
            <Compass className="h-8 w-8 text-zinc-400 mb-2 stroke-1" />
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              Click &ldquo;Sort tasks&rdquo; to see the best order to do your tasks.
            </p>
          </div>
        )}
      </div>

      {/* Filter and Sorting Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/45 border border-white/50 p-4 rounded-2xl shadow-md backdrop-blur-sm" id="task_filters">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <span className="text-xs text-zinc-500">Filter tasks</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono">Priority:</span>
            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-white/40 border border-white/45 text-zinc-700 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none cursor-pointer hover:bg-white/60 transition-colors shadow-sm"
              id="filter_priority_select"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-zinc-400 font-mono">Status:</span>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-white/40 border border-white/45 text-zinc-700 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none cursor-pointer hover:bg-white/60 transition-colors shadow-sm"
              id="filter_status_select"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3" id="task_list_container">
        {filteredTasks.length === 0 ? (
          <div className="border border-dashed border-white/40 bg-white/20 rounded-2xl py-12 text-center shadow-inner" id="no_tasks_placeholder">
            <Sparkles className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm font-light text-zinc-500">No tasks found</p>
            <p className="text-xs text-zinc-400 mt-1">Add a new task above</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden shadow-md">
            {/* Table Column Headers (Hidden on Mobile, Visible on Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono border-b border-white/20 bg-white/20">
              <div className="col-span-2 flex items-center gap-1.5">
                <span>Status</span>
              </div>
              <div className="col-span-4 flex items-center">Task</div>
              <div className="col-span-2 flex items-center">Priority</div>
              <div className="col-span-2 flex items-center">Due Date</div>
              <div className="col-span-1 flex items-center">Alerts</div>
              <div className="col-span-1 flex items-center justify-end">Actions</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/10">
              {filteredTasks.map(task => {
                const isOverdue = task.status !== "completed" && checkIsOverdue(task.dueDate, task.dueTime);
                return (
                  <div 
                    key={task.id}
                    className={`p-4 md:p-5 flex flex-col md:grid md:grid-cols-12 md:items-center gap-4 transition-all hover:bg-white/40 ${isOverdue ? "bg-red-500/10" : task.status === "completed" ? "opacity-75 bg-white/10" : ""}`}
                    id={`task_row_${task.id}`}
                  >
                    {/* Column 1: Completed / Status (Toggle) */}
                    <div className="col-span-2 flex items-center">
                      <button 
                        onClick={() => onUpdateTask(task.id, { status: task.status === "completed" ? "pending" : "completed" })}
                        className="text-zinc-400 hover:text-zinc-700 flex items-center gap-2.5 transition-colors cursor-pointer group text-left"
                        id={`toggle_task_status_${task.id}`}
                      >
                        {task.status === "completed" ? (
                           <>
                             <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                             <span className="text-[11px] font-bold font-mono text-emerald-600 tracking-wider">DONE</span>
                           </>
                        ) : (
                           <>
                             <Circle className="h-5 w-5 opacity-40 shrink-0 group-hover:opacity-80 group-hover:text-emerald-600" />
                             <span className="text-[11px] font-bold font-mono text-zinc-400 tracking-wider group-hover:text-zinc-750">PENDING</span>
                           </>
                        )}
                      </button>
                    </div>

                    {/* Column 2: Task details */}
                    <div className="col-span-4 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-semibold tracking-tight ${task.status === "completed" ? "line-through text-zinc-450" : "text-zinc-900"}`}>
                          {task.title}
                        </h4>
                        {isOverdue && (
                          <span className="text-[9px] font-bold font-mono uppercase bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                            LATE
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl line-clamp-2">{task.description}</p>
                      )}
                      <div className="pt-1 flex items-center gap-2 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFetchReference(task);
                          }}
                          className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all cursor-pointer ${
                            task.reference
                              ? expandedReferenceTaskId === task.id
                                ? "bg-emerald-600 text-white font-semibold shadow-sm"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/50"
                              : loadingReferenceTaskId === task.id
                              ? "bg-zinc-100 text-zinc-450 animate-pulse border border-zinc-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100/50"
                          }`}
                          id={`task_reference_btn_${task.id}`}
                        >
                          {loadingReferenceTaskId === task.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin shrink-0" />
                          ) : (
                            <BookOpen className="h-3 w-3 shrink-0" />
                          )}
                          {task.reference ? "💡 Study topics" : "💡 Suggest topics"}
                        </button>
                      </div>
                    </div>

                    {/* Column 3: Priority */}
                    <div className="col-span-2 flex items-center">
                      <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>

                    {/* Column 4: Timeline */}
                    <div className="col-span-2 flex flex-col gap-0.5 text-[10px] font-mono text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-zinc-400 shrink-0" /> Due {task.dueDate}
                      </span>
                      {task.dueTime && (
                        <span className="text-zinc-400 text-[9px] pl-4">at {task.dueTime}</span>
                      )}
                      {task.scheduledTime && (
                        <span className="flex items-center gap-1 pl-4 text-emerald-600 text-[9px] font-bold">
                          <span className="animate-pulse">🔔</span> Alarm: {task.scheduledTime.replace("T", " ")}
                        </span>
                      )}
                      {task.estimatedDuration && (
                        <span className="flex items-center gap-1 pl-4 text-zinc-400 text-[9px]">
                          <Hourglass className="h-2.5 w-2.5 text-zinc-400 shrink-0" /> {task.estimatedDuration} mins
                        </span>
                      )}
                    </div>

                    {/* Column 5: Escalation */}
                    <div className="col-span-1 flex items-center">
                      {task.escalationEnabled ? (
                        <span className="text-[9px] font-bold font-mono uppercase bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1" title="Escalation active">
                          <Shield className="h-2.5 w-2.5 shrink-0" />
                          <span className="md:hidden">Escalation Active</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold font-mono uppercase text-zinc-300 px-2 py-0.5" title="No escalation active">
                          —
                        </span>
                      )}
                    </div>

                    {/* Column 6: Actions */}
                    <div className="col-span-1 flex items-center md:justify-end gap-1 border-t md:border-t-0 border-zinc-100 pt-3 md:pt-0">
                      <button 
                        onClick={() => handleStartEdit(task)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-850 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setDeletingTask(task)}
                        className="text-zinc-400 hover:text-red-650 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        id={`delete_task_btn_${task.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Expanded Reference panel */}
                    {(expandedReferenceTaskId === task.id || loadingReferenceTaskId === task.id) && (
                      <div className="col-span-12 mt-4 border-t border-white/20 pt-4 text-xs animate-fade-in w-full text-left">
                        {loadingReferenceTaskId === task.id ? (
                          <div className="p-5 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm flex flex-col items-center justify-center text-center space-y-3 py-8 shadow-inner">
                            <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
                            <div className="space-y-1">
                              <p className="font-semibold text-zinc-850">Analyzing task...</p>
                              <p className="text-[10px] text-zinc-500 font-mono">Finding topics and resources</p>
                            </div>
                          </div>
                        ) : task.reference ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span className="font-bold text-zinc-800 uppercase tracking-wider text-[11px] font-mono">Study guide</span>
                                <span className="text-[9px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-750 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0 shadow-sm">
                                  {task.reference.aiGenerated ? "AI" : "Classifier"}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFetchReference(task, true);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-850 bg-white/30 hover:bg-white/45 px-2 py-1 rounded border border-white/40 shadow-sm transition-all cursor-pointer"
                                title="Regenerate Reference suggestions"
                              >
                                <RefreshCw className="h-2.5 w-2.5" />
                                Refresh
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* 1. Core Focus Topics */}
                              <div className="bg-white/30 border border-white/35 p-4 rounded-xl space-y-2.5 shadow-sm backdrop-blur-sm">
                                <h5 className="font-semibold text-zinc-800 border-b border-white/20 pb-1.5 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                                  Recommended topics
                                </h5>
                                <div className="flex flex-col gap-1.5">
                                  {task.reference.topics && task.reference.topics.length > 0 ? (
                                    task.reference.topics.map((topic, i) => (
                                      <div key={i} className="flex items-start gap-2 text-zinc-700">
                                        <span className="text-emerald-600 font-mono mt-0.5">✓</span>
                                        <span>{topic}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-zinc-400 italic text-[11px]">No topics recommended yet.</p>
                                  )}
                                </div>
                              </div>

                              {/* 2. Recommended Resources */}
                              <div className="bg-white/30 border border-white/35 p-4 rounded-xl space-y-2.5 shadow-sm backdrop-blur-sm">
                                <h5 className="font-semibold text-zinc-800 border-b border-white/20 pb-1.5 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                  Suggested links
                                </h5>
                                <div className="flex flex-col gap-3">
                                  {task.reference.resources && task.reference.resources.length > 0 ? (
                                    task.reference.resources.map((resItem, i) => (
                                      <div key={i} className="space-y-0.5">
                                        <a
                                          href={resItem.url}
                                          target="_blank"
                                          referrerPolicy="no-referrer"
                                          rel="noopener noreferrer"
                                          className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline inline-flex items-center gap-1 text-[11px]"
                                        >
                                          {resItem.name}
                                          <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                        {resItem.desc && (
                                          <p className="text-[10px] text-zinc-500 leading-snug">{resItem.desc}</p>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-zinc-400 italic text-[11px]">No links yet.</p>
                                  )}
                                </div>
                              </div>

                              {/* 3. Study & Performance Tips */}
                              <div className="bg-white/30 border border-white/35 p-4 rounded-xl space-y-2.5 shadow-sm backdrop-blur-sm">
                                <h5 className="font-semibold text-zinc-800 border-b border-white/20 pb-1.5 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                  Execution tips
                                </h5>
                                <ul className="space-y-2 text-zinc-700 list-disc list-inside">
                                  {task.reference.studyTips && task.reference.studyTips.length > 0 ? (
                                    task.reference.studyTips.map((tip, i) => (
                                      <li key={i} className="leading-relaxed list-none flex items-start gap-1.5">
                                        <span className="text-blue-550 select-none mt-0.5">•</span>
                                        <span className="whitespace-pre-line">{tip}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <p className="text-zinc-400 italic text-[11px]">No tips yet.</p>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Edit Task Custom Dialog Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="edit_task_modal">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-150 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">Edit Task</h3>
              <button 
                onClick={() => setEditingTask(null)}
                className="text-zinc-450 hover:text-zinc-700 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Title</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Description</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-zinc-400 transition-all h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Priority</label>
                  <select 
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Due Time</label>
                  <input 
                    type="time" 
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Duration (mins)</label>
                  <input 
                    type="number" 
                    value={editEstimatedDuration}
                    onChange={(e) => setEditEstimatedDuration(parseInt(e.target.value) || 30)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 transition-all font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input 
                    type="checkbox" 
                    id="edit_escalation_enabled"
                    checked={editEscalationEnabled}
                    onChange={(e) => setEditEscalationEnabled(e.target.checked)}
                    className="h-4 w-4 bg-white border-zinc-200 rounded focus:ring-0 text-emerald-600"
                  />
                  <label htmlFor="edit_escalation_enabled" className="text-xs font-bold text-zinc-700 uppercase cursor-pointer">
                    Enable phone alerts
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Scheduled Alarm Time (Task Assist Service Worker)</label>
                <input 
                  type="datetime-local" 
                  value={editScheduledTime}
                  onChange={(e) => setEditScheduledTime(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400 transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-zinc-150">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-750 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editTitle.trim()) return;
                  await onUpdateTask(editingTask.id, {
                    title: editTitle,
                    description: editDescription,
                    priority: editPriority,
                    dueDate: editDueDate,
                    dueTime: editDueTime,
                    scheduledTime: editScheduledTime,
                    estimatedDuration: editEstimatedDuration,
                    escalationEnabled: editEscalationEnabled
                  });
                  setEditingTask(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Custom Confirmation Dialog */}
      {deletingTask && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="delete_task_modal">
          <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">Delete Task</h3>
            <p className="text-xs text-zinc-650 leading-relaxed">
              Are you sure you want to delete <span className="text-zinc-900 font-semibold">"{deletingTask.title}"</span>?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setDeletingTask(null)}
                className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-250 text-zinc-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDeleteTask(deletingTask.id);
                  setDeletingTask(null);
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

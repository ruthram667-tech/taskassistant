import React, { useState, useEffect } from "react";
import { 
  User,
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy,
  db, 
  logoutUser
} from "../lib/firebase";
import { Task } from "../types";
import { getEscalationTierForTime } from "../utils/date";
import { 
  LayoutDashboard, 
  ListCheck, 
  CalendarDays, 
  PhoneCall, 
  SendHorizontal, 
  HelpCircle, 
  LogOut, 
  Menu, 
  X,
  ShieldAlert,
  Phone,
  Volume2,
  VolumeX,
  Clock,
  Mail,
  ExternalLink,
  FileText
} from "lucide-react";

import OverviewPanel from "./OverviewPanel";
import TaskPanel from "./TaskPanel";
import SchedulePanel from "./SchedulePanel";
import EscalationPanel from "./EscalationPanel";
import DraftPanel from "./DraftPanel";
import HelpPanel from "./HelpPanel";
import CallLogsPanel from "./CallLogsPanel";

interface DashboardProps {
  user: User;
  googleToken: string | null;
  onLogout: () => void;
}

export default function Dashboard({ user, googleToken, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "schedule" | "escalations" | "drafts" | "help">("overview");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userPhone, setUserPhone] = useState("");
  const [defaultNotificationTime, setDefaultNotificationTime] = useState("09:00");
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Lifted Call Simulation States
  const [activeSimulation, setActiveSimulation] = useState<Task | null>(null);
  const [simTier, setSimTier] = useState<number>(1);
  const [simState, setSimState] = useState<"idle" | "ringing" | "connected" | "ended">("idle");
  const [simScript, setSimScript] = useState("");
  const [simUrgency, setSimUrgency] = useState("MEDIUM");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [triggeredEscalations, setTriggeredEscalations] = useState<string[]>([]);

  // Update dynamic clock time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Launch simulated call escalation
  const startSimulation = async (task: Task, tier: number) => {
    if (!userPhone) {
      console.warn("No phone configured for escalation.");
      return;
    }
    setActiveSimulation(task);
    setSimTier(tier);
    setSimState("ringing");
    setSimScript("Consulting automated operator node...");

    // Trigger ringtone sound (brief synth beep for high visual immersion)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}

    let scriptText = "";
    let urgencyLevel = "MEDIUM";

    // Fetch script from backend
    try {
      const response = await fetch("/api/gemini/escalation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: "System Administrator",
          taskTitle: task.title,
          escalationTier: tier,
          phoneNumber: userPhone
        })
      });

      if (response.ok) {
        const data = await response.json();
        scriptText = data.script || `Hello, this is Task Assist calling regarding task '${task.title}'. This is a Tier ${tier} reminder.`;
        urgencyLevel = data.urgency || "MEDIUM";
        setSimScript(scriptText);
        setSimUrgency(urgencyLevel);
      } else {
        throw new Error("Failed to get transcript");
      }
    } catch (err) {
      console.error(err);
      scriptText = `Hello, this is Task Assist calling on behalf of the user regarding task '${task.title}'. This is a Tier ${tier} reminder. Resolve immediately.`;
      setSimScript(scriptText);
    }
  };

  const answerCall = () => {
    setSimState("connected");
    setIsSynthesizing(true);

    // Use Web Speech API to speak the Gemini generated script!
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(simScript);
      utterance.pitch = 1.1;
      utterance.rate = 0.95;
      utterance.onend = () => {
        setIsSynthesizing(false);
        endCall(true);
      };
      utterance.onerror = () => {
        setIsSynthesizing(false);
        endCall(true);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsSynthesizing(false);
        endCall(true);
      }, 5000);
    }
  };

  const endCall = async (completed: boolean = false) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSynthesizing(false);

    if (!activeSimulation) return;

    // Create call log in DB
    const logData = {
      userId: user.uid,
      taskTitle: activeSimulation.title,
      contactName: "Personal Cell",
      phoneNumber: userPhone,
      tier: simTier,
      status: completed ? "completed" : "missed",
      script: simScript,
      timestamp: new Date().toISOString(),
      urgency: simUrgency as any
    };

    try {
      await addDoc(collection(db, "callLogs"), logData);
    } catch (err) {
      console.error(err);
    }

    setSimState("ended");
    setTimeout(() => {
      setActiveSimulation(null);
      setSimState("idle");
    }, 1500);
  };

  // Load user profile phone and tasks from Firestore
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Load Phone settings and notification preference
      setUserPhone("Task Assist");
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const docData = userDocSnap.data();
        if (docData.default_notification_time) {
          setDefaultNotificationTime(docData.default_notification_time);
        }
      }

      // 2. Load Tasks (filtered by userId to ensure strict isolation)
      const tasksQuery = query(
        collection(db, "tasks"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(tasksQuery);
      const loadedTasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        loadedTasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      // Sort client-side to avoid requiring composite indexes
      loadedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTasks(loadedTasks);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user.uid]);

  // Sync tasks when Dexie is updated by Service Worker
  useEffect(() => {
    const handleSync = () => {
      loadDashboardData();
    };
    window.addEventListener("task_db_updated", handleSync);
    return () => {
      window.removeEventListener("task_db_updated", handleSync);
    };
  }, []);

  // Background interval to check for pending tasks that need escalations
  useEffect(() => {
    if (loading || tasks.length === 0 || !userPhone) return;

    const interval = setInterval(() => {
      tasks.forEach(task => {
        // Only trigger for pending tasks with escalationEnabled
        if (task.status !== "pending" || !task.escalationEnabled) return;

        // Check if there is an active tier to trigger
        const tier = getEscalationTierForTime(task.dueDate, task.dueTime);
        if (tier !== null) {
          const key = `${task.id}-${tier}`;
          if (!triggeredEscalations.includes(key)) {
            // Found a tier that hasn't been triggered yet!
            setTriggeredEscalations(prev => [...prev, key]);
            // If there's already an active call, don't interrupt it
            if (!activeSimulation) {
              startSimulation(task, tier);
            }
          }
        }
      });
    }, 8000); // Check every 8 seconds

    return () => clearInterval(interval);
  }, [tasks, triggeredEscalations, activeSimulation, loading, userPhone]);

  // Task Operations
  const handleAddTask = async (taskData: Omit<Task, "id" | "userId" | "createdAt">) => {
    try {
      const docRef = await addDoc(collection(db, "tasks"), {
        ...taskData,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      // Append to local state
      const newTask: Task = {
        id: docRef.id,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        ...taskData
      };
      setTasks(prev => [newTask, ...prev]);

      // Trigger confirmation email asynchronously to ensure perfect speed
      try {
        fetch("/api/email/send-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: newTask,
            recipientEmail: user.email
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.log) {
            console.log("[Info] Confirmation email triggered successfully:", data.log);
            const event = new CustomEvent("taskassist:email_sent", { detail: data.log });
            window.dispatchEvent(event);
          }
        })
        .catch(err => console.error("Error calling confirmation email endpoint:", err));
      } catch (emailErr) {
        console.error("Failed to execute email API call:", emailErr);
      }
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const taskDocRef = doc(db, "tasks", id);
      await updateDoc(taskDocRef, updates);
      // Update local state
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const taskDocRef = doc(db, "tasks", id);
      await deleteDoc(taskDocRef);
      // Update local state
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  };

  // User profile update helper
  const handleUpdateUserPhone = async (phone: string) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { phone }, { merge: true });
      setUserPhone(phone);
    } catch (error) {
      console.error("Error saving user profile phone:", error);
      throw error;
    }
  };

  const handleUpdateNotificationTime = async (time: string) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { default_notification_time: time }, { merge: true });
      setDefaultNotificationTime(time);
    } catch (error) {
      console.error("Error saving notification preference:", error);
      throw error;
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "tasks", label: "Tasks", icon: <ListCheck className="h-4 w-4" /> },
    { id: "schedule", label: "Schedule", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "escalations", label: "Call Alerts", icon: <PhoneCall className="h-4 w-4" /> },
    { id: "call_logs", label: "Call Logs", icon: <FileText className="h-4 w-4" /> },
    { id: "drafts", label: "Message Drafter", icon: <FileText className="h-4 w-4" /> },
    { id: "help", label: "Help", icon: <HelpCircle className="h-4 w-4" /> }
  ] as const;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F7F5] text-zinc-800 flex flex-col md:flex-row font-sans relative overflow-hidden" id="dashboard_container">
      {/* Background Ambient Blur Blobs for Glassmorphic Glow */}
      <div className="absolute top-1/4 left-[-100px] w-[500px] h-[500px] bg-emerald-200/35 rounded-full blur-[100px] pointer-events-none animate-float-slow"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[550px] h-[550px] bg-sky-200/35 rounded-full blur-[110px] pointer-events-none animate-float-medium" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-[90px] pointer-events-none animate-float-slow" style={{ animationDelay: '4s' }}></div>

      {/* Simulation Call Active overlay */}
      {activeSimulation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans" id="call_overlay">
          <div className="w-full max-w-sm glass-card rounded-3xl p-8 flex flex-col items-center justify-between text-center min-h-[480px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"></div>

            {/* Calling Status Indicator */}
            <div className="space-y-2 mt-4 relative z-10">
              <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full animate-pulse">
                {simState === "ringing" ? "Incoming call..." : simState === "connected" ? "On the call" : "Call ended"}
              </span>
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Task Assist</h3>
              <p className="text-xs text-zinc-500 font-mono">{userPhone}</p>
            </div>

            {/* Visual Call Ring Analyzer */}
            <div className="my-10 flex items-center justify-center relative z-10">
              {simState === "ringing" ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-full animate-ping"></div>
                  <div className="absolute w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-full animate-pulse"></div>
                  <div className="bg-emerald-500 p-5 rounded-full shadow-lg shadow-emerald-500/10">
                    <Phone className="h-8 w-8 text-white" />
                  </div>
                </div>
              ) : simState === "connected" ? (
                <div className="flex items-center gap-1.5 h-12" id="voice_analyzer">
                  <div className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-12" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-6" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-10" style={{ animationDelay: "0.3s" }}></div>
                  <div className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-4" style={{ animationDelay: "0.4s" }}></div>
                  <div className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-12" style={{ animationDelay: "0.5s" }}></div>
                </div>
              ) : (
                <div className="bg-zinc-100 p-5 rounded-full">
                  <Phone className="h-8 w-8 text-zinc-400" />
                </div>
              )}
            </div>

            {/* Transcription Box */}
            <div className="p-4 bg-white/40 border border-white/40 backdrop-blur-sm rounded-2xl w-full text-left min-h-[100px] flex flex-col justify-between relative z-10 shadow-sm" id="voice_transcription">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Speech</span>
              <p className="text-xs text-zinc-700 leading-relaxed italic">
                "{simScript}"
              </p>
              {isSynthesizing && (
                <span className="text-[9px] text-emerald-600 font-mono flex items-center gap-1.5 mt-2">
                  <Volume2 className="h-3 w-3 animate-bounce" /> Speaking...
                </span>
              )}
            </div>

            {/* Interactive Answer Controls */}
            <div className="flex gap-4 w-full mt-6 relative z-10">
              {simState === "ringing" ? (
                <>
                  <button 
                    onClick={() => endCall(false)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={answerCall}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs cursor-pointer transition-colors shadow-lg shadow-emerald-500/10"
                  >
                    Answer
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => endCall(true)}
                  className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Hang up
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="logout_confirm_modal">
          <div className="w-full max-w-sm glass-card rounded-2xl p-6 space-y-4 shadow-2xl relative z-50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">Log Out</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3.5 py-2 glass-btn-secondary text-zinc-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logoutUser();
                  onLogout();
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col justify-between w-64 glass-sidebar p-6 shrink-0 relative z-20" id="desktop_sidebar">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-600 text-xs shadow-sm">
              <ShieldAlert className="h-5 w-5 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 text-md tracking-tight block">TASK ASSIST</span>
              <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest block">Core Terminal</span>
            </div>
          </div>

          {/* Aesthetic Telemetry Clock */}
          <div className="bg-white/45 border border-white/50 p-4 rounded-2xl space-y-1.5 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
              <span>Telemetry State</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-sm font-mono font-medium text-zinc-800 tracking-wider">
              {currentTime.toLocaleTimeString("en-US", { hour12: false })}
            </div>
            <div className="text-[9px] font-mono text-zinc-400">
              {currentTime.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>

          {/* User Widget */}
          <div className="bg-white/45 border border-white/50 p-4 rounded-2xl shadow-md space-y-2.5 backdrop-blur-sm">
            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">OPERATOR</span>
              <span className="text-xs font-semibold text-zinc-700 block truncate mt-1">{user.displayName || user.email}</span>
            </div>

            <div className="border-t border-white/30 pt-2">
              <span className="text-[9px] text-zinc-400 font-mono block">Alert Daily Sync:</span>
              <span className="text-xs font-mono font-bold text-zinc-700 flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3 w-3 text-emerald-500 shrink-0" />
                {defaultNotificationTime || "09:00"}
              </span>
            </div>

            <div className="flex gap-1">
              <span className="text-[9px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shadow-sm">
                {googleToken ? "SYNC ACTIVE" : "LOCAL CACHE"}
              </span>
            </div>
          </div>

          {/* Nav Tabs grouped by context */}
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono block px-2 mb-2">Workspace</span>
              <nav className="space-y-1" id="desktop_nav_workspace">
                {tabs.slice(0, 3).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      activeTab === tab.id 
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-md backdrop-blur-sm" 
                        : "text-zinc-500 hover:text-zinc-800 hover:bg-white/40 border-transparent hover:border-white/20"
                    }`}
                    id={`sidebar_tab_${tab.id}`}
                  >
                    {React.cloneElement(tab.icon, { className: "h-4 w-4 opacity-80" })}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono block px-2 mb-2">AI Operators</span>
              <nav className="space-y-1" id="desktop_nav_operators">
                {tabs.slice(3, 5).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      activeTab === tab.id 
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-md backdrop-blur-sm" 
                        : "text-zinc-500 hover:text-zinc-800 hover:bg-white/40 border-transparent hover:border-white/20"
                    }`}
                    id={`sidebar_tab_${tab.id}`}
                  >
                    {React.cloneElement(tab.icon, { className: "h-4 w-4 opacity-80" })}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono block px-2 mb-2">Support</span>
              <nav className="space-y-1" id="desktop_nav_support">
                {tabs.slice(5).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      activeTab === tab.id 
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-md backdrop-blur-sm" 
                        : "text-zinc-500 hover:text-zinc-800 hover:bg-white/40 border-transparent hover:border-white/20"
                    }`}
                    id={`sidebar_tab_${tab.id}`}
                  >
                    {React.cloneElement(tab.icon, { className: "h-4 w-4 opacity-80" })}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
          id="desktop_logout_btn"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden glass-sidebar border-b border-white/20 px-5 py-4 flex items-center justify-between z-30" id="mobile_header">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-emerald-600 animate-pulse" />
          <span className="font-bold text-zinc-900 tracking-tight text-sm">Task Assist</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-white/30 text-zinc-600 hover:text-zinc-900 cursor-pointer bg-white/30"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/40 border-b border-white/20 px-5 py-4 space-y-3 backdrop-blur-md z-30 shadow-sm" id="mobile_menu">
          <nav className="grid grid-cols-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border ${
                  activeTab === tab.id 
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 shadow-sm" 
                    : "text-zinc-500 bg-white/30 hover:text-zinc-800 border-transparent hover:border-white/20"
                }`}
                id={`mobile_tab_${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setShowLogoutConfirm(true);
            }}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-[11px] font-bold bg-white/30 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-600 border border-white/30 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}

      {/* Main Panel Content container */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto max-h-screen" id="main_viewport">
        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin"></div>
            <span className="text-[10px] font-mono text-zinc-450 tracking-wider">Loading tasks...</span>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6" id="dashboard_panel_switch">
            {activeTab === "overview" && (
              <OverviewPanel 
                tasks={tasks} 
                userName={user.displayName || user.email || "Operator"} 
                onUpdateTask={handleUpdateTask}
                onAddTask={handleAddTask}
                onNavigateToTab={setActiveTab}
              />
            )}
            {activeTab === "tasks" && (
              <TaskPanel 
                tasks={tasks} 
                onAddTask={handleAddTask} 
                onUpdateTask={handleUpdateTask} 
                onDeleteTask={handleDeleteTask} 
              />
            )}
            {activeTab === "schedule" && (
              <SchedulePanel 
                tasks={tasks} 
                onUpdateTask={handleUpdateTask} 
                googleToken={googleToken} 
              />
            )}
            {activeTab === "escalations" && (
              <EscalationPanel 
                tasks={tasks} 
                userId={user.uid} 
                userPhone={userPhone} 
                onUpdateUserPhone={handleUpdateUserPhone} 
                defaultNotificationTime={defaultNotificationTime}
                onUpdateNotificationTime={handleUpdateNotificationTime}
                activeSimulation={activeSimulation}
                simTier={simTier}
                simState={simState}
                simScript={simScript}
                simUrgency={simUrgency}
                isSynthesizing={isSynthesizing}
                startSimulation={startSimulation}
                answerCall={answerCall}
                endCall={endCall}
              />
            )}
            {activeTab === "call_logs" && (
              <CallLogsPanel />
            )}
            {activeTab === "drafts" && (
              <DraftPanel 
                user={user} 
              />
            )}
            {activeTab === "help" && (
              <HelpPanel />
            )}
          </div>
        )}
      </main>
    </div>
  );
}


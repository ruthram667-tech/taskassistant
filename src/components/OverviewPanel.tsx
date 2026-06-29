import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Quote, 
  ArrowUpRight, 
  Mic,
  Calendar,
  Plus,
  Check
} from "lucide-react";
import { checkIsOverdue, getLocalDateString } from "../utils/date";

interface OverviewPanelProps {
  tasks: Task[];
  userName: string;
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
  onAddTask?: (taskData: Omit<Task, "id" | "userId" | "createdAt">) => Promise<void>;
  onNavigateToTab?: (tab: "overview" | "tasks" | "schedule" | "escalations" | "drafts" | "help") => void;
}

export default function OverviewPanel({ 
  tasks, 
  userName, 
  onUpdateTask, 
  onAddTask, 
  onNavigateToTab 
}: OverviewPanelProps) {
  const [tips, setTips] = useState<{ tip: string; quote: string; scheduleSuggestion: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Voice Agent State
  const [voiceScript, setVoiceScript] = useState<string>("");
  const [whatsappBriefing, setWhatsappBriefing] = useState<string>("");
  const [spokenQuery, setSpokenQuery] = useState<string>("");
  const [speechError, setSpeechError] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [textFallbackQuery, setTextFallbackQuery] = useState("");

  // Daily Tasks Composer State
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<"low" | "medium" | "high">("medium");
  const [quickTime, setQuickTime] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !onAddTask) return;
    setIsAddingTask(true);
    try {
      await onAddTask({
        title: quickTitle.trim(),
        description: "Quick task added via Dashboard Overview",
        dueDate: getLocalDateString(),
        dueTime: quickTime || undefined,
        priority: quickPriority,
        status: "pending"
      });
      setQuickTitle("");
      setQuickTime("");
      setQuickPriority("medium");
    } catch (err) {
      console.error("Failed to add quick task:", err);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Compute stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const overdueTasks = tasks.filter(t => t.status === "overdue" || (t.status === "pending" && checkIsOverdue(t.dueDate, t.dueTime))).length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Stop active text to speech
  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      console.log("[Voice Agent Handshake] Stopping active Speech Synthesis...");
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Synthesize and speak text using browser speech engine
  const speakText = (text: string) => {
    setSpeechError("");
    console.log("[Voice Agent Handshake] [Stage 3/3 - SpeechSynthesis] Preparing to speak text back to user.");
    if ("speechSynthesis" in window) {
      try {
        console.log("[Voice Agent Handshake] Cancelling any active speech synthesis tasks.");
        window.speechSynthesis.cancel(); // cancel current speech
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.onstart = () => {
          console.log("[Voice Agent Handshake] SpeechSynthesis has officially started reading the script.");
          setIsSpeaking(true);
          setSpeechError("");
        };
        
        utterance.onend = () => {
          console.log("[Voice Agent Handshake] SpeechSynthesis finished reading script successfully.");
          setIsSpeaking(false);
        };
        
        utterance.onerror = (e) => {
          console.log("[Voice Agent Handshake] SpeechSynthesis error occurred. Code / Name:", e.error);
          setIsSpeaking(false);
          if (e.error === "not-allowed") {
            const blockMsg = "Browser security settings block autoplay speech synthesis in iframe previews. Open the app in a new tab or click the voice button to speak!";
            console.warn("[Voice Agent Handshake] SpeechSynthesis Blocked: " + blockMsg);
            setSpeechError(blockMsg);
          } else if (e.error && e.error !== "interrupted") {
            const tempMsg = `Speech synthesis temporary issue: ${e.error}. You can still read the generated script below.`;
            console.warn("[Voice Agent Handshake] SpeechSynthesis Error: " + tempMsg);
            setSpeechError(tempMsg);
          }
        };

        // Try to select a warm/high quality natural voice if available
        const voices = window.speechSynthesis.getVoices();
        console.log(`[Voice Agent Handshake] Total available browser system voices: ${voices.length}`);
        const preferredVoice = voices.find(
          (v) => 
            v.lang.startsWith("en") && 
            (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium") || v.name.includes("Zira"))
        );
        if (preferredVoice) {
          console.log(`[Voice Agent Handshake] High-quality voice selected: "${preferredVoice.name}" (${preferredVoice.lang})`);
          utterance.voice = preferredVoice;
        } else if (voices.length > 0) {
          console.log(`[Voice Agent Handshake] Using default fallback voice: "${voices[0].name}"`);
        }
        
        console.log("[Voice Agent Handshake] Queueing utterance with speech engine...");
        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        console.error("[Voice Agent Handshake] SpeechSynthesis exception:", err.message || err);
        setSpeechError("Speech synthesis is not permitted in this frame sandbox. Open in a new tab to hear the agent's voice!");
      }
    } else {
      console.warn("[Voice Agent Handshake] SpeechSynthesis API not supported in this browser.");
      setSpeechError("Speech synthesis is not supported by your browser.");
    }
  };

  // Triggers the local voice assistant to compile the personalized report and speak it
  const generateVoiceBrief = async (userQuery?: string) => {
    setIsGenerating(true);
    const query = userQuery || "";
    if (query) {
      setSpokenQuery(query);
      console.log(`[Vocal Assist] Offline Query captured: "${query}". Processing locally...`);
    } else {
      setSpokenQuery("");
      console.log("[Vocal Assist] Initiating a general status briefing request locally.");
    }

    try {
      // Simulate a small, elegant generation delay to make it feel natural and responsive
      await new Promise((resolve) => setTimeout(resolve, 650));

      // 1. Detect current time and respond with contextual greetings
      const hour = new Date().getHours();
      let timeGreeting = "";
      if (hour >= 5 && hour < 12) {
        timeGreeting = "Good morning! How's your day starting?";
      } else if (hour >= 12 && hour < 17) {
        timeGreeting = "Hey there! How's it going?";
      } else if (hour >= 17 && hour < 23) {
        timeGreeting = "Good evening buddy! How was your day?";
      } else {
        timeGreeting = "Hey, burning the midnight oil?";
      }

      let script = "";
      let whatsapp = "";

      const queryLower = query.toLowerCase().trim();
      const highPriorityTasksList = tasks.filter(t => t.status === "pending" && t.priority === "high");
      const overdueTasksList = tasks.filter(t => t.status === "pending" && checkIsOverdue(t.dueDate, t.dueTime));
      const completedTasksList = tasks.filter(t => t.status === "completed");
      const pendingTasksList = tasks.filter(t => t.status === "pending");

      // Check if user says "hi", "hey", or similar
      const isGreetingQuery = queryLower && (
        queryLower === "hi" || 
        queryLower === "hey" || 
        queryLower === "hello" || 
        queryLower === "yo" || 
        queryLower.startsWith("hi ") || 
        queryLower.startsWith("hey ") || 
        queryLower.startsWith("hello ")
      );

      if (isGreetingQuery) {
        script = `Hi buddy! How was your day? I am your offline voice assistant. Currently, we have ${pendingTasks} pending tasks to finish, and you've achieved a completion rate of ${completionRate} percent today. Let me know if you would like me to brief you on overdue or high-priority items!`;
        whatsapp = `🎙️ *TASK ASSIST VOCAL BRIEF* \n\n👤 *Operator*: ${userName}\n👋 Hi buddy! Welcome back.\n📈 *Pending*: ${pendingTasks} tasks\n🏆 *Completed*: ${completedTasks} tasks (${completionRate}%)`;
      } else if (queryLower) {
        if (queryLower.includes("overdue") || queryLower.includes("late") || queryLower.includes("delay")) {
          if (overdueTasksList.length > 0) {
            const titles = overdueTasksList.map(t => `"${t.title}"`).join(", ");
            script = `Hey ${userName}, I checked your records. We currently have ${overdueTasksList.length} overdue tasks that need your urgent attention. They are: ${titles}. Let's try to complete these first!`;
            whatsapp = `⚠️ *TASK ASSIST URGENT BRIEF*\n\n👤 *Operator*: ${userName}\n🚨 *Overdue Items*: ${overdueTasksList.length} tasks\n\n*Tasks:* \n${overdueTasksList.map(t => `• ${t.title} (${t.dueTime || "No time"})`).join("\n")}`;
          } else {
            script = `Good news, ${userName}! None of your pending tasks are overdue right now. Your timeline looks perfectly on track!`;
            whatsapp = `✅ *TASK ASSIST STATUS*\n\n👤 *Operator*: ${userName}\n✨ All clear! You have no overdue tasks at the moment. Great job!`;
          }
        } else if (queryLower.includes("urgent") || queryLower.includes("priority") || queryLower.includes("high") || queryLower.includes("important")) {
          if (highPriorityTasksList.length > 0) {
            const titles = highPriorityTasksList.map(t => `"${t.title}"`).join(", ");
            script = `Alright ${userName}, focusing on high-priority items. You have ${highPriorityTasksList.length} high-priority tasks pending. They are: ${titles}. Concentrating on these will deliver the highest impact today.`;
            whatsapp = `🔥 *TASK ASSIST PRIORITIES*\n\n👤 *Operator*: ${userName}\n⭐ *High-Priority Pending*: ${highPriorityTasksList.length} tasks\n\n*Items:* \n${highPriorityTasksList.map(t => `• ${t.title} (${t.dueDate})`).join("\n")}`;
          } else {
            script = `Hey ${userName}, you don't have any pending high-priority tasks right now. Feel free to focus on your general list or take a well-deserved breather!`;
            whatsapp = `✨ *TASK ASSIST STATUS*\n\n👤 *Operator*: ${userName}\n⭐ No urgent high-priority tasks are currently pending. Have a productive day!`;
          }
        } else if (queryLower.includes("completed") || queryLower.includes("done") || queryLower.includes("finish") || queryLower.includes("progress")) {
          if (completedTasksList.length > 0) {
            const titles = completedTasksList.map(t => `"${t.title}"`).slice(0, 5).join(", ");
            const moreCount = completedTasksList.length > 5 ? ` and ${completedTasksList.length - 5} more` : "";
            script = `Fantastic progress, ${userName}! You have completed a total of ${completedTasksList.length} tasks today, achieving a completion rate of ${completionRate} percent! Some of your completed items include: ${titles}${moreCount}. Keep this fantastic streak alive!`;
            whatsapp = `🏆 *TASK ASSIST PROGRESS*\n\n👤 *Operator*: ${userName}\n📊 *Completion Rate*: ${completionRate}%\n✅ *Completed count*: ${completedTasksList.length}\n📝 *Pending count*: ${pendingTasks}\n\n*Recent Wins:* \n${completedTasksList.slice(0, 5).map(t => `• ${t.title}`).join("\n")}`;
          } else {
            script = `Hello ${userName}. You haven't completed any tasks in your active queue yet today. No worries—pick a quick win from your list, complete it, and let's get the ball rolling!`;
            whatsapp = `📈 *TASK ASSIST PROGRESS*\n\n👤 *Operator*: ${userName}\n📊 No completed tasks yet today. Select a pending item and let's make a start!`;
          }
        } else if (queryLower.includes("alarm") || queryLower.includes("schedule") || queryLower.includes("snooze") || queryLower.includes("time") || queryLower.includes("notification")) {
          script = `Excellent question, ${userName}! Our task alarm engine utilizes a client-side Service Worker. When you schedule an alarm, the worker scans your Dexie database every 60 seconds. If an alarm matches, it fires a notification with Snooze and Done buttons, and plays a persistent alarm tone even if you close the tab!`;
          whatsapp = `⏰ *TASK ASSIST ALARM CONFIG*\n\n👤 *Operator*: ${userName}\n⚙️ Service Worker alarm engine: Active\n⏱️ Scan interval: 60s\n🔔 Features: Done & Snooze controls, persistent audio alarm.`;
        } else {
          // General matching search across task titles
          const matched = tasks.filter(t => t.title.toLowerCase().includes(queryLower));
          if (matched.length > 0) {
            const titles = matched.map(t => `"${t.title}"`).slice(0, 4).join(", ");
            script = `Hey ${userName}, I found ${matched.length} tasks matching your query "${query}". They are: ${titles}. Let me know if you would like to hear about something else!`;
            whatsapp = `🔍 *TASK ASSIST SEARCH*\n\n👤 *Operator*: ${userName}\n🎯 *Matches for "${query}"*: ${matched.length}\n\n*Tasks:* \n${matched.slice(0, 5).map(t => `• ${t.title} [${t.priority}]`).join("\n")}`;
          } else {
            script = `Hello ${userName}, I couldn't find any direct match for "${query}" in your task records. However, we have ${pendingTasks} pending tasks in total, with ${highPriorityTasksList.length} high priority items waiting. What would you like to focus on?`;
            whatsapp = `ℹ *TASK ASSIST SEARCH*\n\n👤 *Operator*: ${userName}\n❓ No direct matches for "${query}".\n📊 Total Pending: ${pendingTasks}\n⭐ High Priority: ${highPriorityTasksList.length}`;
          }
        }
      } else {
        // Standard full conversational status brief
        const overdueSentence = overdueTasks > 0 
          ? `I see you've got ${overdueTasks} overdue tasks waiting. We should definitely tackle those as soon as possible to keep your timeline clean.` 
          : "Fantastic! You have no overdue tasks at all, keeping your timeline perfectly clear!";
        
        const prioritySentence = highPriorityTasksList.length > 0
          ? `Your biggest high priority item is "${highPriorityTasksList[0].title}".`
          : "You don't have any pending high priority items flagged right now.";

        const completionFeedback = completedTasks > 0
          ? `You've crushed ${completedTasks} tasks today—nice work! But there are ${pendingTasks} still on the board.`
          : `We haven't checked off any tasks yet today, but we have ${pendingTasks} waiting in the queue. Let's make a start!`;

        script = `${timeGreeting} ${userName}! Welcome back to Task Assist. Here is your current offline workspace status: We have ${pendingTasks} pending tasks, and you've achieved a completion rate of ${completionRate} percent with ${completedTasks} completed items. ${completionFeedback} ${overdueSentence} ${prioritySentence} Want to focus on the deadline stuff first or knock out some quick wins?`;
        
        whatsapp = `📋 *TASK ASSIST DAILY BRIEF*\n\n👤 *Operator*: ${userName}\n📅 *Date*: ${new Date().toLocaleDateString()}\n📊 *Progress*: ${completionRate}% completed (${completedTasks}/${totalTasks})\n📝 *Pending*: ${pendingTasks}\n⚠️ *Overdue*: ${overdueTasks}\n⭐ *Top Priority*: ${highPriorityTasksList[0]?.title || "None"}`;
      }

      console.log("[Vocal Assist] Offline voice response generated successfully.");
      setVoiceScript(script);
      setWhatsappBriefing(whatsapp);
      
      // Speak the text
      speakText(script);
    } catch (err: any) {
      console.error("[Vocal Assist] Local offline voice generation failed:", err);
      const fallbackScript = `Hello ${userName}! Currently, we have ${pendingTasks} pending tasks to finish. Let's make today absolutely amazing!`;
      setVoiceScript(fallbackScript);
      setWhatsappBriefing(`📋 *TASK ASSIST BRIEF*\n\n👤 *Operator*: ${userName}\n📝 *Pending*: ${pendingTasks} tasks`);
      speakText(fallbackScript);
    } finally {
      setIsGenerating(false);
    }
  };

  // Triggers speech recognition first, then falls back or transitions to voice brief
  const handleVoiceTrigger = () => {
    setSpeechError("");
    console.log("[Voice Agent Handshake] [Stage 1/3 - SpeechRecognition] Voice button clicked.");
    if (isSpeaking) {
      console.log("[Voice Agent Handshake] Stopping ongoing voice play...");
      stopSpeech();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[Voice Agent Handshake] Web Speech API (SpeechRecognition) is not supported in this browser. Falling back directly to briefing mode.");
      // Direct update if SpeechRecognition is not supported
      generateVoiceBrief();
      return;
    }

    console.log("[Voice Agent Handshake] Initializing SpeechRecognition engine.");
    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("[Voice Agent Handshake] Microphone feed is now active. Capturing sound...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      console.log(`[Voice Agent Handshake] Voice captured successfully. Content: "${transcript}"`);
      generateVoiceBrief(transcript);
    };

    recognition.onerror = (e: any) => {
      console.error("[Voice Agent Handshake] SpeechRecognition error event triggered:", e.error);
      setIsListening(false);
      
      if (e.error === "not-allowed") {
        setSpeechError("Microphone access was blocked or denied. Please click 'Allow' when prompted or enable microphone permissions in your browser's address bar.");
      } else if (e.error === "no-speech") {
        setSpeechError("No speech was detected by your microphone. Please make sure your microphone is unmuted, speak directly into it, or type your query in the fallback box below!");
      } else if (e.error) {
        setSpeechError(`Voice capture issue: ${e.error}. Proceeding with standard briefing.`);
      }
      
      console.log("[Voice Agent Handshake] Proceeding to query with local briefing fallback due to capture error.");
      generateVoiceBrief();
    };

    recognition.onend = () => {
      console.log("[Voice Agent Handshake] SpeechRecognition capturing ended.");
      setIsListening(false);
    };

    try {
      console.log("[Voice Agent Handshake] Triggering microphone capture...");
      recognition.start();
    } catch (err: any) {
      console.error("[Voice Agent Handshake] SpeechRecognition failed to initiate start sequence:", err.message || err);
      generateVoiceBrief();
    }
  };

  const copyBriefingToClipboard = () => {
    if (whatsappBriefing) {
      navigator.clipboard.writeText(whatsappBriefing);
    }
  };

  // Clean up any ongoing speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchAIRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/gemini/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, userName })
      });
      if (response.ok) {
        const data = await response.json();
        setTips(data);
      } else {
        throw new Error("Failed to load tips");
      }
    } catch (error) {
      console.error(error);
      // Fallback response if offline
      setTips({
        tip: "Batch your high-focus tasks together early. Turn off notifications for deep work.",
        quote: "Your focus is your currency. Spend it wisely. - Workspace Wisdom",
        scheduleSuggestion: "Set a clear boundary between work blocks. Resolve any immediate overdue items."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIRecommendations();
  }, [tasks.length]); // Refresh tips when task count changes

  return (
    <div className="space-y-6 font-sans text-zinc-850" id="overview_panel">
      {/* Elegant Header & Dynamic Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-5 mb-4" id="greeting_banner">
        <div>
          <span className="text-[10px] font-mono font-extrabold tracking-[0.2em] text-[#1D4D32] bg-[#E2ECE6] px-3.5 py-1.5 rounded-full uppercase mb-2.5 inline-block border border-white/20 shadow-sm">
            Autonomous Operator Terminal
          </span>
          <h1 className="text-4xl font-serif text-[#163020] tracking-tight font-medium">
            Welcome back, <span className="font-serif font-bold text-[#059669]">{userName || "John"}</span>
          </h1>
          <p className="text-zinc-500 mt-2 italic font-serif text-xs leading-relaxed max-w-2xl">
            {tips ? `"${tips.quote.split(" - ")[0]}"` : `"Concentrate all your thoughts upon the work of hand. The sun's rays do not burn until brought to a focus."`}
          </p>
        </div>
        
        {/* Floating Capsule at Header */}
        <div className="bg-white/50 border border-white/60 px-4 py-2.5 rounded-full flex items-center gap-2.5 shrink-0 self-start sm:self-auto shadow-md backdrop-blur-md" id="autonomous_badge">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.15em] text-emerald-750">Core Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats_grid">
        {/* ACTIVE SCOPE */}
        <div className="glass-card hover:border-white/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md" id="stat_total">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.12em] text-zinc-400">Active Scope</span>
            <div className="p-1.5 rounded-full bg-white/45 border border-white/40 shadow-sm flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-4xl font-display font-medium text-zinc-800 leading-none">{totalTasks}</span>
            <span className="text-[9px] font-mono font-extrabold text-zinc-400 uppercase tracking-wider mt-1.5">Tasks</span>
          </div>
        </div>

        {/* RESOLVED */}
        <div className="glass-card hover:border-white/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md" id="stat_completed">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.12em] text-emerald-700">Resolved</span>
            <div className="p-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-4xl font-display font-medium text-zinc-800 leading-none">{completedTasks}</span>
            <span className="text-[9px] font-mono font-extrabold text-[#059669] uppercase tracking-wider mt-1.5">Completed</span>
          </div>
        </div>

        {/* PENDING */}
        <div className="glass-card hover:border-white/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md" id="stat_pending">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.12em] text-amber-750">Pending</span>
            <div className="p-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-sm flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-4xl font-display font-medium text-zinc-800 leading-none">{pendingTasks}</span>
            <span className="text-[9px] font-mono font-extrabold text-amber-600 uppercase tracking-wider mt-1.5">Awaiting</span>
          </div>
        </div>

        {/* OVERDUE */}
        <div className="glass-card hover:border-white/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md" id="stat_overdue">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-[0.12em] text-rose-700">Overdue</span>
            <div className="p-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 shadow-sm flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-4xl font-display font-medium text-zinc-800 leading-none">{overdueTasks}</span>
            <span className="text-[9px] font-mono font-extrabold text-rose-600 uppercase tracking-wider mt-1.5">Escalated</span>
          </div>
        </div>
      </div>

      {/* Progress & Day Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="progress_highlights_grid">
        
        {/* Progress Circle Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between md:col-span-1 shadow-md relative" id="completion_progress_card">
          <div className="flex items-center justify-between border-b border-white/25 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 font-mono">Resolve Metrics</h3>
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          
          <div className="my-6 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Elegant dual SVG ring with micro glowing accent */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="52" strokeWidth="4.5" stroke="rgba(255,255,255,0.3)" fill="transparent" />
                <circle cx="64" cy="64" r="52" strokeWidth="6" stroke="#10b981" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - completionRate / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out drop-shadow-[0_0_4px_rgba(16,185,129,0.25)]"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-display font-semibold text-zinc-800 tracking-tighter">{completionRate}%</span>
                <span className="text-[8px] uppercase font-mono font-extrabold text-zinc-400 tracking-widest mt-0.5">Rate</span>
              </div>
            </div>
          </div>

          {/* Sparkline graphics below circle to look like the UI mockup image */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
            {/* Total scope sparkline */}
            <div className="space-y-1">
              <div className="flex items-end justify-between h-6">
                <svg className="h-5 w-full stroke-zinc-400 fill-none opacity-65" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,15 L15,10 L30,16 L45,8 L60,14 L75,6 L90,12 L100,8" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-[9px] font-mono text-zinc-500">
                <span className="font-bold text-zinc-800">{totalTasks}</span> Total Scope
              </div>
            </div>

            {/* Resolved sparkline */}
            <div className="space-y-1">
              <div className="flex items-end justify-between h-6">
                <svg className="h-5 w-full stroke-emerald-500 fill-none opacity-80" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,16 L15,14 L30,8 L45,11 L60,5 L75,9 L90,3 L100,4" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-[9px] font-mono text-zinc-500">
                <span className="font-bold text-emerald-600">{completedTasks}</span> Resolved
              </div>
            </div>
          </div>
        </div>

        {/* Task Assist Voice Persona - Interactive AI Voice Agent */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden shadow-md md:col-span-2 flex flex-col justify-between" id="voice_persona_card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/20 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Mic className={`h-5 w-5 ${isSpeaking || isListening ? "text-emerald-600" : "text-zinc-500"}`} />
                {(isSpeaking || isListening) && (
                  <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 font-mono">Vocal Assist Console</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-sans">Voice schedule analysis & response</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSpeaking && (
                <button 
                  onClick={stopSpeech}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                  id="stop_speech_btn"
                >
                  Mute
                </button>
              )}
              <div className={`px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${
                isSpeaking 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                  : isListening 
                  ? "bg-blue-50 text-blue-600 border-blue-200 animate-pulse"
                  : isGenerating
                  ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                  : "bg-white/50 border-white/70 text-zinc-500"
              }`}>
                {isSpeaking ? "Speaking" : isListening ? "Listening" : isGenerating ? "Briefing..." : "Standby"}
              </div>
            </div>
          </div>

          {speechError && (
            <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 text-amber-850 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in" id="speech_error_alert">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="text-[10px] text-zinc-600">{speechError}</div>
            </div>
          )}

          {/* Core Controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5" id="voice_activator_container">
            <div className="md:col-span-2 flex flex-col items-center justify-center text-center p-4 bg-white/20 border border-white/30 backdrop-blur-sm rounded-2xl relative group shadow-sm">
              
              {/* High fidelity Concentric device button from reference UI */}
              <div className="relative flex items-center justify-center h-24 w-24">
                <div className={`absolute h-24 w-24 rounded-full bg-emerald-500/5 border border-emerald-500/10 transition-all duration-1000 ${isSpeaking || isListening ? "scale-110 animate-ping" : "group-hover:scale-105"}`}></div>
                <div className={`absolute h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 transition-all duration-1000 ${isSpeaking || isListening ? "scale-105 animate-pulse" : "group-hover:scale-102"}`}></div>
                
                <button
                  onClick={handleVoiceTrigger}
                  disabled={isGenerating}
                  className={`relative h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-md border cursor-pointer ${
                    isSpeaking 
                      ? "bg-[#10b981] border-emerald-400 text-white pulse-glow-green" 
                      : isListening 
                      ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/30"
                      : isGenerating
                      ? "bg-amber-500 border-amber-400 text-white animate-pulse"
                      : "bg-white hover:bg-[#EBF5F0] text-emerald-600 border-zinc-200 hover:border-emerald-500/35"
                  }`}
                  id="voice_trigger_button"
                  title="Press to initiate voice briefing"
                >
                  <Mic className="h-6 w-6 stroke-[2.2]" />
                </button>
              </div>

              <div className="mt-2.5">
                <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-wider font-mono">
                  {isListening ? "Vocal Pickup" : isSpeaking ? "Voice Feed" : "Initiate Briefing"}
                </p>
                <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight max-w-[130px] mx-auto">
                  Press mic to analyze schedule or speak queries.
                </p>
              </div>
            </div>

            {/* Voice Output and Script block */}
            <div className="md:col-span-3 flex flex-col justify-between p-4 bg-white/30 border border-white/40 backdrop-blur-sm rounded-2xl min-h-[160px] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/25 via-white/40 to-emerald-500/25"></div>
              
              <div className="space-y-1.5 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">Live Voice Script</span>
                  {whatsappBriefing && (
                    <button 
                      onClick={copyBriefingToClipboard}
                      className="text-[8px] font-mono font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer shadow-sm"
                    >
                      Copy WhatsApp
                    </button>
                  )}
                </div>
                
                {spokenQuery && (
                  <div className="text-[9px] bg-emerald-500/10 border border-emerald-500/15 rounded px-2 py-1 font-mono text-emerald-700 truncate">
                    &ldquo;{spokenQuery}&rdquo;
                  </div>
                )}

                <div className="p-3 bg-white/40 border border-white/30 rounded-xl flex-1 flex flex-col justify-between overflow-y-auto max-h-[85px] scrollbar-none shadow-inner">
                  <p className="text-[10px] text-zinc-700 leading-relaxed font-mono">
                    {voiceScript ? (
                      `> ${voiceScript}`
                    ) : (
                      <span className="text-zinc-400">Standby. Press the console button or type below to query.</span>
                    )}
                  </p>
                  {isSpeaking && (
                    <div className="flex items-center gap-1 mt-1.5 text-[8px] text-emerald-600 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Reading stream...
                    </div>
                  )}
                </div>

                {/* Fallback Text Input Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (textFallbackQuery.trim()) {
                      setSpeechError("");
                      generateVoiceBrief(textFallbackQuery.trim());
                      setTextFallbackQuery("");
                    }
                  }}
                  className="flex items-center gap-1.5 mt-1 bg-white/50 border border-zinc-200 rounded-xl px-2.5 py-1.5 shadow-sm focus-within:border-emerald-500/40"
                >
                  <input
                    type="text"
                    placeholder="Type fallback query (e.g. overdue, urgent, alarms)..."
                    value={textFallbackQuery}
                    onChange={(e) => setTextFallbackQuery(e.target.value)}
                    className="flex-grow bg-transparent border-none text-[10px] font-mono text-zinc-700 placeholder-zinc-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !textFallbackQuery.trim()}
                    className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-800 disabled:text-zinc-400 cursor-pointer transition-colors"
                  >
                    Send
                  </button>
                </form>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Tasks Focus Agenda - Displayed below the voice agent as a spacious full-width card */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden shadow-md" id="daily_tasks_agenda_card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#E6F4EA] border border-white/60 rounded-xl flex items-center justify-center text-[#059669] shadow-sm">
              <Calendar className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-900 font-mono">Today's Focus Agenda</h3>
              <p className="text-[11px] text-zinc-500 font-sans mt-0.5 font-medium">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("tasks")}
                className="text-xs font-mono font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Manage Tasks <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Checklist Area */}
        {(() => {
          const todayStr = getLocalDateString();
          const todayTasks = tasks.filter(t => t.dueDate === todayStr);
          const todayTotal = todayTasks.length;
          const todayCompleted = todayTasks.filter(t => t.status === "completed").length;

          return (
            <div className="space-y-4">
              {/* Stats progress banner */}
              {todayTotal > 0 && (
                <div className="flex items-center justify-between bg-white/30 border border-white/40 px-4 py-2.5 rounded-xl text-xs font-mono shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium">Daily resolution checklist</span>
                    <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                      {todayCompleted} / {todayTotal} Complete
                    </span>
                  </div>
                  <div className="w-48 bg-white/40 h-2 rounded-full overflow-hidden hidden md:block border border-white/20">
                    <div 
                      className="bg-[#10b981] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${(todayCompleted / todayTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center my-2 bg-white/25 border border-dashed border-white/55 rounded-2xl">
                  <div className="h-12 w-12 rounded-full bg-white/40 border border-white/40 flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
                    <CheckCircle2 className="h-6 w-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-800">No tasks scheduled for today</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                    Enjoy a clear day, or utilize the planning composer below to structure a quick focus action.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-none">
                  {todayTasks.map((task) => {
                    const isOverdue = checkIsOverdue(task.dueDate, task.dueTime) && task.status === "pending";
                    return (
                      <div 
                        key={task.id} 
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-sm ${
                          task.status === "completed" 
                            ? "bg-white/20 border-white/20 text-zinc-400" 
                            : "bg-white/50 border-white/40 hover:border-white/60 hover:bg-white/60 text-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {/* Interactive Checkbox */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (onUpdateTask) {
                                const newStatus = task.status === "completed" ? "pending" : "completed";
                                await onUpdateTask(task.id, { status: newStatus });
                              }
                            }}
                            className={`h-5 w-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                              task.status === "completed"
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                : "border-zinc-350 hover:border-emerald-500 bg-white"
                            }`}
                          >
                            {task.status === "completed" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${
                              task.status === "completed" ? "line-through text-zinc-400 font-normal" : "text-zinc-800"
                            }`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2.5 mt-1">
                              {task.dueTime && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
                                  <Clock className="h-3 w-3" />
                                  {task.dueTime}
                                </span>
                              )}
                              {isOverdue && (
                                <span className="text-[9px] font-mono font-bold text-rose-600 uppercase bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side: three-dots + Priority Badge */}
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            task.priority === "high"
                              ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              : task.priority === "medium"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-white/40 border border-white/50 text-zinc-500 shadow-sm"
                          }`}>
                            {task.priority}
                          </span>
                          <div className="text-zinc-400 hover:text-zinc-600 font-bold px-1 py-1 cursor-pointer select-none">
                            •••
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Composer Form */}
              <form onSubmit={handleQuickAdd} className="mt-4 pt-4 border-t border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Plan a quick task for today..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="flex-1 glass-input focus:bg-white/70 rounded-xl px-4 py-2.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-all font-sans shadow-sm"
                  disabled={isAddingTask}
                />
                
                <div className="flex items-center gap-2">
                  {/* Priority Selector */}
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as any)}
                    className="flex-1 sm:flex-none bg-white/40 border border-white/45 rounded-xl px-3 py-2.5 text-xs text-zinc-700 font-semibold outline-none focus:bg-white/75 cursor-pointer transition-all shadow-sm"
                    disabled={isAddingTask}
                  >
                    <option value="low">Priority: Low</option>
                    <option value="medium">Priority: Medium</option>
                    <option value="high">Priority: High</option>
                  </select>

                  {/* Quick Time Input */}
                  <input
                    type="text"
                    placeholder="Time (HH:MM)"
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value)}
                    className="w-28 glass-input focus:bg-white/70 rounded-xl px-3 py-2.5 text-xs text-zinc-750 text-center outline-none transition-all font-mono shadow-sm"
                    disabled={isAddingTask}
                  />

                  <button
                    type="submit"
                    disabled={isAddingTask || !quickTitle.trim()}
                    className="glass-btn-primary disabled:opacity-45 py-2.5 px-4 rounded-xl transition-all cursor-pointer hover:scale-105 shrink-0 flex items-center justify-center gap-1.5 shadow-md text-xs font-bold text-white"
                    title="Schedule task"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Add Task</span>
                  </button>
                </div>
              </form>
            </div>
          );
        })()}
      </div>

    </div>
  );
}

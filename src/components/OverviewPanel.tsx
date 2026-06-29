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
  const isReturningUser = localStorage.getItem("taskassist_is_returning") === "true";
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

  // ── EMOTIONAL TTS ENGINE ──────────────────────────────────────────────────
  // Reads the script chunk-by-chunk and applies dynamic pitch/rate inflections
  // based on punctuation and sentiment to sound dramatically more human.
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Clear any ongoing speech
      setSpeechError(null);
      setIsSpeaking(true);

      try {
        const voices = window.speechSynthesis.getVoices();
        
        // Priority: Natural, warm, expressive voices (especially Microsoft Aria Online, Google US/UK)
        const friendly = voices.find(v =>
          v.lang.startsWith("en") && (
            v.name.includes("Microsoft Aria Online") ||
            v.name.includes("Google UK English Female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Microsoft Zira") ||
            v.name.includes("Google US English") ||
            v.name.includes("Natural") ||
            v.name.includes("Premium")
          )
        ) || voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"));

        // Split text into meaningful conversational chunks (sentences or clauses)
        // Keeps the punctuation attached to the chunk.
        const chunks = text.match(/[^.!?—]+[.!?—]+/g) || [text];
        
        let chunkIndex = 0;

        const speakNextChunk = () => {
          if (chunkIndex >= chunks.length) {
            setIsSpeaking(false);
            return;
          }

          const chunkText = chunks[chunkIndex].trim();
          if (!chunkText) {
            chunkIndex++;
            return speakNextChunk();
          }

          const utterance = new SpeechSynthesisUtterance(chunkText);
          if (friendly) utterance.voice = friendly;

          // Base settings (friendly, warm)
          let pitch = 1.15;
          let rate = 0.92;

          const lowerChunk = chunkText.toLowerCase();

          // Apply dynamic emotional inflection based on content
          if (chunkText.includes("!") || lowerChunk.includes("great") || lowerChunk.includes("crushing") || lowerChunk.includes("good")) {
            // Enthusiastic / Motivational (higher energy, slightly faster)
            pitch = 1.25;
            rate = 0.98;
          } else if (chunkText.includes("?") || lowerChunk.includes("what") || lowerChunk.includes("how")) {
            // Inquisitive (raises pitch at the end naturally, we set baseline slightly higher)
            pitch = 1.22;
            rate = 0.94;
          } else if (lowerChunk.includes("overdue") || lowerChunk.includes("critical") || lowerChunk.includes("important") || lowerChunk.includes("flag") || lowerChunk.includes("debt")) {
            // Serious / Emphasized Guidance (slower, deeper, more serious tone)
            pitch = 0.90;
            rate = 0.85;
          } else if (chunkText.includes("—") || chunkText.includes("...")) {
            // Thoughtful pause / reflecting
            pitch = 1.05;
            rate = 0.88;
          } else {
            // Conversational baseline — randomize pitch very slightly for natural human-like cadence irregularity
            pitch = 1.1 + (Math.random() * 0.1); 
            rate = 0.92;
          }

          utterance.pitch = pitch;
          utterance.rate = rate;
          utterance.volume = 1;

          utterance.onend = () => {
            // Small conversational pause between sentences
            setTimeout(() => {
              chunkIndex++;
              speakNextChunk();
            }, 100); 
          };

          utterance.onerror = (e) => {
            if (e.error === "not-allowed") {
              setSpeechError("Microphone/Speaker blocked. Try clicking a button first!");
            } else if (e.error !== "interrupted") {
              setSpeechError(`Speech issue: ${e.error}.`);
            }
            setIsSpeaking(false);
          };

          window.speechSynthesis.speak(utterance);
        };

        // Kick off the emotional speech pipeline
        speakNextChunk();

      } catch (err: any) {
        setSpeechError("Speech synthesis is not permitted in this environment.");
        setIsSpeaking(false);
      }
    } else {
      setSpeechError("Speech synthesis is not supported by your browser.");
    }
  };

  // ── MENTOR AI CONVERSATION ENGINE ─────────────────────────────────────────────
  const generateVoiceBrief = async (userQuery?: string) => {
    setIsGenerating(true);
    const query = userQuery || "";
    if (query) setSpokenQuery(query);
    else setSpokenQuery("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const hour = new Date().getHours();
      const firstName = userName?.split(" ")[0] || "friend";

      // Time-based greetings with personality
      let timeGreeting = "";
      let energyBoost = "";
      if (hour >= 5 && hour < 12) {
        timeGreeting = `Good morning, ${firstName}!`;
        energyBoost = "Mornings are where champions are made. Let's start strong today.";
      } else if (hour >= 12 && hour < 15) {
        timeGreeting = `Hey ${firstName}, good afternoon!`;
        energyBoost = "You're in the heart of the day — perfect time to tackle something meaningful.";
      } else if (hour >= 15 && hour < 18) {
        timeGreeting = `Hey ${firstName}!`;
        energyBoost = "The afternoon push is real. A little focus now goes a long way before the day winds down.";
      } else if (hour >= 18 && hour < 23) {
        timeGreeting = `Good evening, ${firstName}!`;
        energyBoost = "Hope your day has been productive. Let's wrap things up on a high note.";
      } else {
        timeGreeting = `Hey ${firstName}, still up?`;
        energyBoost = "Late nights show dedication — just make sure you're resting enough too. Your best work comes from a rested mind.";
      }

      const highPriorityList = tasks.filter(t => t.status === "pending" && t.priority === "high");
      const overdueList = tasks.filter(t => t.status === "pending" && checkIsOverdue(t.dueDate, t.dueTime));
      const completedList = tasks.filter(t => t.status === "completed");
      const pendingList = tasks.filter(t => t.status === "pending");

      // Motivational coaching lines
      const coachingLines = [
        `Remember — every task you complete is a step toward the version of yourself you're building.`,
        `Focus on progress, not perfection. Small wins compound into big results.`,
        `You don't have to be perfect. You just have to keep moving forward.`,
        `The hardest part is always starting. Once you begin, momentum takes over.`,
        `Discipline is just doing the right thing even when you don't feel like it.`,
        `Each completed task is proof that you are capable of more than you think.`,
      ];
      const coaching = coachingLines[Math.floor(Math.random() * coachingLines.length)];

      let script = "";
      let whatsapp = "";
      const queryLower = query.toLowerCase().trim();

      const isGreeting = queryLower && ["hi","hey","hello","yo","what's up","sup","good morning","good evening"].some(g => queryLower.startsWith(g));
      const asksOverdue = queryLower.includes("overdue") || queryLower.includes("late") || queryLower.includes("miss");
      const asksUrgent = queryLower.includes("urgent") || queryLower.includes("priority") || queryLower.includes("high") || queryLower.includes("important");
      const asksDone = queryLower.includes("done") || queryLower.includes("complet") || queryLower.includes("finish") || queryLower.includes("progress");
      const asksAdvice = queryLower.includes("advice") || queryLower.includes("help") || queryLower.includes("what should") || queryLower.includes("suggest") || queryLower.includes("guide") || queryLower.includes("tip");
      const asksMotivation = queryLower.includes("motivat") || queryLower.includes("inspir") || queryLower.includes("push") || queryLower.includes("energy") || queryLower.includes("encourage");

      if (!queryLower || isGreeting) {
        // AUTO GREETING — Full conversational status brief
        const overdueNote = overdueList.length > 0
          ? `I do need to flag something important though — you have ${overdueList.length} overdue ${overdueList.length === 1 ? "task" : "tasks"} that need your attention. Your top overdue item is "${overdueList[0].title}". Let's make sure we handle that today.`
          : `And the good news is — you have zero overdue tasks. Your timeline is spotless. That's real discipline!`;

        const priorityNote = highPriorityList.length > 0
          ? `Your most critical task right now is "${highPriorityList[0].title}". I'd recommend starting with that — high-priority items done early give you mental clarity for the rest of the day.`
          : `You have no high-priority tasks flagged right now, so you have the freedom to choose your own rhythm today.`;

        const progressNote = completionRate >= 80
          ? `You're absolutely crushing it — ${completionRate} percent completion rate. I'm genuinely impressed. Keep this energy up!`
          : completionRate >= 50
          ? `You're at ${completionRate} percent for today. Solid progress! But there's still more to unlock. I believe in you.`
          : completedList.length === 0
          ? `We haven't checked off anything yet today, ${firstName}. That's okay — every great day starts with the first tick. Pick one task, just one, and let's get the momentum rolling.`
          : `You're at ${completionRate} percent completion. ${pendingTasks} tasks are still waiting. Let's chip away at them together.`;

        script = `${timeGreeting} How was your day? I am your offline voice assistant — your personal task guide. ${energyBoost} Here's your current status: you have ${pendingTasks} pending ${pendingTasks === 1 ? "task" : "tasks"} and ${completedList.length} completed. ${progressNote} ${overdueNote} ${priorityNote} ${coaching} I'm here whenever you need me — just tap the mic and talk to me!`;

        whatsapp = `🎙️ *TASK ASSIST DAILY BRIEF*\n\n👤 *Operator*: ${userName}\n📅 *Date*: ${new Date().toLocaleDateString()}\n📊 *Completion*: ${completionRate}% (${completedList.length}/${tasks.length})\n📝 *Pending*: ${pendingTasks}\n⚠️ *Overdue*: ${overdueList.length}\n⭐ *Top Priority*: ${highPriorityList[0]?.title || "None"}\n\n💬 "${coaching}"`;

      } else if (asksAdvice) {
        // Personalized guidance based on current task state
        if (overdueList.length > 0) {
          script = `Great question, ${firstName}. Here is my honest guidance for you right now: your most important move is to clear your ${overdueList.length} overdue ${overdueList.length === 1 ? "task" : "tasks"} first. Overdue items are like unpaid debts — they silently drain your mental energy. Start with "${overdueList[0].title}". Even 30 minutes of focused work on it will make you feel so much lighter. After that, tackle your high priority items. Remember — you don't have to do everything at once. Just the next right thing.`;
        } else if (highPriorityList.length > 0) {
          script = `Here is my best advice for you today, ${firstName}: your high-priority tasks deserve your freshest energy. Right now your most important item is "${highPriorityList[0].title}". Block out 45 minutes, silence your notifications, and go deep on that one. Once it's done, everything else will feel easier. Trust the process — focus creates momentum, and momentum creates results.`;
        } else if (pendingList.length > 0) {
          script = `You're in great shape, ${firstName} — no overdue tasks, no critical emergencies. My advice? Use this calm window wisely. Pick the pending task that will create the most value for tomorrow-you and do it now. Future you will be grateful. You have ${pendingList.length} tasks waiting — start with the one that's been sitting longest on your list.`;
        } else {
          script = `${firstName}, honestly? You're in an enviable position — a completely clear board! My advice is to use this space to plan ahead. What's coming next week? What can you set up now to make your future days easier? Great leaders aren't just reactive — they plan during the calm.`;
        }
        whatsapp = `💡 *TASK ASSIST GUIDANCE*\n\n👤 *Operator*: ${userName}\n📝 *Pending*: ${pendingTasks}\n⚠️ *Overdue*: ${overdueList.length}\n⭐ *Priority Focus*: ${highPriorityList[0]?.title || "None"}\n\n🧭 Guidance delivered via Voice Assistant.`;

      } else if (asksMotivation) {
        const motivations = [
          `${firstName}, let me be real with you. You showed up today — that alone puts you ahead of most people. You have ${pendingTasks} tasks waiting, and every single one is an opportunity to prove what you're made of. You didn't come this far to give up now. ${coaching} Let's get it done!`,
          `Listen ${firstName} — motivation is a feeling, but discipline is a choice. You don't need to feel ready to start. Start anyway. Start small. Do the first 5 minutes. That's all. Once you begin, the energy will follow. You've got this, I promise you.`,
          `${firstName}, I want you to remember something. Every completed task in your history was once just an item on a list — just like the ones waiting now. You've beaten every task before this. These ones are no different. The only question is when — and I think the answer is right now.`,
        ];
        script = motivations[Math.floor(Math.random() * motivations.length)];
        whatsapp = `💪 *TASK ASSIST MOTIVATION*\n\n👤 *Operator*: ${userName}\n\n"${coaching}"`;

      } else if (asksOverdue) {
        if (overdueList.length > 0) {
          const titles = overdueList.map(t => `"${t.title}"`).slice(0, 3).join(", ");
          script = `${firstName}, I'm not going to sugarcoat this — you have ${overdueList.length} overdue ${overdueList.length === 1 ? "task" : "tasks"} and that needs your attention now. They are: ${titles}. Here's what I recommend: don't try to do them all at once. Pick the most important one and focus on it completely. Overdue tasks create anxiety, but action dissolves anxiety. Let's start with "${overdueList[0].title}" — right now, today. You can do this.`;
        } else {
          script = `${firstName}, I checked everything and you have absolutely zero overdue tasks. That is genuinely impressive! Your time management is on point. Keep this discipline going — it's the foundation of everything else you want to achieve.`;
        }
        whatsapp = `⚠️ *TASK ASSIST OVERDUE CHECK*\n\n👤 *Operator*: ${userName}\n🚨 *Overdue*: ${overdueList.length} ${overdueList.length === 0 ? "— All Clear! ✅" : "tasks"}\n\n${overdueList.map(t => `• ${t.title}`).join("\n")}`;

      } else if (asksUrgent) {
        if (highPriorityList.length > 0) {
          const titles = highPriorityList.map(t => `"${t.title}"`).slice(0, 3).join(", ");
          script = `${firstName}, let's talk priorities. You have ${highPriorityList.length} high-priority ${highPriorityList.length === 1 ? "task" : "tasks"} waiting: ${titles}. My strong recommendation — protect your best mental hours for these. Don't let low-value activities eat up the time that belongs to your most important work. High priority tasks are high priority for a reason. Let's honour that and get them done.`;
        } else {
          script = `Great news, ${firstName}! You have no high-priority tasks pending right now. This is your window to either get ahead on medium priority items, or to plan and organize what's coming next. Use this calm wisely — it's a gift!`;
        }
        whatsapp = `⭐ *TASK ASSIST PRIORITIES*\n\n👤 *Operator*: ${userName}\n🔥 *High Priority Pending*: ${highPriorityList.length}\n\n${highPriorityList.map(t => `• ${t.title}`).join("\n")}`;

      } else if (asksDone) {
        if (completedList.length > 0) {
          script = `${firstName}, let me celebrate with you for a second. You have completed ${completedList.length} ${completedList.length === 1 ? "task" : "tasks"} — that's a ${completionRate} percent completion rate. That is real, tangible progress. Each one of those represents a decision you made to follow through. Be proud of that. Now, with ${pendingList.length} still pending, let's keep that momentum going. What do you want to tackle next?`;
        } else {
          script = `${firstName}, you haven't checked off any tasks yet today — and that is completely okay. Every journey starts somewhere. My challenge to you: pick the smallest, quickest task on your list right now and complete it. That first tick of the day is magic. It changes your mindset from "I need to do things" to "I am someone who gets things done." Go for it!`;
        }
        whatsapp = `🏆 *TASK ASSIST PROGRESS*\n\n👤 *Operator*: ${userName}\n📊 *Rate*: ${completionRate}%\n✅ *Done*: ${completedList.length}\n📝 *Remaining*: ${pendingList.length}`;

      } else {
        // Smart keyword task search + fallback guide response
        const matched = tasks.filter(t => t.title.toLowerCase().includes(queryLower) || t.description?.toLowerCase().includes(queryLower));
        if (matched.length > 0) {
          const titles = matched.map(t => `"${t.title}"`).slice(0, 3).join(", ");
          script = `${firstName}, I found ${matched.length} ${matched.length === 1 ? "task" : "tasks"} matching what you asked about: ${titles}. ${matched[0].status === "pending" ? `"${matched[0].title}" is still pending${checkIsOverdue(matched[0].dueDate, matched[0].dueTime) ? " and it's overdue — let's prioritize this right away!" : ". Make sure you schedule time for it."}` : `"${matched[0].title}" is already marked as ${matched[0].status}. Well done!`}`;
        } else {
          script = `${firstName}, I didn't find a specific match for that, but let me give you a quick situational overview: you have ${pendingTasks} pending tasks and ${completedList.length} completed. ${overdueList.length > 0 ? `There are ${overdueList.length} overdue items that need immediate attention.` : `Your timeline is clean with no overdue tasks.`} ${coaching} Is there anything specific I can help you with? Ask me about overdue tasks, high priority items, your progress, or just say "give me advice" and I'll guide you!`;
        }
        whatsapp = `🔍 *TASK ASSIST SEARCH*\n\n👤 *Operator*: ${userName}\n🎯 *Query*: "${query}"\n📊 *Pending*: ${pendingTasks} | *Done*: ${completedList.length}`;
      }

      setVoiceScript(script);
      setWhatsappBriefing(whatsapp);
      speakText(script);

    } catch (err: any) {
      console.error("[Vocal Assist] Error:", err);
      const fallback = `Hey ${userName}! I'm your personal task guide. You have ${pendingTasks} pending tasks right now. Remember — progress over perfection. Let's make today count!`;
      setVoiceScript(fallback);
      speakText(fallback);
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

  // ── AUTO-GREETING on Dashboard Open ──────────────────────────────────────────
  // Fires once when the Overview panel mounts. Waits for browser voices to load,
  // then automatically speaks the personalized time-aware greeting.
  useEffect(() => {
    // Only trigger once per session so it doesn't repeat on re-renders
    const alreadyGreeted = sessionStorage.getItem("taskassist_greeted");
    if (alreadyGreeted) return;

    const fireGreeting = () => {
      sessionStorage.setItem("taskassist_greeted", "true");
      generateVoiceBrief(); // calls the full status briefing
    };

    // Browsers load voices async — wait up to 2s for them, then fire
    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Voices already available — small UX delay so dashboard has time to render
        setTimeout(fireGreeting, 1200);
      } else {
        // Wait for voices to load
        window.speechSynthesis.addEventListener("voiceschanged", () => {
          setTimeout(fireGreeting, 800);
        }, { once: true });
        // Absolute fallback if voiceschanged never fires
        setTimeout(fireGreeting, 2500);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 font-sans text-zinc-850" id="overview_panel">
      {/* Elegant Header & Dynamic Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-5 mb-4" id="greeting_banner">
        <div>
          <span className="text-[10px] font-mono font-extrabold tracking-[0.2em] text-[#1D4D32] bg-[#E2ECE6] px-3.5 py-1.5 rounded-full uppercase mb-2.5 inline-block border border-white/20 shadow-sm">
            Autonomous Operator Terminal
          </span>
          <h1 className="text-4xl font-serif text-[#163020] tracking-tight font-medium">
            {isReturningUser ? "Welcome back, " : "Welcome to Task Assist, "}<span className="font-serif font-bold text-[#059669]">{userName || "John"}</span>
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

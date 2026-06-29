import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  History, 
  User, 
  Mail, 
  MessageSquare, 
  Send, 
  FileText, 
  PlusCircle, 
  Search,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Info
} from "lucide-react";
import { localDb } from "../db";
import { MessageDraft } from "../types";
import { generateLocalDraft } from "../utils/localDraftAI";

interface DraftPanelProps {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
}

const QUICK_TEMPLATES = [
  {
    label: "Sick Leave Today",
    prompt: "I am feeling sick and need to take leave for today. I will handle pending emails tomorrow.",
    recipientType: "HOD/Manager",
    channel: "Email",
    tone: "Polite & Respectful"
  },
  {
    label: "Late: Heavy Traffic",
    prompt: "I'm caught in heavy traffic and will be about 30 minutes late to the office.",
    recipientType: "Colleague/Peer",
    channel: "Slack/Teams",
    tone: "Apologetic"
  },
  {
    label: "Reschedule Chat",
    prompt: "I have a sudden client conflict and need to postpone our afternoon sync. Let's reschedule for tomorrow morning.",
    recipientType: "Colleague/Peer",
    channel: "Slack/Teams",
    tone: "Professional"
  },
  {
    label: "Leave: Family Emergency",
    prompt: "I have an urgent family emergency and need to take sudden leave for the afternoon.",
    recipientType: "HOD/Manager",
    channel: "WhatsApp/SMS",
    tone: "Urgent"
  }
];

export default function DraftPanel({ user }: DraftPanelProps) {
  // Input form states
  const [prompt, setPrompt] = useState("");
  const [recipientType, setRecipientType] = useState("HOD/Manager");
  const [channel, setChannel] = useState("Email");
  const [tone, setTone] = useState("Professional");
  const [additionalDetails, setAdditionalDetails] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"primary" | "short" | "formal">("primary");

  // Output generated drafts
  const [generatedDrafts, setGeneratedDrafts] = useState<{
    primary: string;
    short: string;
    formal: string;
  } | null>(null);

  // History state
  const [history, setHistory] = useState<MessageDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<MessageDraft | null>(null);

  // Load history from local Dexie IndexedDB
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const items = await localDb.table('message_drafts').orderBy('createdAt').reverse().toArray();
        setHistory(items);
      } catch (e) {
        // Table may not exist yet — it'll be created on first save
        setHistory([]);
      }
    };
    loadHistory();
  }, [user.uid]);

  // Handle template click
  const handleApplyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setPrompt(tpl.prompt);
    setRecipientType(tpl.recipientType);
    setChannel(tpl.channel);
    setTone(tpl.tone);
    setError(null);
  };

  // Generate Draft Call directly via Gemini API in the browser
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please describe the message you want to draft.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedDrafts(null);
    setSelectedHistoryItem(null);

    try {
      // Use our fully local, zero-API-key drafting engine
      const data = generateLocalDraft({ prompt, channel, recipientType, tone, additionalDetails });

      if (!data.primary || !data.short || !data.formal) throw new Error("Draft generation failed.");

      setGeneratedDrafts(data);

      // Save to Dexie IndexedDB
      const newDraft = {
        id: `draft_${Math.random().toString(36).substring(2, 11)}`,
        userId: user.uid,
        userPrompt: prompt,
        channel,
        recipientType,
        tone,
        additionalDetails,
        primaryDraft: data.primary,
        shortDraft: data.short,
        formalDraft: data.formal,
        createdAt: new Date().toISOString()
      };

      try {
        await localDb.table('message_drafts').put(newDraft);
        setHistory(prev => [newDraft as MessageDraft, ...prev]);
      } catch (dbErr) {
        console.warn("Could not save to history:", dbErr);
      }

    } catch (err: any) {
      setError(err.message || "An error occurred during draft creation.");
    } finally {
      setLoading(false);
    }
  };

  // Delete draft from local Dexie DB
  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await localDb.table('message_drafts').delete(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      if (selectedHistoryItem?.id === id) {
        setSelectedHistoryItem(null);
        setGeneratedDrafts(null);
      }
    } catch (err) {
      console.error("Failed to delete draft:", err);
    }
  };

  // Copy text helper
  const handleCopyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Restore history draft to view
  const handleSelectHistoryItem = (item: MessageDraft) => {
    setSelectedHistoryItem(item);
    setPrompt(item.userPrompt);
    setRecipientType(item.recipientType);
    setChannel(item.channel);
    setTone(item.tone);
    setAdditionalDetails(item.additionalDetails || "");
    setGeneratedDrafts({
      primary: item.primaryDraft,
      short: item.shortDraft,
      formal: item.formalDraft
    });
  };

  // Filter history
  const filteredHistory = history.filter(item => 
    item.userPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.recipientType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.primaryDraft.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12" id="drafts_panel">
      {/* Top Header Card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 text-zinc-900 relative overflow-hidden shadow-md" id="drafts_header">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold font-mono">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Intelligence Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 leading-none">
              AI Message Drafter
            </h1>
            <p className="text-zinc-600 text-xs md:text-sm max-w-xl">
              Describe who you want to contact and why. Our AI constructs three highly tailored variations optimized for emails, instant messaging, or general pings. No actual messages are sent.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/30 p-3 rounded-2xl border border-white/35 shrink-0 backdrop-blur-sm shadow-sm" id="drafter_badge">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono font-bold text-emerald-700 shadow-sm">
              AI
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Draft Mode Active</div>
              <div className="text-xs text-zinc-800 font-semibold font-mono">100% Client Privacy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="drafts_grid">
        {/* Left Column: Form & Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card rounded-3xl p-6 md:p-7 shadow-md space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-zinc-600" />
                Draft Configuration
              </h2>
              <span className="text-[10px] font-mono text-zinc-600 bg-white/40 border border-white/45 px-2 py-0.5 rounded shadow-sm">
                Custom Parameters
              </span>
            </div>

            {/* Quick Templates List */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold font-mono text-zinc-400 uppercase tracking-wider">
                Quick Template Presets
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="px-3 py-1.5 rounded-xl border border-white/45 bg-white/30 hover:bg-white/60 hover:border-white/55 text-zinc-750 text-xs font-semibold cursor-pointer transition-all hover:scale-[1.01] shadow-sm"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer Form */}
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Core Input Query */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide font-mono">
                  What is your core message? <span className="text-emerald-600">*</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setError(null);
                    }}
                    placeholder='e.g., "I need to take sudden leave today because my child is unwell and I have to go to the doctor"'
                    className="w-full glass-input rounded-2xl p-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all resize-none focus:bg-white/70 shadow-sm font-sans"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] text-zinc-400 font-mono">
                    {prompt.length} chars
                  </div>
                </div>
              </div>

              {/* Three Column Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Recipient */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider font-mono">
                    Recipient Type
                  </label>
                  <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                    className="w-full bg-white/40 border border-white/45 rounded-xl px-3 py-2 text-xs text-zinc-800 font-medium outline-none focus:bg-white/70 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="HOD/Manager">HOD / Manager</option>
                    <option value="Client/Stakeholder">Client / Stakeholder</option>
                    <option value="Colleague/Peer">Colleague / Peer</option>
                    <option value="Friend/Family">Friend / Family</option>
                    <option value="General">General / Anyone</option>
                  </select>
                </div>

                {/* Target Channel */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider font-mono">
                    Target Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full bg-white/40 border border-white/45 rounded-xl px-3 py-2 text-xs text-zinc-800 font-medium outline-none focus:bg-white/70 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="Email">Email</option>
                    <option value="Slack/Teams">Slack / Teams</option>
                    <option value="WhatsApp/SMS">WhatsApp / SMS</option>
                    <option value="General">General Text</option>
                  </select>
                </div>

                {/* Tone */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider font-mono">
                    Tone Of Message
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-white/40 border border-white/45 rounded-xl px-3 py-2 text-xs text-zinc-800 font-medium outline-none focus:bg-white/70 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Polite & Respectful">Polite & Respectful</option>
                    <option value="Casual/Friendly">Casual / Friendly</option>
                    <option value="Urgent">Urgent / Immediate</option>
                    <option value="Apologetic">Apologetic</option>
                  </select>
                </div>
              </div>

              {/* Additional Context Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide font-mono">
                  Additional Details / Constraints <span className="text-zinc-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  placeholder="e.g., 'Mention I will handle urgent items online' or 'Request response'"
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:bg-white/70 shadow-sm font-sans"
                />
              </div>

              {/* Error Warning */}
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-750 text-xs rounded-xl flex items-start gap-2.5 shadow-sm">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={loading}
                className="w-full glass-btn-primary text-white font-bold py-3 px-6 rounded-2xl text-xs tracking-wider uppercase inline-flex items-center justify-center gap-2 transition-all hover:scale-[1.01] shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                id="generate_draft_btn"
              >
                <Sparkles className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Generating Draft..." : "Draft High-Quality Content"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: AI Output & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Output Card */}
          {generatedDrafts ? (
            <div className="glass-card rounded-3xl p-6 text-zinc-900 shadow-md space-y-5 flex flex-col justify-between min-h-[460px]">
              <div>
                <div className="flex items-center justify-between border-b border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      Generated Variations
                    </span>
                  </div>
                  {selectedHistoryItem && (
                    <span className="text-[9px] font-mono text-zinc-500 border border-white/30 bg-white/20 px-2 py-0.5 rounded shadow-sm">
                      Restored From History
                    </span>
                  )}
                </div>

                {/* Sub-tabs selectors */}
                <div className="grid grid-cols-3 gap-1 bg-white/30 p-1 rounded-xl mt-4 border border-white/35 shadow-inner backdrop-blur-sm">
                  {(["primary", "short", "formal"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                        activeTab === tab 
                          ? "bg-white text-zinc-900 shadow-md border border-white/20" 
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      {tab === "primary" ? "Standard" : tab === "short" ? "Instant (App)" : "Formal Email"}
                    </button>
                  ))}
                </div>

                {/* Main draft content viewer */}
                <div className="bg-white/30 border border-white/35 rounded-2xl p-4 mt-4 font-mono text-[11px] leading-relaxed select-all max-h-72 overflow-y-auto whitespace-pre-wrap text-zinc-800 shadow-inner">
                  {activeTab === "primary" && generatedDrafts.primary}
                  {activeTab === "short" && generatedDrafts.short}
                  {activeTab === "formal" && generatedDrafts.formal}
                </div>
              </div>

              {/* Action utilities */}
              <div className="pt-2">
                <button
                  onClick={() => handleCopyToClipboard(
                    activeTab === "primary" ? generatedDrafts.primary : activeTab === "short" ? generatedDrafts.short : generatedDrafts.formal,
                    activeTab
                  )}
                  className="w-full glass-btn-primary text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-md"
                  id={`copy_${activeTab}_btn`}
                >
                  {copiedKey === activeTab ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied To Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Selected Draft
                    </>
                  )}
                </button>
                <div className="text-[10px] text-zinc-500 text-center font-mono mt-3">
                  Click text to select all. Use as copy-paste template.
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-6 text-zinc-500 shadow-md flex flex-col items-center justify-center text-center min-h-[460px] relative">
              <div className="h-16 w-16 bg-white/40 border border-white/45 rounded-2xl flex items-center justify-center text-zinc-500 mb-4 shadow-sm">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-zinc-800 text-sm">No Active Draft</h3>
              <p className="text-xs text-zinc-450 max-w-xs mt-1.5 leading-relaxed">
                Choose a configuration on the left and submit to generate communication variations.
              </p>
            </div>
          )}

          {/* History Panel */}
          <div className="glass-card rounded-3xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <History className="h-4 w-4 text-zinc-400" />
                Draft History ({history.length})
              </h3>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-800"
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Search filter bar */}
            <div className="relative font-sans">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search historical drafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-[11px] outline-none transition-all focus:bg-white/70 shadow-sm"
              />
            </div>

            {/* History Feed */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1" id="drafts_history_feed">
              {filteredHistory.length === 0 ? (
                <div className="text-center py-8 text-zinc-450 text-xs font-mono">
                  {searchQuery ? "No matching records found." : "No saved drafts yet."}
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistoryItem(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex items-start justify-between gap-3 group hover:scale-[1.01] ${
                      selectedHistoryItem?.id === item.id
                        ? "bg-zinc-800 border-zinc-900 text-white shadow-md"
                        : "bg-white/40 border-white/45 hover:bg-white/50 text-zinc-800 shadow-sm"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                          selectedHistoryItem?.id === item.id
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                            : "bg-white/50 text-zinc-600 border border-white/60"
                        }`}>
                          {item.channel}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className={`text-[11px] font-medium leading-tight truncate ${
                        selectedHistoryItem?.id === item.id ? "text-zinc-250" : "text-zinc-700"
                      }`}>
                        "{item.userPrompt}"
                      </p>
                      <div className={`text-[9px] font-mono flex items-center gap-2 ${
                        selectedHistoryItem?.id === item.id ? "text-zinc-400" : "text-zinc-500"
                      }`}>
                        <span>Recipient: {item.recipientType}</span>
                        <span>•</span>
                        <span>Tone: {item.tone}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistory(item.id, e)}
                      className={`p-1 rounded hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer ${
                        selectedHistoryItem?.id === item.id ? "text-zinc-400 hover:text-white" : "text-zinc-400"
                      }`}
                      title="Delete draft history record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

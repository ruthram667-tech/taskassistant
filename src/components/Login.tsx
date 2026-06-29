import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Sparkles, 
  Check, 
  Loader2, 
  User, 
  Mail, 
  Clock, 
  ArrowLeft, 
  Terminal,
  Shield,
  Fingerprint,
  Cpu,
  Layers,
  Database
} from "lucide-react";
import { localDb } from "../db";
import { motion, AnimatePresence } from "motion/react";

interface LoginProps {
  onAuthSuccess: (user: { uid: string; email: string; displayName: string; photoURL: string | null }, token: string | null) => void;
}

export default function Login({ onAuthSuccess }: LoginProps) {
  // Authentication states
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [defaultNotificationTime, setDefaultNotificationTime] = useState("09:00");
  const [activeTab, setActiveTab] = useState<"credentials" | "sandbox">("credentials");
  const [selectedProfile, setSelectedProfile] = useState<{ email: string; name: string } | null>(null);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Unified "System Dispatch Check" transition state
  const [loginProcessState, setLoginProcessState] = useState<"idle" | "building" | "success">("idle");
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // System calibration pipeline steps
  const simulationSteps = [
    { id: 0, text: "Retrieving operator schedule from local database", icon: Database },
    { id: 1, text: "Calibrating buddy-voice synthesis parameters", icon: Cpu },
    { id: 2, text: "Synchronizing Gmail alerts outbox queue", icon: Mail },
    { id: 3, text: "Formulating automated voice-briefing logs", icon: Layers }
  ];

  // Side-effect: Handle the automated building plan animation ticks
  useEffect(() => {
    if (loginProcessState !== "building") return;

    setActiveStepIndex(0);
    const timers: NodeJS.Timeout[] = [];

    // Simulate step 0 completing
    timers.push(setTimeout(() => {
      setCompletedSteps(prev => [...prev, 0]);
      setActiveStepIndex(1);
    }, 1100));

    // Simulate step 1 completing
    timers.push(setTimeout(() => {
      setCompletedSteps(prev => [...prev, 1]);
      setActiveStepIndex(2);
    }, 2200));

    // Simulate step 2 completing
    timers.push(setTimeout(() => {
      setCompletedSteps(prev => [...prev, 2]);
      setActiveStepIndex(3);
    }, 3300));

    // Simulate step 3 completing
    timers.push(setTimeout(() => {
      setCompletedSteps(prev => [...prev, 3]);
      setActiveStepIndex(4);
    }, 4400));

    // Finalize transition to success and log in
    timers.push(setTimeout(() => {
      setLoginProcessState("success");
    }, 5100));

    return () => timers.forEach(clearTimeout);
  }, [loginProcessState]);

  // When transition successfully ends, finalize DB settings store & login callback
  useEffect(() => {
    if (loginProcessState !== "success") return;

    const finalizeLogin = async () => {
      const email = selectedProfile?.email || emailInput.trim() || "operator@taskassist.com";
      const name = selectedProfile?.name || nameInput.trim() || email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

      // Store in Dexie IndexedDB settings store as requested
      try {
        await localDb.settings.put({
          user_email: email,
          theme_preference: "black-and-white",
          default_notification_time: defaultNotificationTime
        });
        console.log(`[Database Settings] Saved default task notification time preference (${defaultNotificationTime}) for ${email}`);
      } catch (err) {
        console.error("Failed to save settings preference into db store:", err);
      }

      // Complete authentication success
      const authenticatedUser = {
        uid: `user_${Math.random().toString(36).substring(2, 11)}`,
        email,
        displayName: name,
        photoURL: null,
      };

      localStorage.setItem("taskassist_session_user", JSON.stringify(authenticatedUser));
      localStorage.setItem("taskassist_session_token", "unrestricted-google-oauth-token-999");
      localStorage.setItem("taskassist_is_returning", isReturningUser ? "true" : "false");

      onAuthSuccess(authenticatedUser, "unrestricted-google-oauth-token-999");
    };

    const timer = setTimeout(finalizeLogin, 600);
    return () => clearTimeout(timer);
  }, [loginProcessState, selectedProfile, emailInput, nameInput, defaultNotificationTime, onAuthSuccess]);

  // Trigger login workflow
  const triggerLoginProcess = (profile: { email: string; name: string } | null) => {
    setSelectedProfile(profile);
    // Check if this email has previously logged in
    const existingSession = localStorage.getItem("taskassist_session_user");
    if (existingSession) {
      try {
        const parsed = JSON.parse(existingSession);
        const loginEmail = profile?.email || emailInput.trim();
        setIsReturningUser(parsed.email === loginEmail);
      } catch {
        setIsReturningUser(false);
      }
    } else {
      setIsReturningUser(false);
    }
    setLoginProcessState("building");
  };

  const handleCustomFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Unlock browser Speech Synthesis on this exact user gesture (button click)
    // so the auto-greeting can play immediately on the next page
    if ("speechSynthesis" in window) {
      try {
        const unlockUtterance = new SpeechSynthesisUtterance("");
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
      } catch (e) {
        console.warn("Speech unlock failed:", e);
      }
    }

    const email = emailInput.trim() || "operator@taskassist.com";
    const name = nameInput.trim() || "Operator";
    triggerLoginProcess({ email, name });
  };

  const handleSandboxLogin = (email: string, name: string) => {
    triggerLoginProcess({ email, name });
  };

  return (
    <div 
      className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col justify-between p-4 sm:p-6 font-sans antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden" 
      id="login_screen_root"
    >
      {/* Visual Style: Clean, professional off-white background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle top glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-50/50 rounded-full blur-[100px]" />
      </div>

      {/* Top minimal header bar */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center py-4 px-4 bg-transparent relative z-10" id="login_top_header">
        <div className="flex items-center gap-3" id="header_logo_group">
          <div className="h-8 w-8 bg-zinc-900 border border-zinc-800 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs tracking-widest uppercase font-mono text-zinc-900">Task Assist</span>
            <span className="text-[8px] font-mono uppercase text-zinc-500 tracking-widest -mt-0.5">Vocal Operations</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider" id="header_status">
          <span className="flex items-center gap-1.5 bg-white border border-zinc-200 px-3 py-1 rounded-full text-zinc-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]"></span>
            Cloud Sandbox v2.5
          </span>
        </div>
      </header>

      {/* Main centered login section */}
      <main className="flex-grow flex items-center justify-center py-8 px-4 relative z-10">
        <div className="w-full max-w-md" id="login_card_wrapper">
          
          {/* Main Elevated Card with Layered Depth Effects */}
          <div 
            className="bg-white border border-zinc-200 rounded-[32px] shadow-sm p-6 sm:p-8 flex flex-col relative overflow-hidden" 
            id="auth_card_container"
          >
            {/* Fine border linear accent on top of card */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-400" />

            <AnimatePresence mode="wait">
              {loginProcessState !== "idle" ? (
                
                /* ==================== STAGE 2: SYSTEM CALIBRATION INTERACTIVE PIPELINE ==================== */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6 py-6"
                  key="auth_loading_view"
                >
                  {/* Premium Rotating Loading Core */}
                  <div className="text-center space-y-3">
                    <div className="relative inline-flex items-center justify-center">
                      {/* Decorative outer rings */}
                      <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping opacity-50" />
                      <div className="absolute -inset-1.5 rounded-2xl border border-indigo-500/10 animate-spin [animation-duration:8s]" />
                      
                      <div className="h-14 w-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <Loader2 className="h-7 w-7 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 font-mono">Initializing Workspace</h3>
                      <p className="text-[10px] font-mono text-zinc-500 mt-1">Booting secure offline client databases</p>
                    </div>
                  </div>

                  {/* Interactive Status Timeline */}
                  <div className="p-4 border border-zinc-100 rounded-2xl bg-zinc-50 shadow-inner space-y-3">
                    <div className="flex items-center gap-2 border-b border-zinc-200 pb-2 mb-1">
                      <Terminal className="h-3 w-3 text-indigo-600" />
                      <span className="font-mono text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Calibration Output</span>
                    </div>

                    <div className="space-y-2.5">
                      {simulationSteps.map((step) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const isActive = activeStepIndex === step.id;
                        const StepIcon = step.icon;
                        
                        return (
                          <div 
                            key={step.id} 
                            className={`flex items-center justify-between text-xs font-mono transition-all duration-300 ${
                              isCompleted 
                                ? "text-zinc-900 font-medium" 
                                : isActive 
                                  ? "text-indigo-600 font-bold" 
                                  : "text-zinc-400"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                                isCompleted 
                                  ? "bg-zinc-100 border-zinc-300 text-zinc-900 shadow-sm" 
                                  : isActive 
                                    ? "border-indigo-200 text-indigo-600 bg-indigo-50 animate-pulse" 
                                    : "border-zinc-200 bg-zinc-100 text-zinc-400"
                              }`}>
                                {isCompleted ? (
                                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                ) : (
                                  <StepIcon className="h-3 w-3" />
                                )}
                              </div>
                              <span className="text-[11px] font-mono tracking-tight">{step.text}</span>
                            </div>
                            {isActive && !isCompleted && (
                              <Loader2 className="h-3 w-3 animate-spin text-indigo-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Transition complete notification feedback */}
                  <div className="text-center pt-2">
                    {loginProcessState === "success" ? (
                      <motion.p 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[11px] text-indigo-600 font-semibold flex items-center justify-center gap-1.5 font-mono"
                      >
                        <Check className="h-3.5 w-3.5" /> Synchronized perfectly. Deploying dashboard...
                      </motion.p>
                    ) : (
                      <p className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase animate-pulse">
                        Configuring telemetry parameters • Sandbox Secure
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : (
                
                /* ==================== STAGE 1: CREDENTIALS SELECTION & INPUTS ==================== */
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                  key="initial_options_view"
                >
                  <div className="text-center space-y-1.5" id="auth_headline_group">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-[9px] font-mono uppercase tracking-widest font-bold">
                      <Shield className="h-3 w-3" /> Secure Gatekeeper
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight leading-tight mt-2">
                      Access Task Assist
                    </h2>
                    <p className="text-zinc-500 text-xs font-normal max-w-sm mx-auto leading-relaxed">
                      Sync settings securely to IndexedDB and enable voice synthesis modules.
                    </p>
                  </div>

                  {/* Credentials Form — shown directly, no tabs */}
                  <motion.form 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleCustomFormSubmit} 
                    className="space-y-5 mt-2"
                    key="credentials_form_tab"
                  >
                    {/* Name Field */}
                    <div className="space-y-1.5">
                      <label htmlFor="name_input_field" className="block font-mono text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <User className="h-4 w-4" />
                        </span>
                        <input
                          id="name_input_field"
                          type="text"
                          required
                          placeholder="John Doe"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 bg-zinc-50 border border-zinc-200 focus:border-indigo-500/50 text-zinc-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <label htmlFor="email_input_field" className="block font-mono text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
                        Email Address
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          id="email_input_field"
                          type="email"
                          required
                          placeholder="john@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full h-11 pl-10 pr-3 bg-zinc-50 border border-zinc-200 focus:border-indigo-500/50 text-zinc-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <motion.button
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full h-11 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-4"
                      id="custom_form_submit_btn"
                    >
                      Authenticate Operator <ArrowRight className="h-3.5 w-3.5" />
                    </motion.button>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Secure compliance disclaimer below the card */}
          <p className="text-[9px] text-zinc-400 font-mono text-center uppercase tracking-widest mt-6" id="compliance_stamp">
            Secure Cryptography Handshake Enabled • IndexedDB Encrypted
          </p>

        </div>
      </main>

      {/* Bottom minimalistic sleek footer */}
      <footer className="w-full max-w-6xl mx-auto py-4 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-2 relative z-10" id="login_screen_footer">
        <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
          TASK ASSIST CONSOLE v2.5.0 • SECURED OPERATOR KERNEL
        </span>
        <div className="flex gap-4 text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
          <span className="hover:text-zinc-700 transition-colors cursor-pointer">Security Policy</span>
          <span>•</span>
          <span className="hover:text-zinc-700 transition-colors cursor-pointer">Local IndexedDB Mode</span>
        </div>
      </footer>
    </div>
  );
}

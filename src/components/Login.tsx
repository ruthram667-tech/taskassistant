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
    const email = emailInput.trim() || "operator@taskassist.com";
    const name = nameInput.trim() || "Operator";
    triggerLoginProcess({ email, name });
  };

  const handleSandboxLogin = (email: string, name: string) => {
    triggerLoginProcess({ email, name });
  };

  return (
    <div 
      className="min-h-screen bg-[#06080c] text-white flex flex-col justify-between p-4 sm:p-6 font-sans antialiased selection:bg-emerald-500 selection:text-zinc-950 relative overflow-hidden" 
      id="login_screen_root"
    >
      {/* Visual Style: Rich ambient background with floating animated blur blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Neon Purple/Indigo Orb */}
        <motion.div 
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -50, 30, 0],
            scale: [1, 1.15, 0.9, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px]"
        />
        
        {/* Neon Emerald/Cyan Orb */}
        <motion.div 
          animate={{
            x: [0, -60, 40, 0],
            y: [0, 40, -50, 0],
            scale: [1, 0.9, 1.1, 1]
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-40 -right-40 w-[650px] h-[650px] bg-emerald-500/10 rounded-full blur-[150px]"
        />

        {/* Coral/Amber Soft Ambient Light */}
        <motion.div 
          animate={{
            x: [0, 30, -30, 0],
            y: [0, 30, 20, 0],
            scale: [1, 1.05, 0.95, 1]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          className="absolute top-[30%] left-[25%] w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]"
        />
      </div>

      {/* Top minimal header bar with glowing separator */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center py-4 px-4 bg-transparent relative z-10" id="login_top_header">
        <div className="flex items-center gap-3" id="header_logo_group">
          <div className="h-8 w-8 bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 rounded-xl flex items-center justify-center font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            T
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs tracking-widest uppercase font-mono bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Task Assist</span>
            <span className="text-[8px] font-mono uppercase text-emerald-400/80 tracking-widest -mt-0.5">Vocal Operations</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider" id="header_status">
          <span className="flex items-center gap-1.5 bg-zinc-900/40 backdrop-blur-md border border-white/5 px-3 py-1 rounded-full text-zinc-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            Cloud Sandbox v2.5
          </span>
        </div>
      </header>

      {/* Main centered glassmorphic login section */}
      <main className="flex-grow flex items-center justify-center py-8 px-4 relative z-10">
        <div className="w-full max-w-md" id="login_card_wrapper">
          
          {/* Main Elevated Card with Layered Depth Effects */}
          <div 
            className="bg-zinc-950/40 border border-white/10 backdrop-blur-xl rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.05)] p-6 sm:p-8 flex flex-col relative overflow-hidden" 
            id="auth_card_container"
          >
            {/* Fine border linear accent on top of card */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

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
                      {/* Decorative outer neon rings */}
                      <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-30" />
                      <div className="absolute -inset-1.5 rounded-2xl border border-teal-500/10 animate-spin [animation-duration:8s]" />
                      
                      <div className="h-14 w-14 bg-zinc-900/60 border border-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                        <Loader2 className="h-7 w-7 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">Initializing Workspace</h3>
                      <p className="text-[10px] font-mono text-zinc-400 mt-1">Booting secure offline client databases</p>
                    </div>
                  </div>

                  {/* Interactive Status Timeline */}
                  <div className="p-4 border border-white/5 rounded-2xl bg-zinc-950/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] space-y-3">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-1">
                      <Terminal className="h-3 w-3 text-emerald-400" />
                      <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Calibration Output</span>
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
                                ? "text-emerald-400/90" 
                                : isActive 
                                  ? "text-teal-300 font-bold drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]" 
                                  : "text-zinc-500"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                                isCompleted 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                                  : isActive 
                                    ? "border-teal-400 text-teal-300 bg-teal-950/30 animate-pulse" 
                                    : "border-white/5 bg-zinc-900/40 text-zinc-500"
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
                              <Loader2 className="h-3 w-3 animate-spin text-teal-400 shrink-0" />
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
                        className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1.5 font-mono"
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
                  {/* Heading & Subheading */}
                  <div className="text-center space-y-1.5" id="auth_headline_group">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-[9px] font-mono uppercase tracking-widest font-semibold">
                      <Shield className="h-3 w-3" /> Secure Gatekeeper
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                      Access Task Assist
                    </h2>
                    <p className="text-zinc-400 text-xs font-normal max-w-sm mx-auto leading-relaxed">
                      Sync settings securely to IndexedDB and enable voice synthesis modules.
                    </p>
                  </div>

                  {/* Segmented Tab Selector */}
                  <div className="flex bg-zinc-950/80 p-1 rounded-2xl border border-white/5 shadow-inner" id="segmented_tab_bar">
                    <button
                      type="button"
                      onClick={() => setActiveTab("credentials")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === "credentials" 
                          ? "bg-white/10 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-white/5" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      Custom Operator
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("sandbox")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === "sandbox" 
                          ? "bg-white/10 text-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-white/5" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Fingerprint className="h-3.5 w-3.5" />
                      One-Click Sandbox
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === "credentials" ? (
                      
                      /* CUSTOM CREDENTIALS INPUT FORM */
                      <motion.form 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handleCustomFormSubmit} 
                        className="space-y-4"
                        key="credentials_form_tab"
                      >
                        {/* Name Field */}
                        <div className="space-y-1">
                          <label htmlFor="name_input_field" className="block font-mono text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                            Full Name
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                              <User className="h-4 w-4" />
                            </span>
                            <input
                              id="name_input_field"
                              type="text"
                              required
                              placeholder="John Doe"
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              className="w-full h-11 pl-9 pr-3 bg-white/5 border border-white/10 focus:border-emerald-500/40 text-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] placeholder-zinc-500"
                            />
                          </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1">
                          <label htmlFor="email_input_field" className="block font-mono text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                            Email Address
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                              <Mail className="h-4 w-4" />
                            </span>
                            <input
                              id="email_input_field"
                              type="email"
                              required
                              placeholder="john@example.com"
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              className="w-full h-11 pl-9 pr-3 bg-white/5 border border-white/10 focus:border-emerald-500/40 text-white text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] placeholder-zinc-500"
                            />
                          </div>
                        </div>

                        {/* Task Notification Alarm preference field */}
                        <div className="p-4 border border-white/5 rounded-2xl bg-zinc-950/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]" id="auth_notification_setting_box">
                          <label htmlFor="auth_time_pref" className="block font-mono text-[9px] uppercase font-bold text-zinc-400 mb-2 flex items-center gap-1.5 tracking-wider">
                            <Clock className="h-3.5 w-3.5 text-emerald-400" />
                            Alert Time Preference
                          </label>
                          <input
                            id="auth_time_pref"
                            type="time"
                            value={defaultNotificationTime}
                            onChange={(e) => setDefaultNotificationTime(e.target.value)}
                            className="w-full h-10 px-3 bg-white/5 border border-white/10 text-white text-xs font-mono rounded-xl focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-sm"
                          />
                          <span className="text-[8px] font-mono text-zinc-500 block mt-1.5 leading-normal">
                            Fires alarms automatically using our offline Service Worker.
                          </span>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] mt-2"
                          id="custom_form_submit_btn"
                        >
                          Authenticate Operator <ArrowRight className="h-3.5 w-3.5" />
                        </motion.button>
                      </motion.form>
                    ) : (
                      
                      /* ONE-CLICK SANDBOX SELECTOR FOR QUICK TESTING */
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                        key="sandbox_selector_tab"
                      >
                        <div className="space-y-1 mb-2">
                          <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">Available Sandbox Profiles</span>
                          <p className="text-[10px] text-zinc-500 leading-normal">Instantly boot into a pre-configured developer profile with standard tasks seeded.</p>
                        </div>

                        {[
                          { name: "John Operator", email: "john132@mail.com", role: "Principal Engineer", avatarColor: "from-blue-500 to-indigo-400" },
                          { name: "Sarah Specialist", email: "sarah_task@gmail.com", role: "Product Coordinator", avatarColor: "from-purple-500 to-pink-500" },
                          { name: "Alex Admin", email: "alex_workspace@admin.com", role: "System Administrator", avatarColor: "from-emerald-500 to-teal-400" }
                        ].map((profile) => (
                          <motion.button
                            key={profile.email}
                            whileHover={{ scale: 1.015, x: 2 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => handleSandboxLogin(profile.email, profile.name)}
                            className="w-full p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer group shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${profile.avatarColor} text-zinc-950 font-bold text-xs flex items-center justify-center shrink-0`}>
                                {profile.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{profile.name}</span>
                                <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{profile.email}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end text-right">
                              <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">{profile.role}</span>
                              <span className="text-[10px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity font-mono mt-1 flex items-center gap-1">
                                BOOT <ArrowRight className="h-3 w-3" />
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Secure compliance disclaimer below the card */}
          <p className="text-[9px] text-zinc-500 font-mono text-center uppercase tracking-widest mt-6" id="compliance_stamp">
            Secure Cryptography Handshake Enabled • IndexedDB Encrypted
          </p>

        </div>
      </main>

      {/* Bottom minimalistic sleek footer with separation */}
      <footer className="w-full max-w-6xl mx-auto py-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-2 relative z-10" id="login_screen_footer">
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
          TASK ASSIST CONSOLE v2.5.0 • SECURED OPERATOR KERNEL
        </span>
        <div className="flex gap-4 text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
          <span className="hover:text-white transition-colors cursor-pointer">Security Policy</span>
          <span>•</span>
          <span className="hover:text-white transition-colors cursor-pointer">Local IndexedDB Mode</span>
        </div>
      </footer>
    </div>
  );
}

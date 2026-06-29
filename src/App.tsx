import { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import RequestPermission from "./components/RequestPermission";
import CallOverlay from "./components/CallOverlay";
import SuperAdmin from "./components/SuperAdmin";
import { localDb } from "./db";

// ── Secret Admin Email ────────────────────────────────────────────────
// When this exact email is entered on the login page, the user bypasses
// the dashboard and lands directly on the SuperAdmin analytics panel.
const ADMIN_EMAIL = "admin@taskassist.com";

export interface LoggedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export default function App() {
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ taskId: string, title: string, tier: number, state: "ringing" | "connected" } | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "INCOMING_CALL") {
        setIncomingCall({ taskId: data.taskId, title: data.title, tier: data.tier, state: "ringing" });
      } else if (data.type === "ANSWER_CALL") {
        setIncomingCall(prev => prev ? { ...prev, state: "connected" } : null);
      } else if (data.type === "STOP_CALL_SOUND") {
        // Handled by CallOverlay unmounting or state change, but we can force dismiss if needed
        // setIncomingCall(null);
      } else if (data.type === "TASK_UPDATED") {
        window.dispatchEvent(new CustomEvent("task_db_updated"));
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, []);

  useEffect(() => {
    // Check localStorage for an active session
    try {
      const savedUser = localStorage.getItem("taskassist_session_user");
      const savedToken = localStorage.getItem("taskassist_session_token");
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.email.toLowerCase().trim() === ADMIN_EMAIL) {
          setIsAdmin(true);
        }
        if (savedToken) {
          setGoogleToken(savedToken);
        }
      }
    } catch (err) {
      console.error("Failed to restore session from localStorage:", err);
    } finally {
      setAuthInitialized(true);
    }
  }, []);

  const handleAuthSuccess = (currentUser: LoggedUser, token: string | null) => {
    setUser(currentUser);
    setGoogleToken(token);

    // ── Check if this is the secret admin login ────────────────────────────
    if (currentUser.email.toLowerCase().trim() === ADMIN_EMAIL) {
      setIsAdmin(true);
      return; // Skip session recording for admin
    }

    // ── Record session start for regular users ───────────────────────────
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionRecord = {
      id: sessionId,
      email: currentUser.email,
      displayName: currentUser.displayName,
      loginTime: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
      device: navigator.userAgent.includes("Mobile") ? "📱 Mobile" : "🖥️ Desktop",
    };
    // Save session to list
    const prev = JSON.parse(localStorage.getItem("taskassist_admin_sessions") || "[]");
    prev.push(sessionRecord);
    localStorage.setItem("taskassist_admin_sessions", JSON.stringify(prev));
    // Remember current session ID to update on logout
    localStorage.setItem("taskassist_current_session_id", sessionId);
    localStorage.setItem("taskassist_session_start", Date.now().toString());
  };

  const handleLogout = () => {
    // ── Record session end ────────────────────────────────────────────────
    const sessionId = localStorage.getItem("taskassist_current_session_id");
    const sessionStart = parseInt(localStorage.getItem("taskassist_session_start") || "0");
    if (sessionId && sessionStart) {
      const durationMs = Date.now() - sessionStart;
      const sessions = JSON.parse(localStorage.getItem("taskassist_admin_sessions") || "[]");
      const idx = sessions.findIndex((s: any) => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx].logoutTime = new Date().toISOString();
        sessions[idx].durationMs = durationMs;
        localStorage.setItem("taskassist_admin_sessions", JSON.stringify(sessions));
      }
    }
    localStorage.removeItem("taskassist_session_user");
    localStorage.removeItem("taskassist_session_token");
    localStorage.removeItem("taskassist_current_session_id");
    localStorage.removeItem("taskassist_session_start");
    sessionStorage.removeItem("taskassist_greeted"); // Reset greeting so it plays on next login
    setUser(null);
    setGoogleToken(null);
    setIsAdmin(false);
  };

  // Also record session duration when user closes the tab
  useEffect(() => {
    const onUnload = () => {
      const sessionId = localStorage.getItem("taskassist_current_session_id");
      const sessionStart = parseInt(localStorage.getItem("taskassist_session_start") || "0");
      if (sessionId && sessionStart) {
        const durationMs = Date.now() - sessionStart;
        const sessions = JSON.parse(localStorage.getItem("taskassist_admin_sessions") || "[]");
        const idx = sessions.findIndex((s: any) => s.id === sessionId);
        if (idx !== -1 && !sessions[idx].durationMs) {
          sessions[idx].logoutTime = new Date().toISOString();
          sessions[idx].durationMs = durationMs;
          localStorage.setItem("taskassist_admin_sessions", JSON.stringify(sessions));
        }
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const handleDismissCall = async (action: "completed" | "missed") => {
    if (incomingCall && action === "completed") {
      try {
        await localDb.tasks.update(incomingCall.taskId, { status: "completed" });
        window.dispatchEvent(new CustomEvent("task_db_updated"));
      } catch (e) { console.error(e); }
    }
    setIncomingCall(null);
  };

  // ── Secret SuperAdmin route: go to /#admin OR login with admin email ──────
  if (window.location.hash === "#admin" || isAdmin) {
    return <SuperAdmin onSignOut={handleLogout} isDirectLogin={isAdmin} />;
  }

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans space-y-3">
        <div className="w-8 h-8 border border-black border-t-transparent animate-spin"></div>
        <span className="text-[10px] font-mono text-zinc-600 tracking-wider">BOOTING TASK ASSIST SYSTEM...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#F3F7F5] min-h-screen text-black antialiased selection:bg-black selection:text-white">
      {incomingCall && (
        <CallOverlay 
          taskId={incomingCall.taskId} 
          title={incomingCall.title} 
          tier={incomingCall.tier} 
          initialState={incomingCall.state}
          onDismiss={handleDismissCall} 
        />
      )}

      {user ? (
        <>
          <RequestPermission />
          <Dashboard user={user as any} googleToken={googleToken} onLogout={handleLogout} />
        </>
      ) : (
        <Login onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

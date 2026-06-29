import { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import RequestPermission from "./components/RequestPermission";
import CallOverlay from "./components/CallOverlay";
import { localDb } from "./db";

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
        setUser(JSON.parse(savedUser));
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
  };

  const handleLogout = () => {
    localStorage.removeItem("taskassist_session_user");
    localStorage.removeItem("taskassist_session_token");
    setUser(null);
    setGoogleToken(null);
  };

  const handleDismissCall = async (action: "completed" | "missed") => {
    if (incomingCall && action === "completed") {
      try {
        await localDb.tasks.update(incomingCall.taskId, { status: "completed" });
        window.dispatchEvent(new CustomEvent("task_db_updated"));
      } catch (e) { console.error(e); }
    }
    setIncomingCall(null);
  };

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

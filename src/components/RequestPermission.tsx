import { useState, useEffect } from "react";
import { Bell, ShieldAlert, Volume2, Check } from "lucide-react";

export default function RequestPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<PermissionState | "default">(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show prompt if notification permission is not granted and hasn't been dismissed in this session
    if ("Notification" in window) {
      if (Notification.permission !== "granted") {
        const dismissed = sessionStorage.getItem("taskassist_perm_dismissed");
        if (!dismissed) {
          setShowPrompt(true);
        }
      } else {
        // If already granted, register service worker silently
        registerServiceWorker();
      }
    }
  }, []);

  const registerServiceWorker = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully with scope:", reg.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  };

  const handleGrantPermissions = async () => {
    setLoading(true);
    try {
      // 1. Request Notification Permission
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        setNotificationStatus(permission);
        if (permission === "granted") {
          registerServiceWorker();
        }
      }

      // 2. Unlock Audio Autoplay using Web Audio API (User gesture unlocks sound)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(600, audioCtx.currentTime); // Quick, pleasant sound
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
        setAudioUnlocked(true);
      }
      
      // 3. Request Persistent Storage
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persist();
        console.log("Persistent storage granted:", persisted);
      }
    } catch (err) {
      console.error("Failed to request permission or play test chime:", err);
    } finally {
      setLoading(false);
      // Give a tiny delay for visual satisfaction, then close
      setTimeout(() => {
        setShowPrompt(false);
        sessionStorage.setItem("taskassist_perm_dismissed", "true");
      }, 1000);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("taskassist_perm_dismissed", "true");
    // Register SW anyway as fallback for other background tasks
    registerServiceWorker();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[9999] flex items-center justify-center p-4" id="permission_overlay">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-6 animate-fade-in" id="permission_modal">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20 shadow-sm">
            <Bell className="h-6 w-6 text-emerald-600 animate-bounce" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900">Configure Alarm System</h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Task Assist Service Worker</p>
          </div>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          Task Assist uses a local background Service Worker that operates even when your software is closed. To function like a phone alarm, it requires authorization to trigger sound and dispatch alerts.
        </p>

        <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-150 shadow-inner">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-zinc-900 block leading-tight">Browser Notifications</span>
              <span className="text-[10px] text-zinc-500 leading-normal block">Dispatches persistent call alerts and alarms to your desktop environment offline.</span>
            </div>
          </div>
          <div className="flex items-start gap-3 border-t border-zinc-200/60 pt-3">
            <Volume2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-zinc-900 block leading-tight">Persistent Storage & Audio</span>
              <span className="text-[10px] text-zinc-500 leading-normal block">Enables high-frequency alarms and allows tasks to be reliably stored offline without eviction.</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
            id="dismiss_permission_btn"
          >
            Later
          </button>
          <button
            onClick={handleGrantPermissions}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-550 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
            id="grant_permission_btn"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : audioUnlocked && notificationStatus === "granted" ? (
              <>
                <Check className="h-4 w-4" /> Configured!
              </>
            ) : (
              "Allow Alarms"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

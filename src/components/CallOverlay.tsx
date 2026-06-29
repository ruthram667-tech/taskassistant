import React, { useEffect, useState, useRef } from "react";
import { Phone, Volume2, Mic, MicOff, PhoneOff } from "lucide-react";

interface CallOverlayProps {
  taskId: string;
  title: string;
  tier: number;
  initialState: "ringing" | "connected";
  onDismiss: (action: "completed" | "missed") => void;
}

export default function CallOverlay({ taskId, title, tier, initialState, onDismiss }: CallOverlayProps) {
  const [callState, setCallState] = useState<"ringing" | "connected" | "ended">(initialState);
  const [script, setScript] = useState("Consulting automated operator node...");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (callState === "ringing") {
      playRingtone();
    } else if (callState === "connected") {
      stopRingtone();
      simulateSpeech();
    }
    return () => {
      stopRingtone();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [callState]);

  const playRingtone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      let isBeep = true;
      intervalRef.current = setInterval(() => {
        if (!audioCtxRef.current) return;
        if (isBeep) {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = "sine";
          // Retro phone frequencies
          osc.frequency.setValueAtTime(440, audioCtxRef.current.currentTime);
          osc.frequency.setValueAtTime(480, audioCtxRef.current.currentTime + 0.1);
          
          gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
          gain.gain.linearRampToValueAtTime(0.4, audioCtxRef.current.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 1.5);
          
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 1.6);
        }
        isBeep = !isBeep;
      }, 2000);
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const stopRingtone = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch(e) {}
      audioCtxRef.current = null;
    }
  };

  const simulateSpeech = () => {
    const text = `This is a Tier ${tier} alert for task: ${title}. Please address this immediately to maintain system compliance.`;
    setScript(text);
    setIsSynthesizing(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.0;
      utterance.rate = 0.95;
      utterance.onend = () => {
        setIsSynthesizing(false);
      };
      utterance.onerror = () => setIsSynthesizing(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsSynthesizing(false), 4000);
    }
  };

  const handleAnswer = () => {
    setCallState("connected");
  };

  const handleEnd = (completed: boolean) => {
    setCallState("ended");
    stopRingtone();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setTimeout(() => onDismiss(completed ? "completed" : "missed"), 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[99999] p-4 font-sans animate-fade-in" id="global_call_overlay">
      <div className="w-full max-w-sm bg-white/10 border border-white/20 backdrop-blur-2xl rounded-[40px] p-8 flex flex-col items-center justify-between text-center min-h-[550px] shadow-2xl relative overflow-hidden">
        {/* Dynamic Gradient based on Tier */}
        <div className={`absolute top-0 left-0 w-full h-1.5 ${tier === 3 ? 'bg-red-500' : tier === 2 ? 'bg-orange-500' : 'bg-emerald-500'} animate-pulse`}></div>
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>

        {/* Header Status */}
        <div className="space-y-3 mt-6 relative z-10">
          <span className={`text-[10px] font-bold font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border ${callState === 'ringing' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 animate-pulse' : 'text-sky-400 bg-sky-400/10 border-sky-400/20'}`}>
            {callState === "ringing" ? "System Call Incoming" : callState === "connected" ? "Connection Active" : "Call Ended"}
          </span>
          <h3 className="text-2xl font-black text-white tracking-tight mt-2 px-4 leading-tight">{title}</h3>
          <p className="text-xs text-white/50 font-mono uppercase">Tier {tier} Escalation</p>
        </div>

        {/* Visualizer Center */}
        <div className="my-12 flex items-center justify-center relative z-10">
          {callState === "ringing" ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-emerald-500/20 border border-emerald-500/30 rounded-full animate-ping"></div>
              <div className="absolute w-24 h-24 bg-emerald-500/20 border border-emerald-500/40 rounded-full animate-pulse"></div>
              <div className="bg-gradient-to-tr from-emerald-600 to-emerald-400 p-6 rounded-full shadow-lg shadow-emerald-500/30">
                <Phone className="h-10 w-10 text-white animate-bounce" />
              </div>
            </div>
          ) : callState === "connected" ? (
            <div className="flex items-center gap-2 h-16">
              {[...Array(7)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-2 bg-sky-400 rounded-full animate-bounce" 
                  style={{ 
                    height: `${Math.max(20, Math.random() * 64)}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.8s'
                  }}>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/10 p-6 rounded-full">
              <PhoneOff className="h-10 w-10 text-white/40" />
            </div>
          )}
        </div>

        {/* Script / Context */}
        <div className="w-full text-left bg-black/20 border border-white/10 rounded-2xl p-4 min-h-[100px] flex flex-col justify-center relative z-10">
          {callState === "ringing" ? (
            <p className="text-sm text-white/70 italic text-center w-full">Awaiting operator response...</p>
          ) : (
            <>
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-400 mb-1 flex items-center gap-1.5">
                <Mic className="h-3 w-3" /> Transcribing
              </span>
              <p className="text-xs text-white/90 leading-relaxed font-medium">"{script}"</p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 w-full mt-8 relative z-10">
          {callState === "ringing" ? (
            <>
              <button 
                onClick={() => handleEnd(false)}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-100 font-bold py-4 rounded-2xl text-xs transition-all"
              >
                Decline
              </button>
              <button 
                onClick={handleAnswer}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:-translate-y-1"
              >
                Accept
              </button>
            </>
          ) : (
            <div className="flex w-full gap-3">
              <button 
                onClick={() => handleEnd(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-4 rounded-2xl text-xs transition-all"
              >
                Hang up
              </button>
              <button 
                onClick={() => handleEnd(true)}
                className="flex-[2] bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-2xl text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.4)]"
              >
                Mark Task Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

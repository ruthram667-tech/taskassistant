import React from "react";
import { Shield, Mail, Phone, Calendar, Sparkles, HelpCircle } from "lucide-react";

export default function HelpPanel() {
  const faqs = [
    {
      icon: <Sparkles className="h-4 w-4 text-emerald-600" />,
      q: "How do tips work?",
      a: "Gemini looks at your tasks and suggests customized tips."
    },
    {
      icon: <Calendar className="h-4 w-4 text-emerald-600" />,
      q: "How does Calendar sync work?",
      a: "We check your Google Calendar to see if any tasks overlap with events."
    },
    {
      icon: <Phone className="h-4 w-4 text-emerald-600" />,
      q: "How do phone alerts work?",
      a: "If a task is late, you get a call. When you answer, we read an alert using text-to-speech."
    },
    {
      icon: <Mail className="h-4 w-4 text-emerald-600" />,
      q: "Are emails sent from my real address?",
      a: "Yes, if you sign in with Google, we send real emails through your Gmail account."
    }
  ];

  return (
    <div className="space-y-6 font-sans text-zinc-800" id="help_panel">
      {/* Title */}
      <div className="glass-card rounded-2xl p-6 shadow-md animate-fade-in" id="help_header">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          Help & FAQ
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Guides and common questions.</p>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="faqs_grid">
        {faqs.map((faq, idx) => (
          <div key={idx} className="glass-card rounded-xl p-5 space-y-2.5 hover:bg-white/50 transition-all shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-white/20 pb-2">
              <div className="bg-white/40 p-1.5 rounded-lg border border-white/45 shadow-sm">
                {faq.icon}
              </div>
              <h4 className="text-xs font-bold text-zinc-900 tracking-tight">{faq.q}</h4>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>

      {/* System Status and Credit */}
      <div className="glass-card rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2 shadow-md backdrop-blur-sm" id="system_status">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">Security</span>
        </div>
        <p className="text-xs text-zinc-500 max-w-lg leading-relaxed mx-auto">
          We use secure storage. Your tokens stay in memory and are never saved to disks or databases.
        </p>
      </div>
    </div>
  );
}

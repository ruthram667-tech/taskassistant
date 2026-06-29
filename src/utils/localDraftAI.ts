/**
 * Local AI Message Drafting Engine
 * Generates professional message variations entirely in the browser.
 * No API key or internet connection required.
 */

interface DraftInput {
  prompt: string;
  recipientType: string;
  channel: string;
  tone: string;
  additionalDetails?: string;
}

interface DraftOutput {
  primary: string;
  short: string;
  formal: string;
}

// ─── Tone Openers ────────────────────────────────────────────────────────────
const toneOpeners: Record<string, string[]> = {
  "Professional": [
    "I wanted to bring to your attention that",
    "I am writing to inform you that",
    "Please be advised that",
    "I would like to let you know that",
  ],
  "Polite & Respectful": [
    "I hope this message finds you well.",
    "With your kind understanding,",
    "I sincerely appreciate your time.",
    "I humbly wish to inform you that",
  ],
  "Casual/Friendly": [
    "Hey! Just wanted to quickly let you know —",
    "Hi there! Quick heads up —",
    "Just a heads up!",
    "Hey, wanted to reach out because",
  ],
  "Urgent": [
    "URGENT:",
    "Time-sensitive notice:",
    "Immediate attention required:",
    "Please action this immediately —",
  ],
  "Apologetic": [
    "I sincerely apologize, but",
    "I'm truly sorry to inform you that",
    "I regret to let you know that",
    "Please accept my apologies —",
  ],
};

// ─── Channel Closers ──────────────────────────────────────────────────────────
const channelClosers: Record<string, string[]> = {
  "Email": [
    "Thank you for your understanding. Please let me know if you need any further information.",
    "I appreciate your support in this matter. Looking forward to your response.",
    "Kindly revert at your earliest convenience. Thank you.",
  ],
  "Slack/Teams": [
    "Let me know if you need anything! 🙏",
    "Happy to chat more if needed. Thanks!",
    "Ping me anytime. Cheers!",
  ],
  "WhatsApp/SMS": [
    "Thanks for understanding 🙏",
    "Will keep you posted. Thanks!",
    "Appreciate it. Take care!",
  ],
  "General": [
    "Thank you for your understanding.",
    "Please feel free to reach out if you have questions.",
    "I appreciate your support.",
  ],
};

// ─── Recipient Acknowledgements ───────────────────────────────────────────────
const recipientAcks: Record<string, string> = {
  "HOD/Manager": "I understand this may impact our team's schedule, and I will ensure minimal disruption.",
  "Client/Stakeholder": "I value our relationship and will ensure this is handled with the utmost professionalism.",
  "Colleague/Peer": "I know this might affect our shared plans, and I'll make sure to catch up quickly.",
  "Friend/Family": "I know this is short notice and I really appreciate your understanding.",
  "General": "I appreciate your patience and understanding in this matter.",
};

// ─── Helper: Pick random item from array ─────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Helper: Capitalise first letter ─────────────────────────────────────────
function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Helper: Build a clean sentence from user's raw prompt ───────────────────
function cleanPrompt(raw: string): string {
  let cleaned = raw.trim();
  if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
    cleaned += ".";
  }
  return capitalise(cleaned);
}

// ─── Core Drafting Engine ─────────────────────────────────────────────────────
export function generateLocalDraft(input: DraftInput): DraftOutput {
  const { prompt, recipientType, channel, tone, additionalDetails } = input;

  const cleanedPrompt = cleanPrompt(prompt);
  const opener = pick(toneOpeners[tone] || toneOpeners["Professional"]);
  const closer = pick(channelClosers[channel] || channelClosers["General"]);
  const ack = recipientAcks[recipientType] || recipientAcks["General"];
  const extra = additionalDetails?.trim() ? capitalise(additionalDetails.trim()) + "." : "";

  // ── PRIMARY ── Standard, full, channel-appropriate message
  let primary = "";
  if (channel === "Email") {
    primary = [
      opener + " " + cleanedPrompt,
      "",
      ack,
      extra,
      "",
      closer,
    ].filter(Boolean).join("\n");
  } else {
    primary = [
      opener + " " + cleanedPrompt,
      ack,
      extra,
      closer,
    ].filter(Boolean).join(" ");
  }

  // ── SHORT ── 1-2 sentence quick version
  const short = `${opener} ${cleanedPrompt}${extra ? " " + extra : ""} ${pick(channelClosers["WhatsApp/SMS"])}`;

  // ── FORMAL ── Structured, email-style regardless of channel
  const formal = [
    `Dear ${recipientType === "HOD/Manager" ? "Sir/Ma'am" : recipientType === "Client/Stakeholder" ? "Valued Partner" : "Respected Colleague"},`,
    "",
    `I am writing to formally bring to your attention the following matter: ${cleanedPrompt}`,
    "",
    ack,
    extra,
    "",
    "I request your kind consideration and look forward to your understanding.",
    "",
    "Yours sincerely,",
    "[Your Name]"
  ].filter(l => l !== undefined).join("\n");

  return {
    primary: primary.trim(),
    short: short.trim(),
    formal: formal.trim(),
  };
}

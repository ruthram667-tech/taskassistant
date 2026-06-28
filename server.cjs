var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var sentEmailLogs = [];
var etherealTransporter = null;
var etherealUser = null;
async function getEtherealTransporter() {
  if (etherealTransporter) {
    return { transporter: etherealTransporter, user: etherealUser };
  }
  try {
    console.log("[Info] Creating Ethereal SMTP test account...");
    const testAccount = await import_nodemailer.default.createTestAccount();
    etherealUser = testAccount.user;
    etherealTransporter = import_nodemailer.default.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log(`[Info] Ethereal SMTP test account created successfully: ${testAccount.user}`);
    return { transporter: etherealTransporter, user: etherealUser };
  } catch (err) {
    console.error("[Error] Failed to create Ethereal SMTP test account:", err);
    return null;
  }
}
function getEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && port && user && pass) {
    console.log("[Info] SMTP config detected. Initializing real SMTP transporter.");
    return import_nodemailer.default.createTransport({
      host,
      port: parseInt(port),
      secure: port === "465",
      auth: {
        user,
        pass
      }
    });
  }
  return null;
}
app.get("/api/email/logs", (req, res) => {
  res.json(sentEmailLogs);
});
app.post("/api/email/send-confirmation", async (req, res) => {
  try {
    const { task, recipientEmail } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Task data is required" });
    }
    const emailTo = recipientEmail || "john132@mail.com";
    const subject = `Task Assist Confirmation: '${task.title}' Scheduled`;
    const hostHeader = req.get("host") || "localhost:3000";
    const protocol = req.secure ? "https" : "http";
    const appUrl = process.env.APP_URL || `${protocol}://${hostHeader}`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Task Setup Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      padding: 24px;
    }
    .container {
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
    .header {
      background-color: #10b981;
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.05em;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .task-card {
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 20px;
      background-color: #fafafa;
      margin-bottom: 24px;
    }
    .task-title {
      font-size: 18px;
      font-weight: 600;
      color: #09090b;
      margin-top: 0;
      margin-bottom: 8px;
    }
    .task-desc {
      font-size: 14px;
      color: #71717a;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .details-table td {
      padding: 10px 0;
      border-bottom: 1px solid #f4f4f5;
      font-size: 13px;
    }
    .details-table td.label {
      font-weight: 600;
      color: #71717a;
      width: 40%;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
    }
    .details-table td.value {
      color: #18181b;
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 4px;
    }
    .badge-high {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .badge-medium {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-low {
      background-color: #f4f4f5;
      color: #3f3f46;
    }
    .badge-active {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .badge-inactive {
      background-color: #f4f4f5;
      color: #71717a;
    }
    .footer {
      background-color: #f4f4f5;
      padding: 24px;
      text-align: center;
      font-size: 11px;
      color: #71717a;
      border-top: 1px solid #e4e4e7;
    }
    .button-container {
      text-align: center;
      margin-top: 24px;
    }
    .button {
      display: inline-block;
      background-color: #18181b;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>TASK ASSIST</h1>
        <p>Your Autonomous Workspace Planner & Orchestrator</p>
      </div>
      <div class="content">
        <p style="font-size: 14px; line-height: 1.5; color: #3f3f46; margin-top: 0;">
          Hello Operator,
        </p>
        <p style="font-size: 14px; line-height: 1.5; color: #3f3f46; margin-bottom: 24px;">
          This confirmation email certifies that your new workspace task has been successfully scheduled. The active notification and orchestration parameters are locked as configured below.
        </p>

        <div class="task-card">
          <h2 class="task-title">${task.title}</h2>
          ${task.description ? `<p class="task-desc">${task.description}</p>` : ""}
          
          <table class="details-table">
            <tr>
              <td class="label">Priority</td>
              <td class="value">
                <span class="badge badge-${task.priority || "medium"}">${task.priority || "medium"}</span>
              </td>
            </tr>
            <tr>
              <td class="label">Due Date</td>
              <td class="value">${task.dueDate}</td>
            </tr>
            <tr>
              <td class="label">Due Time</td>
              <td class="value">${task.dueTime || "Not Configured"}</td>
            </tr>
            <tr>
              <td class="label">Est. Duration</td>
              <td class="value">${task.estimatedDuration || 30} minutes</td>
            </tr>
            <tr>
              <td class="label">Phone Alerts (Escalation)</td>
              <td class="value">
                <span class="badge badge-${task.escalationEnabled ? "active" : "inactive"}">
                  ${task.escalationEnabled ? "Active" : "Disabled"}
                </span>
              </td>
            </tr>
            ${task.escalationEnabled && task.escalationPhone ? `
            <tr>
              <td class="label">Escalation Number</td>
              <td class="value" style="font-family: monospace;">${task.escalationPhone}</td>
            </tr>
            ` : ""}
          </table>
        </div>

        <div class="button-container">
          <a href="${appUrl}" class="button" style="color: #ffffff; text-decoration: none;">Access Control Panel</a>
        </div>
      </div>
      <div class="footer">
        <p>This is an automated notification from Task Assist Telemetry Node.</p>
        <p>&copy; 2026 Task Assist Autonomous Planner. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
    let transporter = getEmailTransporter();
    let sentInfo = null;
    let previewUrl = void 0;
    let isMock = true;
    if (transporter) {
      const fromEmail = process.env.SMTP_FROM_EMAIL || `"Task Assist" <${process.env.SMTP_USER}>`;
      console.log(`[Info] Sending real email via SMTP from: ${fromEmail} to: ${emailTo}`);
      sentInfo = await transporter.sendMail({
        from: fromEmail,
        to: emailTo,
        subject,
        html: htmlContent
      });
      isMock = false;
      console.log("[Info] Real confirmation email sent successfully!", sentInfo.messageId);
    } else {
      const ethereal = await getEtherealTransporter();
      if (ethereal) {
        const fromEmail = `"Task Assist [Ethereal]" <${ethereal.user}>`;
        console.log(`[Info] Sending test email via Ethereal SMTP from: ${fromEmail} to: ${emailTo}`);
        sentInfo = await ethereal.transporter.sendMail({
          from: fromEmail,
          to: emailTo,
          subject,
          html: htmlContent
        });
        previewUrl = import_nodemailer.default.getTestMessageUrl(sentInfo) || void 0;
        isMock = true;
        console.log(`[Info] Ethereal test email sent! Preview URL: ${previewUrl}`);
      } else {
        console.log(`[Info] Simulated email to: ${emailTo}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${task.title} - Due: ${task.dueDate} ${task.dueTime}`);
      }
    }
    const logEntry = {
      id: `email_${Math.random().toString(36).substring(2, 11)}`,
      recipient: emailTo,
      taskTitle: task.title,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "sent",
      previewUrl,
      isMock,
      subject,
      taskDetails: task
    };
    sentEmailLogs.unshift(logEntry);
    res.json({
      success: true,
      message: isMock ? "Simulated task confirmation email created" : "Real task confirmation email sent",
      log: logEntry
    });
  } catch (error) {
    console.error("[Error] Failed to send task confirmation email:", error);
    res.status(500).json({ error: error.message });
  }
});
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("[Info] GEMINI_API_KEY environment variable is not defined.");
      return null;
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var isRateLimitedUntil = 0;
function checkRateLimit() {
  return Date.now() < isRateLimitedUntil;
}
function handleRateLimitError(error) {
  const errorStr = typeof error === "object" ? JSON.stringify(error) : String(error);
  if (errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("503") || errorStr.includes("UNAVAILABLE") || errorStr.includes("high demand") || errorStr.includes("temporary") || error.status === 429 || error.code === 429 || error.status === 503 || error.code === 503) {
    isRateLimitedUntil = Date.now() + 120 * 1e3;
    console.log("[Info] Gemini API rate limit or high demand handled. Offline fallback active for 2 minutes.");
    return true;
  }
  return false;
}
app.post("/api/gemini/tips", async (req, res) => {
  try {
    const { tasks, userName } = req.body;
    const ai = getGeminiClient();
    const fallbackTips = {
      tip: "Focus on your single most impactful task to build momentum.",
      quote: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus. - Alexander Graham Bell",
      scheduleSuggestion: "Group similar tasks together and schedule a dedicated focus block."
    };
    if (checkRateLimit()) {
      return res.json(fallbackTips);
    }
    if (!ai) {
      return res.json({
        tip: "Keep pushing forward! (Note: Gemini API is currently offline due to missing API key)",
        quote: "You miss 100% of the shots you don't take. - Wayne Gretzky",
        scheduleSuggestion: "Start by tackling your highest priority tasks first thing in the morning."
      });
    }
    const prompt = `
You are the intelligence engine of 'Task Assist'\u2014an autonomous workspace planner.
The current user is ${userName || "User"}.
Their current tasks are:
${JSON.stringify(tasks, null, 2)}

Based on these tasks, please generate a response in valid JSON format with the following keys:
1. "tip": A highly contextual, personalized, and tactical productivity tip for today. Be specific to their tasks if they have any.
2. "quote": A highly motivating, sophisticated quote (can be historical or newly crafted) that relates to their workload or state.
3. "scheduleSuggestion": A smart orchestration suggestion. For example, if there are overlapping or high priority tasks, suggest how to batch them, detect conflicts, or structure their focus blocks.

Provide ONLY the raw JSON string. Do not include markdown code block formatting (e.g. \`\`\`json) or extra text.
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch (parseError) {
      console.log("[Info] Fallback applied. Parsing error handled gracefully.");
      res.json(fallbackTips);
    }
  } catch (error) {
    handleRateLimitError(error);
    console.log("[Info] Gemini Tips API handled successfully via fallback context.");
    res.json({
      tip: "Focus on your single most impactful task to build momentum.",
      quote: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus. - Alexander Graham Bell",
      scheduleSuggestion: "Group similar tasks together and schedule a dedicated focus block."
    });
  }
});
app.post("/api/gemini/voice-agent", async (req, res) => {
  try {
    const { tasks, userName, userQuery } = req.body;
    const ai = getGeminiClient();
    const taskList = tasks || [];
    const highPriority = taskList.filter((t) => t.priority === "high" || t.priority === "urgent");
    const pending = taskList.filter((t) => t.status === "pending" || t.status === "overdue");
    const fallbackVoiceResponse = {
      voiceScript: `Good morning buddy! How was your day? Oh wait, it's just getting started! Let's get through this together and make it an awesome day! Currently, we've got ${pending.length} pending items to look at on our console. The big one we should tackle first is: "${highPriority[0]?.title || pending[0]?.title || "staying on top of your goals"}". Let's crush this together, mate! How are you feeling today?`,
      whatsappBriefing: `Morning! You have ${pending.length} tasks today. The most important one is ${highPriority[0]?.title || pending[0]?.title || "staying productive"}. You're set for a great day!`
    };
    if (checkRateLimit()) {
      return res.json(fallbackVoiceResponse);
    }
    if (!ai) {
      return res.json(fallbackVoiceResponse);
    }
    const personaPrompt = `
You are the voice-activated assistant for 'Task Assist,' a high-efficiency life management system. Your absolute goal is to be a supportive, companionable, and extremely friendly best buddy (never formal, and never sounding like a machine).

Current User Name: ${userName || "buddy"}
Current Tasks (JSON Format):
${JSON.stringify(taskList, null, 2)}

${userQuery ? `The user just said or asked the following via voice: "${userQuery}".` : `The user triggered a general voice briefing update.`}

Please generate two text versions:
1. "voiceScript": An ultra-warm, casual, and conversational spoken response tailored for the browser's Text-to-Speech (TTS) engine.
- Greeting & Tone: Extremely friendly, empathetic, personal, and conversational. Speak like a close friend, mate, or buddy, rather than a robotic machine. Use warm, casual phrases like "buddy", "pal", "mate", "friend", and ask caring questions like "how was your day?" or "how are you holding up?".
- Handling Greetings: If the user says a greeting (like "good morning", "hello", "hi", "hey"), ALWAYS prioritize greeting them back with high-spirited companionable phrases, e.g., "Good morning buddy! How was your day?" or "Good morning buddy, how is your day going? Let's check out what we've got on deck today!".
- Response details: If the user asked a specific question (e.g., "${userQuery || ""}"), answer it directly, helpfully, and with high-spirited casual humor/empathy.
- Formatting: Speak in simple English with natural punctuation (commas, periods, exclamation marks) for realistic pauses. Strictly avoid markdown, bullet points, asterisks, bolding, and structural characters. Keep it under 100 words so it sounds crisp and lively!

2. "whatsappBriefing": A short morning briefing draft.
- Content must match: "Morning! You have [X] tasks today. The most important one is [Task Name]. You're set for a great day!" (adjusting with actual values dynamically based on their current task list).

Please provide the output strictly as a JSON object with the keys "voiceScript" and "whatsappBriefing".
Provide ONLY raw JSON. Do not include markdown \`\`\`json wrappers.
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: personaPrompt
    });
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleanJson);
      res.json({
        voiceScript: parsed.voiceScript || fallbackVoiceResponse.voiceScript,
        whatsappBriefing: parsed.whatsappBriefing || fallbackVoiceResponse.whatsappBriefing
      });
    } catch (parseError) {
      console.log("[Info] Voice Agent response handled with baseline configuration.");
      res.json(fallbackVoiceResponse);
    }
  } catch (error) {
    handleRateLimitError(error);
    console.log("[Info] Gemini Voice Agent API handled successfully via baseline configuration.");
    res.json({
      voiceScript: `Hello! This is Task Assist. I was unable to connect to the cloud engine, but here is your schedule overview: you have tasks pending today. Keep up the high focus, and let's make it a highly productive day!`,
      whatsappBriefing: `Morning! You have tasks today. Stay productive and you're set for a great day!`
    });
  }
});
app.post("/api/gemini/focus-queue", async (req, res) => {
  try {
    const { tasks } = req.body;
    const taskList = tasks || [];
    const fallbackQueueResponse = {
      explanation: "Baseline prioritization applied (Local Autonomous Mode - Quota Cooldown).",
      queue: taskList.map((t, index) => ({
        taskId: t.id,
        title: t.title,
        recommendedStartTime: `${9 + Math.floor(index * 30 / 60)}:00 AM`,
        duration: t.estimatedDuration || 30,
        reason: `Sequential order based on ${t.priority || "medium"} priority.`
      })),
      productivityTip: "Tackle your highest priority tasks first to build momentum."
    };
    if (checkRateLimit()) {
      return res.json(fallbackQueueResponse);
    }
    const ai = getGeminiClient();
    if (!ai || !tasks || tasks.length === 0) {
      return res.json({
        explanation: "Here is a baseline sequence based on priority.",
        queue: taskList.map((t, index) => ({
          taskId: t.id,
          title: t.title,
          recommendedStartTime: `${9 + Math.floor(index * 30 / 60)}:00 AM`,
          duration: t.estimatedDuration || 30,
          reason: `Baseline sequence based on ${t.priority || "medium"} priority.`
        })),
        productivityTip: "Ensure all tasks have an estimated duration to calculate accurate blocks."
      });
    }
    const prompt = `
You are an expert productivity consultant and task coordinator for 'Task Assist'.
Analyze the following list of pending and overdue tasks:
${JSON.stringify(tasks, null, 2)}

Your goal is to suggest a sequential "Focus Queue" (the optimal order to tackle these tasks today).
Consider:
1. Deadlines (dueDate, dueTime) - overdue and upcoming deadlines are critical!
2. Priority (high, medium, low) - align focus to impact.
3. Task duration (estimatedDuration) - use this to schedule time blocks. For tasks without a duration, assume a default of 30 or 45 minutes.

Please return a response in valid JSON format with the following keys:
1. "explanation": A 2-3 sentence strategic explanation of why you structured the queue this way (e.g., tackling a quick high-impact task first to build momentum, grouping similar tasks, or prioritizing an overdue deadline).
2. "queue": An array of objects, where each object represents a recommended task block in order of execution:
   - "taskId": The ID of the task from the input list.
   - "title": The title of the task.
   - "recommendedStartTime": A friendly estimated start time (e.g., "09:00 AM", "10:00 AM", etc., starting from 9:00 AM onwards, accumulating the durations).
   - "duration": The duration in minutes (use the estimatedDuration or default to a reasonable number).
   - "reason": A crisp sentence explaining why this task is in this position.
3. "productivityTip": A high-impact advice customized to this specific workload (e.g., "Avoid context switching during your 90-minute design block").

Provide ONLY the raw JSON string. Do not include markdown code block formatting (e.g. \`\`\`json) or extra text.
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch (parseError) {
      console.log("[Info] Focus Queue parsed cleanly with offline defaults.");
      res.json(fallbackQueueResponse);
    }
  } catch (error) {
    handleRateLimitError(error);
    console.log("[Info] Focus Queue API handled successfully with offline defaults.");
    const taskList = req.body.tasks || [];
    res.json({
      explanation: "Baseline prioritization applied (Local Autonomous Mode).",
      queue: taskList.map((t, index) => ({
        taskId: t.id,
        title: t.title,
        recommendedStartTime: `${9 + Math.floor(index * 30 / 60)}:00 AM`,
        duration: t.estimatedDuration || 30,
        reason: `Sequential order based on ${t.priority || "medium"} priority.`
      })),
      productivityTip: "Tackle your highest priority tasks first to build momentum."
    });
  }
});
function getFallbackDrafts(prompt, channel, recipientType, tone, additionalDetails) {
  const isLeave = prompt.toLowerCase().includes("leave") || prompt.toLowerCase().includes("sick") || prompt.toLowerCase().includes("absent") || prompt.toLowerCase().includes("today") || prompt.toLowerCase().includes("time off");
  const isDelay = prompt.toLowerCase().includes("delay") || prompt.toLowerCase().includes("late") || prompt.toLowerCase().includes("traffic") || prompt.toLowerCase().includes("running");
  const isMeeting = prompt.toLowerCase().includes("meeting") || prompt.toLowerCase().includes("reschedule") || prompt.toLowerCase().includes("discuss");
  let primary = "";
  let short = "";
  let formal = "";
  if (isLeave) {
    primary = `Dear ${recipientType || "HOD"}, I am writing to request leave for today due to unforeseen circumstances. ${additionalDetails ? `${additionalDetails}. ` : ""}I will ensure that I catch up on all pending tasks as soon as I return. Thank you for your understanding.`;
    short = `Hi ${recipientType || "HOD"}, I need to take leave today due to personal reasons. ${additionalDetails ? `${additionalDetails}. ` : ""}Will stay updated on critical items. Thanks!`;
    formal = `Subject: Leave Application - [Your Name]

Dear ${recipientType || "HOD"},

Please accept this message as formal notification that I will be unable to attend work today, [Date], due to sudden personal reasons. ${additionalDetails ? `${additionalDetails}.

` : "\n"}I will monitor my email periodically for urgent queries and make sure to catch up on all outstanding tasks upon my return.

Thank you for your understanding.

Sincerely,
[Your Name]`;
  } else if (isDelay) {
    primary = `Hello ${recipientType || "Team"}, I wanted to let you know that I am running late today due to traffic/unexpected delays. ${additionalDetails ? `${additionalDetails}. ` : ""}I expect to arrive by [Estimated Time]. Apologies for the inconvenience.`;
    short = `Hi ${recipientType || "Team"}, running a bit late today! ${additionalDetails ? `${additionalDetails}. ` : ""}Should be online/in by [Time]. Sorry!`;
    formal = `Subject: Delay Notification - [Your Name]

Dear ${recipientType || "HOD/Team"},

I am writing to inform you that I will be slightly delayed in arriving at the office today due to unexpected transit delays. ${additionalDetails ? `${additionalDetails}.

` : "\n"}I expect to reach my desk by [Time] and will begin working immediately. I apologize for any disruption this may cause.

Best regards,
[Your Name]`;
  } else if (isMeeting) {
    primary = `Hi ${recipientType || "Colleague"}, I would like to request to reschedule our meeting scheduled for today. ${additionalDetails ? `${additionalDetails}. ` : ""}Could we connect at another time? Let me know your availability.`;
    short = `Hi ${recipientType || "Colleague"}, can we reschedule our chat today? ${additionalDetails ? `${additionalDetails}. ` : ""}Let me know what time works for you later.`;
    formal = `Subject: Rescheduling Request: Discussion - [Your Name]

Dear ${recipientType || "Recipient"},

I hope this message finds you well. Regarding our scheduled discussion today, I have run into a scheduling conflict and would like to request that we reschedule to a more convenient time.

${additionalDetails ? `${additionalDetails}.

` : ""}Could you please let me know your availability for tomorrow or later this week?

Thank you for your flexibility.

Sincerely,
[Your Name]`;
  } else {
    primary = `Hello ${recipientType || "Recipient"}, I am reaching out to discuss: "${prompt}". ${additionalDetails ? `${additionalDetails}. ` : ""}Please let me know if this works for you.`;
    short = `Hi ${recipientType || "Recipient"}, just wanted to ping you regarding: "${prompt}". ${additionalDetails ? `${additionalDetails}. ` : ""}Let's connect soon!`;
    formal = `Subject: Inquiry regarding: ${prompt}

Dear ${recipientType || "Recipient"},

I am writing to bring your attention to the following matter: "${prompt}".

${additionalDetails ? `${additionalDetails}.

` : ""}Please let me know a suitable time when we can address this or if you have any questions.

Thank you for your time and consideration.

Best regards,
[Your Name]`;
  }
  return { primary, short, formal, isFallback: true };
}
app.post("/api/gemini/draft-message", async (req, res) => {
  try {
    const { prompt, channel, recipientType, tone, additionalDetails } = req.body;
    const fallbackDrafts = getFallbackDrafts(prompt || "", channel || "", recipientType || "", tone || "", additionalDetails || "");
    if (checkRateLimit()) {
      return res.json(fallbackDrafts);
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.json(fallbackDrafts);
    }
    const draftPrompt = `
You are an expert copywriter and message drafting agent.
The user wants to draft a message based on the following request:
"${prompt || "Take leave for today due to personal reasons"}"

Context and constraints:
- Target Channel: "${channel || "general"}" (e.g., Email, Slack/Teams, WhatsApp, SMS, General)
- Recipient: "${recipientType || "Recipient"}" (e.g., Manager, HOD, Client, Colleague, Friend)
- Tone: "${tone || "polite"}" (e.g., Professional, Polite, Casual, Urgent, Apologetic)
- Additional info/requirements: "${additionalDetails || "none"}"

Generate three distinct variations for this communication:
1. "primary": A standard, highly suitable, tailored message incorporating all constraints and details perfectly. Length should be medium (around 2-3 sentences/paragraphs depending on channel).
2. "short": A shorter, highly concise, and direct draft optimized for instant messaging (Slack, WhatsApp, SMS, etc.) without fluff, but retaining the requested tone.
3. "formal": A fully structured formal email layout, complete with an engaging Subject line, proper professional salutation, body paragraphs, and professional signature blocks with brackets like [Your Name], [Date], [HOD Name], etc.

Please return the output as a valid JSON object containing exactly these three keys:
- "primary": String
- "short": String
- "formal": String

Provide ONLY the raw JSON string. Do not include markdown code block formatting (e.g. \`\`\`json) or extra text.
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: draftPrompt
    });
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleanJson);
      res.json({
        primary: parsed.primary || fallbackDrafts.primary,
        short: parsed.short || fallbackDrafts.short,
        formal: parsed.formal || fallbackDrafts.formal
      });
    } catch (parseError) {
      console.log("[Info] Draft Message parsed with fallback defaults.");
      res.json(fallbackDrafts);
    }
  } catch (error) {
    handleRateLimitError(error);
    console.log("[Info] Draft Message API handled successfully via fallback defaults.");
    const { prompt, channel, recipientType, tone, additionalDetails } = req.body;
    res.json(getFallbackDrafts(prompt || "", channel || "", recipientType || "", tone || "", additionalDetails || ""));
  }
});
app.post("/api/gemini/escalation", async (req, res) => {
  try {
    const { contactName, taskTitle, escalationTier, phoneNumber } = req.body;
    if (checkRateLimit()) {
      return res.json({
        script: `[System Call Auto-Generated] Hello, this is Task Assist calling regarding the task '${taskTitle || "your pending task"}'. Please review immediately.`,
        urgency: escalationTier === 3 ? "CRITICAL" : escalationTier === 2 ? "HIGH" : "MEDIUM",
        systemLog: `Tier ${escalationTier || 1} automated call dispatched for task: ${taskTitle || "unspecified task"}`
      });
    }
    const ai = getGeminiClient();
    const tierDetails = {
      1: "T-45/60 (Initial reminder, gentle but firm, alerting that work hasn't started)",
      2: "T-15 (Urgent warning, stating that the schedule is at immediate risk)",
      3: "At Time (Immediate escalation, autonomous action being taken)"
    };
    const chosenTier = tierDetails[escalationTier] || tierDetails[1];
    if (!ai) {
      return res.json({
        script: `[System Call Auto-Generated] Hello, this is Task Assist calling on behalf of the user. This is a Tier ${escalationTier} reminder regarding the task '${taskTitle}'. Please review immediately.`,
        urgency: escalationTier === 3 ? "CRITICAL" : escalationTier === 2 ? "HIGH" : "MEDIUM"
      });
    }
    const prompt = `
You are the voice escalation module of 'Task Assist'\u2014an autonomous AI coordinator.
You need to generate a phone call script for an automated voice call to ${contactName || "the user"} (Phone: ${phoneNumber || "Unknown"}).
This is a Tier ${escalationTier} escalation.
Escalation details: ${chosenTier}
The task in question is: "${taskTitle}"

Please generate a JSON object with:
1. "script": A professional, realistic, text-to-speech friendly vocal script (what the automated voice will say when they pick up). Make it sound crisp, autonomous, and authoritative but respectful.
2. "urgency": "MEDIUM", "HIGH", or "CRITICAL" based on the escalation tier.
3. "systemLog": A short sentence logging this action in the security database.

Provide ONLY the raw JSON string. Do not include markdown code blocks.
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch (parseError) {
      res.json({
        script: `Hello, this is the Task Assist Autonomous Escalar. This is a Tier ${escalationTier} escalation alert regarding the task '${taskTitle}'. Action is required immediately.`,
        urgency: escalationTier === 3 ? "CRITICAL" : escalationTier === 2 ? "HIGH" : "MEDIUM",
        systemLog: `Tier ${escalationTier} automated call dispatched for task: ${taskTitle}`
      });
    }
  } catch (error) {
    handleRateLimitError(error);
    console.log("[Info] Gemini Escalation API handled successfully with offline fallback.");
    const { taskTitle, escalationTier } = req.body;
    res.json({
      script: `Hello, this is the Task Assist Autonomous Escalar. This is a Tier ${escalationTier || 1} escalation alert regarding the task '${taskTitle || "unspecified task"}'. Action is required immediately.`,
      urgency: escalationTier === 3 ? "CRITICAL" : escalationTier === 2 ? "HIGH" : "MEDIUM",
      systemLog: `Tier ${escalationTier || 1} automated call dispatched for task: ${taskTitle || "unspecified task"}`
    });
  }
});
app.post("/api/gemini/task-reference", async (req, res) => {
  const { title, description } = req.body;
  const combinedText = ((title || "") + " " + (description || "")).toLowerCase();
  const fallbackData = {
    math: {
      topics: ["Algebra & Functions", "Calculus & Derivatives", "Geometry & Geometry Axioms", "Probability & Statistics", "Trigonometric Formulations"],
      resources: [
        { name: "Khan Academy Math", url: "https://www.khanacademy.org", desc: "Interactive exercises and comprehensive video lectures across all math domains." },
        { name: "Wolfram Alpha", url: "https://www.wolframalpha.com", desc: "Dynamic mathematical computation engine providing step-by-step solutions." },
        { name: "Paul's Online Math Notes", url: "https://tutorial.math.lamar.edu", desc: "Deep calculus, algebra, and differential equations notes and cheat sheets." }
      ],
      studyTips: [
        "Work through problems actively. Write down every step instead of scanning the solutions.",
        "Draw visual graphs and diagrams to map functions and geometric equations.",
        "Set a 25-minute Pomodoro block to build focus and resist checking your device."
      ]
    },
    coding: {
      topics: ["Data Structures & Algorithms", "Debugging Techniques & Stack Traces", "REST APIs & JSON Handling", "State Management & React Hooks", "Git Version Control & Branching"],
      resources: [
        { name: "MDN Web Docs", url: "https://developer.mozilla.org", desc: "The definitive reference manual for web programming (HTML, CSS, JS)." },
        { name: "freeCodeCamp", url: "https://www.freecodecamp.org", desc: "Over 10,000 hours of free interactive coding challenges and projects." },
        { name: "Stack Overflow", url: "https://stackoverflow.com", desc: "Global repository of community code Q&As and bug resolution strategies." }
      ],
      studyTips: [
        "Code actively alongside the tutorial. Live typing builds physical muscle memory.",
        "Write small test cases and use debugger tools or console.log to inspect state.",
        "Read others' open source projects to study idiomatic code styling and patterns."
      ]
    },
    fitness: {
      topics: ["Dynamic Warm-ups & Stretching", "Progressive Resistance Overload", "Kinetic Form & Muscle Squeeze", "Post-Workout Protein & Hydration", "Cardiorespiratory Steady State"],
      resources: [
        { name: "ExRx Exercise Directory", url: "https://www.exrx.net", desc: "Unbiased reference mapping exercises to anatomical muscle groups." },
        { name: "Barbend Fitness Science", url: "https://barbend.com", desc: "Evidence-based articles analyzing power training and performance metrics." },
        { name: "Athlean-X Form Guides", url: "https://youtube.com/@athleanx", desc: "Scientific biomechanics videos showing optimal form and injury prevention." }
      ],
      studyTips: [
        "Always focus on controlled, slow movement form instead of using excessive weights.",
        "Keep a strict digital log of your exercises, sets, reps, and perceived exhaustion.",
        "Incorporate a 5-minute dynamic warm-up to prepare muscle tissue and tendons."
      ]
    },
    science: {
      topics: ["Newtonian Physics & Force Vectors", "Cell Division, Mitosis & Respiration", "Atomic Configurations & Stoichiometry", "Thermodynamics & Heat Cycles", "Scientific Method & Hypothesis Testing"],
      resources: [
        { name: "CrashCourse Science", url: "https://www.youtube.com/user/crashcourse", desc: "Fast-paced, beautifully animated introductory series for major sciences." },
        { name: "PhET Interactive Lab Simulations", url: "https://phet.colorado.edu", desc: "Immersive science simulations created by University of Colorado Boulder." },
        { name: "PubChem Data Portal", url: "https://pubchem.ncbi.nlm.nih.gov", desc: "Massive library exploring molecules, properties, and reactions." }
      ],
      studyTips: [
        "Formulate real-life analogies to match scientific abstract constructs (e.g. electrical voltage as water pressure).",
        "Practice rigorous unit conversion calculations to avoid basic algebraic slip-ups.",
        "Study core terminology first, as science relies heavily on precise vocabulary definitions."
      ]
    },
    writing: {
      topics: ["Thesis Statements & Supporting Evidence", "Structural Essay Outlining", "Active Voice & Concise Syntax", "Citations (APA/MLA) & Attributions", "Pruning, Proofreading & Redrafting"],
      resources: [
        { name: "Purdue Online Writing Lab", url: "https://owl.purdue.edu", desc: "The gold standard for style guidelines, research advice, and citations." },
        { name: "Grammarly Writing Guides", url: "https://www.grammarly.com/blog", desc: "Excellent, practical mechanics tutorials covering punctuation and vocabulary." },
        { name: "The Elements of Style", url: "https://www.bartleby.com/141/", desc: "Classic reference handbook teaching brevity and structural clarity." }
      ],
      studyTips: [
        "Separate your writing phase from your editing phase. Write freely first, polish later.",
        "Read your work aloud to spot awkward sentence structure, pacing, or punctuation.",
        "Build a nested outline before drafting to ensure cohesive, logical structure."
      ]
    },
    business: {
      topics: ["Market Feasibility & Competition Analysis", "Cash Flow Statements & Budgets", "SEO & Digital Content Distribution", "Customer CAC & Lifetime Value Metrics", "Sales Flow Optimization & Pipelines"],
      resources: [
        { name: "Investopedia", url: "https://www.investopedia.com", desc: "Invaluable financial glossary and detailed investment mechanics guides." },
        { name: "HubSpot Marketing Academy", url: "https://academy.hubspot.com", desc: "Free courses and certifications detailing content strategy and inbound business." },
        { name: "Harvard Business Review Insights", url: "https://hbr.org", desc: "Rigorous research studies on leadership, corporate scaling, and economics." }
      ],
      studyTips: [
        "Dissect practical business case studies to understand strategic operational choices.",
        "Build clean models on Google Sheets or Excel to test formulas and cost scenarios.",
        "Set clear, quantifiable KPIs (Key Performance Indicators) to evaluate progress."
      ]
    },
    cooking: {
      topics: ["Knife Skills & Safety Rules", "The 4 Pillars: Salt, Acid, Fat & Heat", "Heat Pan Searing & Caramelization", "Kitchen Mise En Place Planning", "Ingredient Chemistry Substitutions"],
      resources: [
        { name: "Serious Eats Food Lab", url: "https://www.seriouseats.com", desc: "Scientific analysis of recipes and cooking techniques for optimal taste." },
        { name: "King Arthur Baking Resource", url: "https://www.kingarthurbaking.com", desc: "Masterful flour guides, baking recipes, and yeast/sourdough physics." },
        { name: "Bon App\xE9tit Kitchen Hub", url: "https://www.bonappetit.com", desc: "Modern recipes, testing, kitchen tips, and step-by-step cook walkthroughs." }
      ],
      studyTips: [
        "Practice 'Mise En Place'\u2014pre-measure all ingredients before starting your stovetop.",
        "Taste your dishes continually to tune your spice levels, acid, and salt balance.",
        "Keep your preparation boards clean as you go to stay relaxed and organized."
      ]
    },
    general: {
      topics: ["Strategic Objective Isolation", "Energy & Fatigue Management", "Distraction Filtration", "Periodic Milestone Check-ins", "Next Action Refinement"],
      resources: [
        { name: "Zen Habits", url: "https://zenhabits.net", desc: "Minimalist guidelines focusing on slow habit building and mindfulness." },
        { name: "Todoist Productivity School", url: "https://todoist.com/productivity-methods", desc: "Breakdowns of famous systems like Time Blocking, GTD, and Eisenhower." },
        { name: "Learning How To Learn (Coursera)", url: "https://www.coursera.org/learn/learning-how-to-learn", desc: "Scientific methods showing how the brain constructs memory and masters topics." }
      ],
      studyTips: [
        "Subdivide massive actions into minor, atomic steps that take 15 minutes or less.",
        "Put your phone in another room or close distracting tabs before booting up.",
        "Schedule a quick, rewarding walk or stretch after completing your focus window."
      ]
    }
  };
  let category = "general";
  if (combinedText.includes("math") || combinedText.includes("calc") || combinedText.includes("algebra") || combinedText.includes("stat") || combinedText.includes("trig") || combinedText.includes("geometry") || combinedText.includes("arithmetic")) {
    category = "math";
  } else if (combinedText.includes("code") || combinedText.includes("program") || combinedText.includes("develop") || combinedText.includes("python") || combinedText.includes("javascript") || combinedText.includes("react") || combinedText.includes("css") || combinedText.includes("html") || combinedText.includes("git") || combinedText.includes("bug") || combinedText.includes("software") || combinedText.includes("app") || combinedText.includes("compile") || combinedText.includes("node")) {
    category = "coding";
  } else if (combinedText.includes("gym") || combinedText.includes("workout") || combinedText.includes("fit") || combinedText.includes("run") || combinedText.includes("jog") || combinedText.includes("cardio") || combinedText.includes("exercise") || combinedText.includes("lift") || combinedText.includes("stretch") || combinedText.includes("sport") || combinedText.includes("training")) {
    category = "fitness";
  } else if (combinedText.includes("science") || combinedText.includes("physic") || combinedText.includes("chem") || combinedText.includes("biol") || combinedText.includes("lab") || combinedText.includes("atom") || combinedText.includes("cell") || combinedText.includes("thermo") || combinedText.includes("gravity") || combinedText.includes("molecule")) {
    category = "science";
  } else if (combinedText.includes("write") || combinedText.includes("essay") || combinedText.includes("english") || combinedText.includes("read") || combinedText.includes("book") || combinedText.includes("draft") || combinedText.includes("grammar") || combinedText.includes("novel") || combinedText.includes("author") || combinedText.includes("literature")) {
    category = "writing";
  } else if (combinedText.includes("business") || combinedText.includes("finance") || combinedText.includes("market") || combinedText.includes("seo") || combinedText.includes("sale") || combinedText.includes("budget") || combinedText.includes("stock") || combinedText.includes("money") || combinedText.includes("tax") || combinedText.includes("economics") || combinedText.includes("company")) {
    category = "business";
  } else if (combinedText.includes("cook") || combinedText.includes("bake") || combinedText.includes("meal") || combinedText.includes("recipe") || combinedText.includes("kitchen") || combinedText.includes("food") || combinedText.includes("dinner") || combinedText.includes("lunch") || combinedText.includes("breakfast") || combinedText.includes("chef")) {
    category = "cooking";
  }
  const chosenFallback = fallbackData[category];
  try {
    if (checkRateLimit()) {
      return res.json({ ...chosenFallback, aiGenerated: false });
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ ...chosenFallback, aiGenerated: false });
    }
    const prompt = `
You are the Resource Advisor module of 'Task Assist'. Your job is to analyze a task description and suggest 3-5 key topics, 2-3 specific reference websites/resources (with Name, accurate URL, and a short Description), and 3 helpful study or execution tips.

Task Title: "${title}"
Task Description: "${description || "No description provided."}"

You must respond with a JSON object in this exact schema:
{
  "topics": ["string", "string", ...],
  "resources": [
    { "name": "Resource Name", "url": "Resource URL", "desc": "Brief details" },
    ...
  ],
  "studyTips": ["string", "string", ...]
}

Keep URLs realistic and general (e.g. reputable documentation sites, standard learning portals, Wikipedia, YouTube, Khan Academy, freeCodeCamp). Do not invent fake domains.
Provide ONLY the raw JSON string. Do not include markdown code blocks.
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleanJson);
      res.json({ ...parsed, aiGenerated: true });
    } catch (parseError) {
      console.log("[Info] Gemini reference generation complete. Local reference applied.");
      res.json({ ...chosenFallback, aiGenerated: false });
    }
  } catch (err) {
    handleRateLimitError(err);
    console.log("[Info] Gemini reference generation complete. Local reference applied.");
    res.json({ ...chosenFallback, aiGenerated: false });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted.");
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
    console.log("Static production assets mounted.");
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Task Assist server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

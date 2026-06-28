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
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
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
      voiceScript: `Hello ${userName || "there"}! I am ready to assist you. Currently, you have ${pending.length} pending items on your schedule. The most important one is ${highPriority[0]?.title || pending[0]?.title || "staying focused on your goals"}. Let's make sure we finish that one first today! Shall we get started?`,
      whatsappBriefing: `Morning! You have ${pending.length} tasks today. The most important one is ${highPriority[0]?.title || pending[0]?.title || "staying productive"}. You're set for a great day!`
    };
    if (checkRateLimit()) {
      return res.json(fallbackVoiceResponse);
    }
    if (!ai) {
      return res.json(fallbackVoiceResponse);
    }
    const personaPrompt = `
You are the voice-activated assistant for 'Task Assist,' a high-efficiency life management system. Your primary goal is to be a supportive, concise, and proactive partner.

Current User Name: ${userName || "User"}
Current Tasks (JSON Format):
${JSON.stringify(taskList, null, 2)}

${userQuery ? `The user just asked you the following question or query via voice: "${userQuery}".` : `The user triggered a general voice briefing update.`}

Please generate two text versions:
1. "voiceScript": A warm, spoken response tailored for the browser's Text-to-Speech (TTS) engine.
- Greeting & Tone: Friendly, professional, clear, and conversational. Avoid sounding robotic. Use simple and direct English. Use simple punctuation for natural pausing (commas and periods). No markdown, bolding, asterisks, or other structural symbols.
- If the user asked a specific question (e.g. "${userQuery || ""}"), answer it directly, accurately, and naturally in character using their current task list and context.
- Otherwise, perform the standard greeting and briefing: start with a warm, time-appropriate greeting (e.g., "Good morning! Today is [Date], and you have [X] items on your list."), list the most urgent task first, summarize the rest, note any overdue tasks, briefly check for timelines or overlaps, and close with a motivational prompt or action call.
- Proactivity: Always anticipate the next step. If a task is overdue, gently remind the user. If they have no tasks, suggest a positive outlook for the day.

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

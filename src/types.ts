export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  scheduledTime?: string; // YYYY-MM-DDTHH:MM for service worker alarms
  estimatedDuration?: number; // Estimated duration in minutes
  status: "pending" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  escalationEnabled?: boolean;
  escalationPhone?: string;
  escalationContacts?: string[]; // Contact IDs or emails
  createdAt: string;
  reference?: {
    topics: string[];
    resources: { name: string; url: string; desc?: string }[];
    studyTips: string[];
    aiGenerated?: boolean;
  };
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export interface CallLog {
  id: string;
  userId: string;
  taskTitle: string;
  contactName: string;
  phoneNumber: string;
  tier: number; // 1, 2, 3
  status: "ringing" | "connected" | "completed" | "missed";
  script: string;
  timestamp: string;
  urgency: "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface MessageDraft {
  id: string;
  userId: string;
  userPrompt: string;
  channel: string;
  recipientType: string;
  tone: string;
  additionalDetails?: string;
  primaryDraft: string;
  shortDraft: string;
  formalDraft: string;
  createdAt: string;
}




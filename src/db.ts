import Dexie, { Table } from "dexie";

export interface DBTask {
  id: string;
  title: string;
  description: string;
  due_date: string;
  urgency: "low" | "medium" | "high";
  status: "pending" | "completed" | "overdue";
  alerts_enabled: boolean;
  due_time?: string; // keeping support for existing features
  scheduled_time?: string; // service worker alarm time
  userId?: string;
  createdAt?: string;
}

export interface DBCallLog {
  id: string;
  task_id: string;
  timestamp: string;
  status: "answered" | "missed" | "snoozed" | "completed";
  tier: number;
}

export interface DBSettings {
  user_email: string;
  theme_preference: "light" | "dark" | "black-and-white";
  default_notification_time?: string;
  quiet_hours?: {
    start: string; // HH:MM
    end: string; // HH:MM
    override_tier_3: boolean;
  };
}

class TaskAssistDexie extends Dexie {
  tasks!: Table<DBTask, string>;
  call_logs!: Table<DBCallLog, string>;
  settings!: Table<DBSettings, string>;
  message_drafts!: Table<any, string>;

  constructor() {
    super("TaskAssistDB");
    // Schema definition for Dexie (only index fields that are queried)
    this.version(1).stores({
      tasks: "id, title, due_date, urgency, status, alerts_enabled",
      call_logs: "id, task_id, timestamp, status",
      settings: "user_email, theme_preference"
    });
    this.version(2).stores({
      tasks: "id, title, due_date, urgency, status, alerts_enabled",
      call_logs: "id, task_id, timestamp, status",
      settings: "user_email, theme_preference",
      message_drafts: "id, userId, createdAt"
    });
  }
}

export const localDb = new TaskAssistDexie();

// --- CRUD Operations ---

export async function addTask(task: Omit<DBTask, "id"> & { id?: string }): Promise<string> {
  const id = task.id || `task_${Math.random().toString(36).substring(2, 11)}`;
  const fullTask: DBTask = {
    ...task,
    id,
    due_date: task.due_date || new Date().toISOString().split("T")[0],
    urgency: task.urgency || "medium",
    status: task.status || "pending",
    alerts_enabled: task.alerts_enabled !== undefined ? task.alerts_enabled : true
  };
  await localDb.tasks.put(fullTask);
  return id;
}

export async function deleteTask(id: string): Promise<void> {
  await localDb.tasks.delete(id);
}

export async function getAllTasks(): Promise<DBTask[]> {
  const tasks = await localDb.tasks.toArray();
  if (tasks.length === 0) {
    // Preseed the database if empty
    const seeded = [
      {
        id: "task-1",
        title: "🔥 Database Replication Lag Check",
        description: "Postgres secondary node replica lag exceeded 15 seconds. Verify WAL archiving and replication lag statistics on DB-01.",
        due_date: new Date().toISOString().split("T")[0],
        due_time: "14:30",
        urgency: "high" as const,
        status: "pending" as const,
        alerts_enabled: true,
        userId: "demo-operator",
        createdAt: new Date().toISOString()
      },
      {
        id: "task-2",
        title: "🔒 OAuth Callback Domain SSL Refresher",
        description: "Renew SSL wildcard certificates for oauth.taskassist.io domain endpoints to prevent callback failures across integrated OAuth clients.",
        due_date: new Date().toISOString().split("T")[0],
        due_time: "16:00",
        urgency: "medium" as const,
        status: "pending" as const,
        alerts_enabled: true,
        userId: "demo-operator",
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "task-3",
        title: "📈 Cloud Run Host Scaling Overload Monitor",
        description: "Memory utilization exceeded 85% on Instance Region Group-A. Auto-scaling rules checked; verified and mitigated successfully.",
        due_date: new Date().toISOString().split("T")[0],
        due_time: "10:00",
        urgency: "low" as const,
        status: "completed" as const,
        alerts_enabled: false,
        userId: "demo-operator",
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    for (const t of seeded) {
      await localDb.tasks.put(t);
    }
    return seeded;
  }
  return tasks;
}

export async function logCall(log: Omit<DBCallLog, "id"> & { id?: string }): Promise<string> {
  const id = log.id || `log_${Math.random().toString(36).substring(2, 11)}`;
  const fullLog: DBCallLog = {
    ...log,
    id,
    timestamp: log.timestamp || new Date().toISOString()
  };
  await localDb.call_logs.put(fullLog);
  return id;
}

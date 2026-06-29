importScripts('https://unpkg.com/dexie@3.2.4/dist/dexie.js');

const db = new Dexie("TaskAssistDB");
db.version(1).stores({
  tasks: "id, title, due_date, urgency, status, alerts_enabled",
  call_logs: "id, task_id, timestamp, status",
  settings: "user_email, theme_preference"
});

const taskChannel = new BroadcastChannel("task_assist_channel");
const alertedState = new Map(); // Tracks the highest tier fired for each task ID

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  // Setup standard fallback interval if periodicSync isn't fully supported
  setInterval(checkTasks, 60000);
  checkTasks();
});

// Use Periodic Background Sync if available
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'task-deadline-sync') {
    event.waitUntil(checkTasks());
  }
});

async function isQuietHours() {
  try {
    const settingsArr = await db.settings.toArray();
    const settings = settingsArr[0];
    if (!settings || !settings.quiet_hours) return { quiet: false, overrideTier3: false };
    
    const { start, end, override_tier_3 } = settings.quiet_hours;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    
    let isQuiet = false;
    if (startMins <= endMins) {
      isQuiet = currentMins >= startMins && currentMins <= endMins;
    } else {
      isQuiet = currentMins >= startMins || currentMins <= endMins;
    }
    
    return { quiet: isQuiet, overrideTier3: override_tier_3 };
  } catch (err) {
    return { quiet: false, overrideTier3: false };
  }
}

async function checkTasks() {
  try {
    const pendingTasks = await db.tasks.where('status').equals('pending').toArray();
    const { quiet, overrideTier3 } = await isQuietHours();
    const now = new Date();

    for (const task of pendingTasks) {
      if (task.alerts_enabled === false) continue;
      
      let targetTime;
      if (task.due_date && task.due_time) {
        targetTime = new Date(`${task.due_date}T${task.due_time}`);
      } else if (task.scheduled_time) {
        targetTime = new Date(task.scheduled_time);
      } else {
        continue; // No deadline info
      }

      const diffMs = targetTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      let tier = 0;
      if (diffMins <= 0) {
        tier = 3;
      } else if (diffMins <= 15) {
        tier = 2;
      } else if (diffMins <= 45) {
        tier = 1;
      }

      if (tier === 0) continue;

      // Quiet hours logic
      if (quiet) {
        if (tier < 3) continue;
        if (tier === 3 && !overrideTier3) continue;
      }

      const lastTier = alertedState.get(task.id) || 0;

      // Smart Alert Repetition logic
      // Tier 1: Single notification (only fire if we haven't fired tier 1 yet)
      // Tier 2: Notify + repeat if dismissed after 5 min (we can just fire once for now unless snoozed)
      // Tier 3: Alert every 2 minutes (if diffMins % 2 === 0)
      
      let shouldFire = false;
      if (tier === 3) {
        if (Math.abs(diffMins) % 2 === 0) shouldFire = true; // Every 2 mins overdue
      } else if (tier > lastTier) {
        shouldFire = true; // New tier reached
      }

      if (shouldFire) {
        alertedState.set(task.id, tier);
        await triggerEscalation(task, tier, Math.abs(diffMins));
      }
    }
  } catch (err) {
    console.error("Background task scan failed:", err);
  }
}

async function triggerEscalation(task, tier, minsOverdue) {
  let title = "";
  let vibrate = [];
  let silent = false;
  
  if (tier === 1) {
    title = `[T1] URGENT REMINDER - ${task.title}`;
    vibrate = [200, 100, 200];
  } else if (tier === 2) {
    title = `[T2] CRITICAL REMINDER - ${task.title}`;
    vibrate = [500, 200, 500, 200, 500];
  } else {
    title = `[T3] DEADLINE REACHED - ${task.title}`;
    vibrate = [1000, 500, 1000, 500, 1000, 500, 1000];
  }

  const timeLabel = tier === 3 ? `${minsOverdue} mins overdue` : `Due soon`;

  const options = {
    body: `Tier ${tier} Escalation: ${timeLabel}.`,
    icon: "/assets/favicon.ico",
    badge: "/assets/favicon.ico",
    requireInteraction: true,
    vibrate,
    tag: `task-alarm-${task.id}`,
    data: { taskId: task.id, tier },
    actions: [
      { action: 'answer', title: '📞 Answer' },
      { action: 'snooze', title: '⏳ Snooze (5m)' },
      { action: 'done', title: '✅ Mark Complete' }
    ]
  };

  // Broadcast to open clients so they can handle sound/call overlay
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  let hasOpenWindow = false;
  for (const client of clientsList) {
    hasOpenWindow = true;
    client.postMessage({ type: 'INCOMING_CALL', taskId: task.id, title: task.title, tier });
  }

  return self.registration.showNotification(title, options);
}

self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notification = event.notification;
  const { taskId, tier } = notification.data;

  notification.close();

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      
      // Stop the sound in UI
      for (const client of clientsList) {
        client.postMessage({ type: 'STOP_CALL_SOUND' });
      }

      if (action === 'done') {
        await db.tasks.update(taskId, { status: 'completed' });
        await logCall(taskId, tier, 'completed');
        for (const client of clientsList) client.postMessage({ type: 'TASK_UPDATED' });
      } else if (action === 'snooze') {
        // Just delay the alertedState so it fires again later
        alertedState.set(taskId, 0); 
        await logCall(taskId, tier, 'snoozed');
        for (const client of clientsList) client.postMessage({ type: 'TASK_UPDATED' });
      } else {
        // 'answer' or body click
        await logCall(taskId, tier, 'answered');
        let focused = false;
        for (const client of clientsList) {
          if ('focus' in client) {
            await client.focus();
            client.postMessage({ type: 'ANSWER_CALL', taskId });
            focused = true;
            break;
          }
        }
        if (!focused && self.clients.openWindow) {
          const client = await self.clients.openWindow('/');
          // small delay for load
          setTimeout(() => {
            if(client) client.postMessage({ type: 'ANSWER_CALL', taskId });
          }, 1500);
        }
      }
    })()
  );
});

async function logCall(taskId, tier, status) {
  try {
    await db.call_logs.put({
      id: `log_${Math.random().toString(36).substring(2, 11)}`,
      task_id: taskId,
      timestamp: new Date().toISOString(),
      status: status,
      tier: tier
    });
  } catch(e) {
    console.error(e);
  }
}

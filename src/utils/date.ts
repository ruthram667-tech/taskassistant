/**
 * Checks if a task is overdue based on the current local time,
 * safely handling timezone offsets and optional time strings.
 */
export const checkIsOverdue = (dueDate: string, dueTime?: string): boolean => {
  if (!dueDate) return false;

  const now = new Date();

  // Parse task due date (YYYY-MM-DD) in the user's local timezone
  const parts = dueDate.split("-");
  if (parts.length !== 3) return false;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const taskDue = new Date(year, month - 1, day);

  if (dueTime) {
    const timeParts = dueTime.split(":");
    const hours = timeParts[0] ? parseInt(timeParts[0], 10) : 0;
    const minutes = timeParts[1] ? parseInt(timeParts[1], 10) : 0;
    taskDue.setHours(hours, minutes, 0, 0);
  } else {
    // If no specific due time, consider overdue only after the day ends (23:59:59.999)
    taskDue.setHours(23, 59, 59, 999);
  }

  return now > taskDue;
};

/**
 * Gets the current local date formatted as YYYY-MM-DD safely.
 */
export const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Calculates if a task due date/time is eligible for an escalation tier trigger.
 * Returns:
 * - 3: At Time (overdue or up to 2 hours past)
 * - 2: T-15m (due within 15 minutes)
 * - 1: T-45m (due within 45 minutes)
 * - null: Not in any active trigger window
 */
export const getEscalationTierForTime = (dueDate: string, dueTime?: string): number | null => {
  if (!dueDate || !dueTime) return null;

  const parts = dueDate.split("-");
  if (parts.length !== 3) return null;
  const timeParts = dueTime.split(":");
  if (timeParts.length < 2) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  const taskDue = new Date(year, month - 1, day, hours, minutes, 0, 0);
  const now = new Date();

  const diffMs = taskDue.getTime() - now.getTime();
  const diffMins = diffMs / 60000;

  if (diffMins <= 0) {
    // Overdue or exactly due: Tier 3 (At Time)
    // Only return if it's within 2 hours of the due time to avoid ancient tasks ringing on load
    if (diffMins > -120) {
      return 3;
    }
  } else if (diffMins <= 15) {
    // Within 15 minutes: Tier 2 (T-15m)
    return 2;
  } else if (diffMins <= 45) {
    // Within 45 minutes: Tier 1 (T-45m)
    return 1;
  }

  return null;
};

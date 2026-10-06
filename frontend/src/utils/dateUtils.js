const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format ISO date string or Date object to DD Mon YYYY (e.g. 05 Oct 2026)
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Format date for <input type="date" /> (YYYY-MM-DD)
 */
export const toInputDateFormat = (dateValue) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

/**
 * Format date time: DD Mon · hh:mm A (e.g. 05 Oct · 06:03 PM)
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day} ${month} · ${hoursStr}:${minutes} ${ampm}`;
};

/**
 * Format duration ms into e.g. "72h 15m" or "55m"
 */
export const formatDurationMs = (ms) => {
  if (!ms || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

/**
 * Get visual urgency status for a planning due date
 * Returns: 'overdue' | 'due-soon' | 'upcoming' | 'none'
 */
export const getDueDateStatus = (dueDate, isCompleted = false) => {
  if (!dueDate) return 'none';
  if (isCompleted) return 'completed';

  const now = new Date();
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return 'none';

  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue';
  if (diffHours <= 48) return 'due-soon';
  return 'upcoming';
};

/**
 * Format time: hh:mm A
 */
export const formatTime = (dateValue) => {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '—';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${hoursStr}:${minutes} ${ampm}`;
};

/**
 * Format date for <input type="datetime-local" /> (YYYY-MM-DDTHH:mm)
 */
export const toInputDateTimeLocalFormat = (dateValue) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};


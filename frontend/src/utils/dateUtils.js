/**
 * Format ISO date string or Date object to DD/MM/YYYY
 */
export const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
 * Format date time: DD/MM/YYYY hh:mm A
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) return '—';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}/${month}/${year} ${hoursStr}:${minutes} ${ampm}`;
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

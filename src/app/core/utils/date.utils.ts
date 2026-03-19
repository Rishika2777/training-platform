/**
 * Formats a date as relative time (e.g., "2 hours ago", "1 min ago") for recent dates,
 * or as actual date/time for older dates (more than 2 days ago).
 *
 * @param date - Date string, Date object, or timestamp
 * @returns Formatted string: "X min ago", "X hours ago", "X days ago" (max 2 days), or "M/D/YY, H:MM AM/PM"
 *
 * @example
 * formatRelativeTime('2026-02-19T10:00:00Z') // "2 hours ago" (if current time is 12:00)
 * formatRelativeTime('2026-02-17T10:00:00Z') // "2/17/26, 10:00 AM" (more than 2 days ago)
 */
export function formatRelativeTime(date: string | Date | number | null | undefined): string {
  if (!date) {
    return '';
  }

  let dateObj: Date;
  try {
    if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }

    if (Number.isNaN(dateObj.getTime())) {
      return '';
    }
  } catch {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();

  // If date is in the future, return formatted date
  if (diffMs < 0) {
    return formatDateTime(dateObj);
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Less than 1 minute: "just now" or "1 min ago"
  if (diffMins < 1) {
    return 'just now';
  }

  // Less than 1 hour: "X min ago"
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  }

  // Less than 24 hours: "X hours ago"
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than or equal to 2 days: "X days ago"
  if (diffDays <= 2) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  // More than 2 days: show actual date and time
  return formatDateTime(dateObj);
}

/**
 * Formats a date as "M/D/YY, H:MM AM/PM" (e.g., "2/17/26, 10:00 AM").
 */
function formatDateTime(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${month}/${day}/${year}, ${displayHours}:${displayMinutes} ${ampm}`;
}

import { format, formatDistanceToNow, isToday, isYesterday, isPast } from 'date-fns';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: Date | string | undefined | null): string {
  if (!date) {
    return 'Just now';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Just now';
  }

  if (isToday(d)) {
    return `Today at ${format(d, 'h:mm a')}`;
  }

  if (isYesterday(d)) {
    return `Yesterday at ${format(d, 'h:mm a')}`;
  }

  return formatDistanceToNow(d, { addSuffix: true });
}

export function isDueToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isToday(d);
}

export function isOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isPast(d) && !isToday(d);
}

/**
 * Formats a duration in seconds to a human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2h 30m", "45s", "1.5h")
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) {
    return '—';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
  }

  // For durations over 24 hours
  const days = Math.floor(seconds / 86400);
  const hours = Math.round((seconds % 86400) / 3600);

  if (hours === 0) {
    return `${days}d`;
  }

  return `${days}d ${hours}h`;
}

/**
 * Formats a duration in seconds to a compact decimal format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2.5h", "30m", "45s")
 */
export function formatDurationCompact(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) {
    return '—';
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes}m`;
  }

  // For hours, show one decimal place if meaningful
  const hours = seconds / 3600;
  if (hours >= 10) {
    return `${Math.round(hours)}h`;
  }

  return `${Math.round(hours * 10) / 10}h`;
}

/**
 * Gets a color class for time duration based on predefined ranges
 * @param seconds - Duration in seconds
 * @returns CSS color class string
 */
export function getTimeColorClass(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) {
    return 'text-gray-500';
  }

  // < 30 minutes: green
  if (seconds < 1800) {
    return 'text-green-600 dark:text-green-400';
  }

  // 30 min - 2 hours: yellow
  if (seconds < 7200) {
    return 'text-yellow-600 dark:text-yellow-400';
  }

  // > 2 hours: red
  return 'text-red-600 dark:text-red-400';
}

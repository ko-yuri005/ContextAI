import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(isoDateString?: string | null): string {
  if (!isoDateString || typeof isoDateString !== 'string') {
    return 'Unknown date';
  }
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatRelativeTime(isoDateString?: string | null): string {
  if (!isoDateString || typeof isoDateString !== 'string') {
    return 'Unknown date';
  }

  // If the string is already a formatted relative label (e.g. "Just now"), return it directly
  if (isoDateString.trim().toLowerCase() === 'just now') {
    return 'Just now';
  }

  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) {
    return 'Unknown date';
  }

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return formatDate(isoDateString);
}

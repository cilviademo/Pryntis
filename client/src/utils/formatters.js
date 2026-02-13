/**
 * Shared formatting utilities used across multiple pages.
 * Consolidates duplicated helpers from DashboardPage, AnalyticsPage, BusinessOpsPage, etc.
 */

export function capitalize(str) {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(d) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function objToArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return Object.entries(obj).map(([name, count]) => ({
    name: capitalize(name),
    value: parseInt(count, 10),
  }));
}

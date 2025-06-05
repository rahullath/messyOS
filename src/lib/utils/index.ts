export function toRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  } else if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  } else if (diffSeconds < 2592000) { // 30 days
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

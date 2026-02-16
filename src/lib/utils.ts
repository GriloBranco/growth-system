export function calculateIceScore(calendarUrgency: number, impact: number): number {
  return calendarUrgency * impact;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateRange(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return formatDate(s);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  if (sameMonth) {
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.getDate()}, ${e.getFullYear()}`;
  }
  if (sameYear) {
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${e.getFullYear()}`;
  }
  return `${formatDate(s)} - ${formatDate(e)}`;
}

export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysRemaining(endDate: Date | string): number {
  return daysUntil(endDate);
}

export const SCOPES = [
  "SEO", "Ads", "Social", "Product Growth", "Content", "Email", "Partnerships", "Other"
] as const;

export const EVENT_TYPES = ["test", "break", "milestone", "marketing"] as const;

export const STATUSES = ["not_started", "in_progress", "review", "done"] as const;

export const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export const SCOPE_COLORS: Record<string, string> = {
  SEO: "bg-blue-100 text-blue-800",
  Ads: "bg-orange-100 text-orange-800",
  Social: "bg-pink-100 text-pink-800",
  "Product Growth": "bg-purple-100 text-purple-800",
  Content: "bg-teal-100 text-teal-800",
  Email: "bg-yellow-100 text-yellow-800",
  Partnerships: "bg-indigo-100 text-indigo-800",
  Other: "bg-zinc-100 text-zinc-800",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  test: "bg-red-100 text-red-800",
  break: "bg-zinc-100 text-zinc-600",
  milestone: "bg-blue-100 text-blue-800",
  marketing: "bg-purple-100 text-purple-800",
};

export const EVENT_TYPE_BAR_COLORS: Record<string, string> = {
  test: "bg-red-500",
  break: "bg-zinc-400",
  milestone: "bg-blue-500",
  marketing: "bg-purple-500",
};

export const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-zinc-100 text-zinc-600",
  in_progress: "bg-blue-100 text-blue-800",
  review: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
};

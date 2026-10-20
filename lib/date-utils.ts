import { addDays, format, startOfWeek } from "date-fns";

export function last7Days(from = new Date()) {
  const start = addDays(from, -6);
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

export function last365Days(from = new Date()) {
  // Align to weeks (Sunday start) for the heatmap grid
  const end = from;
  const start = startOfWeek(addDays(end, -371), { weekStartsOn: 0 });
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(format(d, "yyyy-MM-dd"));
  return days;
}

export function completionRatio(total: number, done: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

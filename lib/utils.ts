import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const XP_BY_PRIORITY = { low: 10, medium: 15, high: 20 } as const;

export function levelFromXp(xp: number) {
  // Each level needs 100 * level XP (1 -> 100, 2 -> 300, 3 -> 600, ...)
  let level = 1;
  let required = 100;
  let remaining = xp;
  while (remaining >= required) {
    remaining -= required;
    level += 1;
    required = 100 * level;
  }
  return { level, into: remaining, needed: required };
}

export function todayKey(tz = "UTC") {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(d); // YYYY-MM-DD
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

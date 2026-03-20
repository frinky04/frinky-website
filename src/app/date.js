import { parseDateInput } from "./date-parse.js";

export function parseDate(dateString) {
  return parseDateInput(dateString);
}

export function daysAgo(dateString) {
  const target = parseDate(dateString);
  if (!target) return "";
  const now = new Date();
  const ms = now - target;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days} days ago`;
}

export function yearsAgo(dateString) {
  const target = parseDate(dateString);
  if (!target) return null;

  const now = new Date();
  let years = now.getFullYear() - target.getFullYear();
  const hasHadBirthday =
    now.getMonth() > target.getMonth() ||
    (now.getMonth() === target.getMonth() && now.getDate() >= target.getDate());

  if (!hasHadBirthday) years -= 1;
  return Math.max(years, 0);
}

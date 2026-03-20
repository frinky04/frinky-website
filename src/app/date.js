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
  if (days < 0) return "";
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

export function formatEntryMeta(item, type) {
  if (type === "experience") return item?.meta ?? "";
  if (type === "game") return daysAgo(item?.sortDate || item?.date) || item?.date || item?.meta || "";
  return daysAgo(item?.sortDate || item?.date) || item?.meta || "";
}

export function formatDateWithRelative(item) {
  const dateText = item?.date || "";
  const relative = daysAgo(item?.sortDate || item?.date);
  if (!dateText) return relative || "";
  return `${dateText}${relative ? ` (${relative})` : ""}`;
}

export function formatBirthDateLabel(dateString) {
  const birthDate = String(dateString || "").trim();
  if (!birthDate) return "";

  const age = yearsAgo(birthDate);
  const suffix = typeof age === "number" && age >= 0 ? ` (${age} years ago)` : "";
  return `Born ${birthDate}${suffix}`;
}

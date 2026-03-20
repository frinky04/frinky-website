import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

const STRICT_DATE_FORMATS = [
  "YYYY-MM-DD",
  "YYYY-M-D",
  "YYYY/MM/DD",
  "YYYY/M/D",
  "YYYY.MM.DD",
  "YYYYMMDD",
  "D/M/YYYY",
  "DD/MM/YYYY",
  "D-M-YYYY",
  "DD-MM-YYYY",
  "D.M.YYYY",
  "DD.MM.YYYY",
  "M/D/YYYY",
  "MM/DD/YYYY",
  "M-D-YYYY",
  "MM-DD-YYYY",
  "D MMM YYYY",
  "DD MMM YYYY",
  "D MMMM YYYY",
  "DD MMMM YYYY",
  "MMM D YYYY",
  "MMMM D YYYY",
  "D MMM, YYYY",
  "DD MMM, YYYY",
  "D MMMM, YYYY",
  "DD MMMM, YYYY",
  "MMM D, YYYY",
  "MMMM D, YYYY",
];

export function parseDateInput(input) {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  const strict = dayjs(value, STRICT_DATE_FORMATS, true);
  if (strict.isValid()) return strict.toDate();

  const fallback = dayjs(value);
  if (fallback.isValid()) return fallback.toDate();

  return null;
}

export function parseDateInputToEpoch(input) {
  const parsed = parseDateInput(input);
  return parsed ? parsed.getTime() : 0;
}

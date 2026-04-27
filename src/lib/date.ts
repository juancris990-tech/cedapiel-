// Date helpers to avoid timezone off-by-one issues with date-only strings (YYYY-MM-DD).
// JS Date parsing treats YYYY-MM-DD as UTC, which can display the previous day in negative timezones.

export function parseDateOnlyToLocal(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);

  const parts = dateStr.split("-").map((p) => Number(p));
  const [year, month, day] = parts;

  if (!year || !month || !day) {
    // Fallback for unexpected formats
    return new Date(dateStr);
  }

  // Use noon local time to avoid DST/offset edge cases around midnight.
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

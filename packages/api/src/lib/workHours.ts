export function isWithinWorkHours(
  startMinutes: number | null | undefined,
  endMinutes: number | null | undefined,
  workDaysJson: string | null | undefined,
  now = new Date()
): boolean {
  if (startMinutes == null || endMinutes == null) return true;

  let workDays: number[] = [1, 2, 3, 4, 5];
  if (workDaysJson) {
    try {
      workDays = JSON.parse(workDaysJson) as number[];
    } catch {
      /* keep default */
    }
  }

  const day = now.getDay() === 0 ? 7 : now.getDay();
  if (!workDays.includes(day)) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  if (startMinutes <= endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }
  return minutes >= startMinutes || minutes < endMinutes;
}

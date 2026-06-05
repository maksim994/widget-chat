const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
];

export { DAY_LABELS };

export function parseWorkDays(json: string | null): number[] {
  if (!json) return [1, 2, 3, 4, 5];
  try {
    const arr = JSON.parse(json) as number[];
    return Array.isArray(arr) ? arr : [1, 2, 3, 4, 5];
  } catch {
    return [1, 2, 3, 4, 5];
  }
}

export function minutesToTime(m: number | null): string {
  const v = m ?? 540;
  const h = Math.floor(v / 60);
  const min = v % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 540;
  return h * 60 + m;
}

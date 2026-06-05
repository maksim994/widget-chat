declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

export function reachGoal(counterId: string | null | undefined, goal: string) {
  if (!counterId) return;
  const id = parseInt(counterId, 10);
  if (!id || Number.isNaN(id)) return;
  try {
    if (typeof window.ym === "function") {
      window.ym(id, "reachGoal", goal);
    }
  } catch {
    /* Metrika not loaded on host page */
  }
}

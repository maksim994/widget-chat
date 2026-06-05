import type { Request, Response } from "express";
import { apiError } from "@widget/shared";

export function notFound(_req: Request, res: Response) {
  res.status(404).json(apiError("Маршрут не найден", "NOT_FOUND"));
}

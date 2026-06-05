import type { Request, Response, NextFunction } from "express";
import { apiError } from "@widget/shared";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json(apiError("Внутренняя ошибка сервера", "INTERNAL"));
}

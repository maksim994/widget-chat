import rateLimit from "express-rate-limit";
import { apiError } from "@widget/shared";

export const widgetReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(apiError("Слишком много запросов. Подождите минуту.", "RATE_LIMIT"));
  },
});

export const widgetWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(apiError("Слишком много сообщений. Подождите минуту.", "RATE_LIMIT"));
  },
});

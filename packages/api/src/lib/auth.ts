import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export type JwtPayload = {
  userId: string;
  companyId: string;
  role: UserRole;
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function authMiddleware(
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Требуется авторизация", code: "UNAUTHORIZED" } });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: { message: "Сессия недействительна", code: "INVALID_TOKEN" } });
  }
}

export function requireAdmin(
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

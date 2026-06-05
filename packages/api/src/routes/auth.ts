import { Router } from "express";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema, apiError } from "@widget/shared";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, signToken } from "../lib/auth.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      apiError(parsed.error.errors[0]?.message ?? "Некорректные данные", "VALIDATION", parsed.error.flatten())
    );
    return;
  }
  const { companyName, email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json(apiError("Email уже зарегистрирован", "EMAIL_TAKEN"));
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const company = await prisma.company.create({
    data: {
      name: companyName,
      users: {
        create: { email, passwordHash, name, role: "ADMIN" },
      },
    },
    include: { users: true },
  });

  const user = company.users[0];
  const token = signToken({
    userId: user.id,
    companyId: company.id,
    role: user.role,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: company.id,
      companyName: company.name,
    },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      apiError(parsed.error.errors[0]?.message ?? "Некорректные данные", "VALIDATION")
    );
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { company: true },
  });

  if (!user || !user.active) {
    res.status(401).json(apiError("Неверный email или пароль", "INVALID_CREDENTIALS"));
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json(apiError("Неверный email или пароль", "INVALID_CREDENTIALS"));
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });

  const token = signToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company.name,
    },
  });
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { company: true },
  });
  if (!user || !user.active) {
    res.status(401).json(apiError("Сессия недействительна", "SESSION_EXPIRED"));
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.companyId,
    companyName: user.company.name,
  });
});

authRouter.post("/heartbeat", authMiddleware, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { lastSeenAt: new Date() },
  });
  res.json({ ok: true });
});

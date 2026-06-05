import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireAdmin } from "../lib/auth.js";

export const operatorsRouter = Router();
operatorsRouter.use(authMiddleware, requireAdmin);

operatorsRouter.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { companyId: req.user!.companyId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastSeenAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "OPERATOR"]).default("OPERATOR"),
});

operatorsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) {
    res.status(409).json({ error: "Email taken" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      companyId: req.user!.companyId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  res.status(201).json(user);
});

operatorsRouter.patch("/:id", async (req, res) => {
  const schema = z.object({
    name: z.string().optional(),
    active: z.boolean().optional(),
    role: z.enum(["ADMIN", "OPERATOR"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, companyId: req.user!.companyId },
  });
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  res.json(updated);
});

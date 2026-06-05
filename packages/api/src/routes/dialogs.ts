import { Router } from "express";
import { z } from "zod";
import type { DialogStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../lib/auth.js";
import { emitToDialog, emitToCompany } from "../lib/socket.js";
import { METRIKA_EVENTS } from "../lib/metrika.js";

export const dialogsRouter = Router();
dialogsRouter.use(authMiddleware);

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

async function countOnlineOperators(companyId: string) {
  const since = new Date(Date.now() - ONLINE_THRESHOLD_MS);
  return prisma.user.count({
    where: {
      companyId,
      active: true,
      lastSeenAt: { gte: since },
    },
  });
}

dialogsRouter.get("/online-count", async (req, res) => {
  const count = await countOnlineOperators(req.user!.companyId);
  res.json({ count });
});

dialogsRouter.get("/", async (req, res) => {
  const status = req.query.status as DialogStatus | undefined;
  const siteId = req.query.siteId as string | undefined;
  const q = (req.query.q as string)?.trim();

  const dialogs = await prisma.dialog.findMany({
    where: {
      site: { companyId: req.user!.companyId },
      ...(status ? { status } : {}),
      ...(siteId ? { siteId } : {}),
      ...(q
        ? {
            OR: [
              { visitor: { name: { contains: q } } },
              { visitor: { email: { contains: q } } },
              { visitor: { phone: { contains: q } } },
              { messages: { some: { body: { contains: q } } } },
            ],
          }
        : {}),
    },
    include: {
      site: { select: { id: true, name: true, domain: true } },
      visitor: { select: { id: true, name: true, email: true, phone: true } },
      operator: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  res.json(
    dialogs.map((d) => ({
      ...d,
      lastMessage: d.messages[0] ?? null,
      messages: undefined,
    }))
  );
});

dialogsRouter.get("/:id", async (req, res) => {
  const dialog = await prisma.dialog.findFirst({
    where: {
      id: req.params.id,
      site: { companyId: req.user!.companyId },
    },
    include: {
      site: true,
      visitor: true,
      operator: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!dialog) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(dialog);
});

const messageSchema = z.object({ body: z.string().min(1).max(4000) });

dialogsRouter.post("/:id/messages", async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const dialog = await prisma.dialog.findFirst({
    where: {
      id: req.params.id,
      site: { companyId: req.user!.companyId },
    },
  });
  if (!dialog || dialog.status === "CLOSED") {
    res.status(404).json({ error: "Dialog not available" });
    return;
  }

  const operator = await prisma.user.findUnique({
    where: { id: req.user!.userId },
  });

  const now = new Date();
  const message = await prisma.message.create({
    data: {
      dialogId: dialog.id,
      sender: "OPERATOR",
      body: parsed.data.body,
      status: "DELIVERED",
    },
  });

  const updates: {
    status?: DialogStatus;
    operatorId?: string;
    firstResponseAt?: Date;
  } = {
    status: "WAITING_VISITOR",
    operatorId: dialog.operatorId ?? req.user!.userId,
  };
  if (!dialog.firstResponseAt) {
    updates.firstResponseAt = now;
  }

  const updated = await prisma.dialog.update({
    where: { id: dialog.id },
    data: updates,
    include: {
      site: { select: { id: true, name: true, metrikaCounterId: true } },
      visitor: true,
    },
  });

  const payload = {
    message,
    dialog: updated,
    operatorName: operator?.name,
    metrikaEvent: METRIKA_EVENTS.OPERATOR_REPLIED,
    metrikaCounterId: updated.site.metrikaCounterId,
  };

  emitToDialog(dialog.id, "message", payload);
  emitToCompany(req.user!.companyId, "dialog:updated", { dialogId: dialog.id });

  res.status(201).json(message);
});

const patchSchema = z.object({
  status: z
    .enum(["NEW", "IN_PROGRESS", "WAITING_VISITOR", "CLOSED", "OFFLINE"])
    .optional(),
  operatorId: z.string().nullable().optional(),
});

dialogsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const dialog = await prisma.dialog.findFirst({
    where: {
      id: req.params.id,
      site: { companyId: req.user!.companyId },
    },
    include: { site: true },
  });
  if (!dialog) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const data: {
    status?: DialogStatus;
    operatorId?: string | null;
    closedAt?: Date | null;
  } = {};
  if (parsed.data.status) {
    data.status = parsed.data.status;
    if (parsed.data.status === "CLOSED") {
      data.closedAt = new Date();
    } else {
      data.closedAt = null;
    }
  }
  if (parsed.data.operatorId !== undefined) {
    data.operatorId = parsed.data.operatorId;
  }

  const updated = await prisma.dialog.update({
    where: { id: dialog.id },
    data,
    include: { site: true, visitor: true, operator: true },
  });

  if (parsed.data.status === "CLOSED") {
    emitToDialog(dialog.id, "dialog:closed", {
      metrikaEvent: METRIKA_EVENTS.DIALOG_CLOSED,
      metrikaCounterId: dialog.site.metrikaCounterId,
    });
  }

  emitToCompany(req.user!.companyId, "dialog:updated", { dialogId: dialog.id });
  res.json(updated);
});

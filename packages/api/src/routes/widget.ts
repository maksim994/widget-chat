import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma.js";
import { isWithinWorkHours } from "../lib/workHours.js";
import { emitToCompany } from "../lib/socket.js";
import { METRIKA_EVENTS } from "../lib/metrika.js";
import { widgetReadLimiter, widgetWriteLimiter } from "../middleware/widget-rate-limit.js";

export const widgetRouter = Router();

widgetRouter.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    widgetReadLimiter(req, res, next);
  } else {
    widgetWriteLimiter(req, res, next);
  }
});

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

async function getSiteByKey(publicKey: string) {
  return prisma.site.findUnique({
    where: { publicKey },
    include: { company: true },
  });
}

async function countOnlineOperators(companyId: string) {
  const since = new Date(Date.now() - ONLINE_THRESHOLD_MS);
  return prisma.user.count({
    where: {
      companyId,
      active: true,
      role: { in: ["ADMIN", "OPERATOR"] },
      lastSeenAt: { gte: since },
    },
  });
}

widgetRouter.get("/config/:publicKey", async (req, res) => {
  const site = await getSiteByKey(req.params.publicKey);
  if (!site || !site.active) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const onlineCount = await countOnlineOperators(site.companyId);
  const inWorkHours = isWithinWorkHours(
    site.workHoursStart,
    site.workHoursEnd,
    site.workDays
  );
  const operatorsOnline = onlineCount > 0 && inWorkHours;

  res.json({
    siteKey: site.publicKey,
    title: site.widgetTitle,
    color: site.widgetColor,
    greeting: site.widgetGreeting,
    position: site.widgetPosition,
    offlineMessage: site.offlineMessage,
    metrikaCounterId: site.metrikaCounterId,
    operatorsOnline,
    offlineMode: !operatorsOnline,
  });
});

const sessionSchema = z.object({
  sessionToken: z.string().optional(),
});

widgetRouter.post("/session/:publicKey", async (req, res) => {
  const site = await getSiteByKey(req.params.publicKey);
  if (!site || !site.active) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const parsed = sessionSchema.safeParse(req.body);
  let token = parsed.success ? parsed.data.sessionToken : undefined;

  let visitor = token
    ? await prisma.visitor.findUnique({ where: { sessionToken: token } })
    : null;

  if (!visitor) {
    token = randomBytes(24).toString("hex");
    visitor = await prisma.visitor.create({
      data: { sessionToken: token },
    });
  }

  const openDialog = await prisma.dialog.findFirst({
    where: {
      visitorId: visitor.id,
      siteId: site.id,
      status: { not: "CLOSED" },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      visitor: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json({
    sessionToken: visitor.sessionToken,
    visitor: {
      name: visitor.name,
      email: visitor.email,
      phone: visitor.phone,
      hasContact: !!(visitor.name && (visitor.email || visitor.phone)),
    },
    dialog: openDialog,
  });
});

const contextSchema = z.object({
  pageUrl: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
});

const startDialogSchema = z.object({
  sessionToken: z.string(),
  message: z.string().min(1).max(4000),
  context: contextSchema.optional(),
});

widgetRouter.post("/dialog/:publicKey/start", async (req, res) => {
  const site = await getSiteByKey(req.params.publicKey);
  if (!site || !site.active) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const parsed = startDialogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const visitor = await prisma.visitor.findUnique({
    where: { sessionToken: parsed.data.sessionToken },
  });
  if (!visitor) {
    res.status(400).json({ error: "Invalid session" });
    return;
  }

  const ctx = parsed.data.context ?? {};
  let dialog = await prisma.dialog.findFirst({
    where: {
      visitorId: visitor.id,
      siteId: site.id,
      status: { not: "CLOSED" },
    },
  });

  if (!dialog) {
    dialog = await prisma.dialog.create({
      data: {
        companyId: site.companyId,
        siteId: site.id,
        visitorId: visitor.id,
        status: "NEW",
        pageUrl: ctx.pageUrl,
        utmSource: ctx.utmSource,
        utmMedium: ctx.utmMedium,
        utmCampaign: ctx.utmCampaign,
        utmContent: ctx.utmContent,
        utmTerm: ctx.utmTerm,
      },
    });
  }

  const message = await prisma.message.create({
    data: {
      dialogId: dialog.id,
      sender: "VISITOR",
      body: parsed.data.message,
      status: "DELIVERED",
    },
  });

  await prisma.dialog.update({
    where: { id: dialog.id },
    data: { updatedAt: new Date() },
  });

  const full = await prisma.dialog.findUnique({
    where: { id: dialog.id },
    include: {
      site: true,
      visitor: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  emitToCompany(site.companyId, "dialog:new", { dialog: full });

  const needsContact = !(visitor.name && (visitor.email || visitor.phone));

  res.status(201).json({
    dialog: full,
    message,
    needsContact,
    metrikaEvents: {
      firstMessage: METRIKA_EVENTS.FIRST_MESSAGE,
      contactRequested: needsContact ? METRIKA_EVENTS.CONTACT_REQUESTED : null,
    },
    metrikaCounterId: site.metrikaCounterId,
  });
});

const contactSchema = z.object({
  sessionToken: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

widgetRouter.post("/contact/:publicKey", async (req, res) => {
  const site = await getSiteByKey(req.params.publicKey);
  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!parsed.data.email && !parsed.data.phone) {
    res.status(400).json({ error: "Email or phone required" });
    return;
  }

  const visitor = await prisma.visitor.update({
    where: { sessionToken: parsed.data.sessionToken },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
    },
  });

  res.json({
    visitor,
    metrikaEvent: METRIKA_EVENTS.CONTACT_SUBMITTED,
    metrikaCounterId: site.metrikaCounterId,
  });
});

const visitorMessageSchema = z.object({
  sessionToken: z.string(),
  dialogId: z.string(),
  body: z.string().min(1).max(4000),
});

widgetRouter.post("/message/:publicKey", async (req, res) => {
  const site = await getSiteByKey(req.params.publicKey);
  if (!site) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const parsed = visitorMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const dialog = await prisma.dialog.findFirst({
    where: {
      id: parsed.data.dialogId,
      siteId: site.id,
      visitor: { sessionToken: parsed.data.sessionToken },
      status: { not: "CLOSED" },
    },
  });
  if (!dialog) {
    res.status(404).json({ error: "Dialog not found" });
    return;
  }

  const message = await prisma.message.create({
    data: {
      dialogId: dialog.id,
      sender: "VISITOR",
      body: parsed.data.body,
      status: "DELIVERED",
    },
  });

  await prisma.dialog.update({
    where: { id: dialog.id },
    data: { status: dialog.status === "WAITING_VISITOR" ? "IN_PROGRESS" : dialog.status, updatedAt: new Date() },
  });

  emitToCompany(site.companyId, "dialog:updated", { dialogId: dialog.id });

  res.status(201).json({ message });
});

const readSchema = z.object({
  sessionToken: z.string(),
  dialogId: z.string(),
});

widgetRouter.post("/dialog/:publicKey/read", async (req, res) => {
  const site = await getSiteByKey(req.params.publicKey);
  if (!site || !site.active) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const parsed = readSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const dialog = await prisma.dialog.findFirst({
    where: {
      id: parsed.data.dialogId,
      siteId: site.id,
      visitor: { sessionToken: parsed.data.sessionToken },
    },
  });
  if (!dialog) {
    res.status(404).json({ error: "Dialog not found" });
    return;
  }

  const updated = await prisma.message.updateMany({
    where: {
      dialogId: dialog.id,
      sender: "OPERATOR",
      status: "DELIVERED",
    },
    data: { status: "READ" },
  });

  if (updated.count > 0) {
    emitToCompany(site.companyId, "dialog:updated", { dialogId: dialog.id });
  }

  res.json({ updated: updated.count });
});

const offlineSchema = z.object({
  sessionToken: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  message: z.string().min(1).max(4000),
  context: contextSchema.optional(),
});

widgetRouter.post("/offline/:publicKey", async (req, res) => {
  const site = await getSiteByKey(req.params.publicKey);
  if (!site || !site.active) {
    res.status(404).json({ error: "Site not found" });
    return;
  }

  const parsed = offlineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!parsed.data.email && !parsed.data.phone) {
    res.status(400).json({ error: "Email or phone required" });
    return;
  }

  let token = parsed.data.sessionToken;
  let visitor = token
    ? await prisma.visitor.findUnique({ where: { sessionToken: token } })
    : null;

  if (!visitor) {
    token = randomBytes(24).toString("hex");
    visitor = await prisma.visitor.create({
      data: {
        sessionToken: token,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
      },
    });
  } else {
    visitor = await prisma.visitor.update({
      where: { id: visitor.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
      },
    });
  }

  const ctx = parsed.data.context ?? {};
  const dialog = await prisma.dialog.create({
    data: {
      companyId: site.companyId,
      siteId: site.id,
      visitorId: visitor.id,
      status: "NEW",
      isOffline: true,
      pageUrl: ctx.pageUrl,
      utmSource: ctx.utmSource,
      utmMedium: ctx.utmMedium,
      utmCampaign: ctx.utmCampaign,
      utmContent: ctx.utmContent,
      utmTerm: ctx.utmTerm,
      messages: {
        create: {
          sender: "VISITOR",
          body: parsed.data.message,
          status: "DELIVERED",
        },
      },
    },
    include: {
      site: true,
      visitor: true,
      messages: true,
    },
  });

  emitToCompany(site.companyId, "dialog:new", { dialog });

  res.status(201).json({
    sessionToken: visitor.sessionToken,
    dialog,
    metrikaEvent: METRIKA_EVENTS.OFFLINE_SUBMITTED,
    metrikaCounterId: site.metrikaCounterId,
  });
});

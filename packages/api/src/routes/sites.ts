import { Router } from "express";
import { z } from "zod";
import { apiError } from "@widget/shared";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, requireAdmin } from "../lib/auth.js";

export const sitesRouter = Router();
sitesRouter.use(authMiddleware);

sitesRouter.get("/", async (req, res) => {
  const sites = await prisma.site.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: { createdAt: "desc" },
  });
  res.json(sites);
});

const siteSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  active: z.boolean().optional(),
  widgetColor: z.string().optional(),
  widgetTitle: z.string().optional(),
  widgetGreeting: z.string().optional(),
  widgetPosition: z.enum(["left", "right"]).optional(),
  offlineMessage: z.string().optional(),
  metrikaCounterId: z.string().nullable().optional(),
  workHoursStart: z.number().int().min(0).max(1439).nullable().optional(),
  workHoursEnd: z.number().int().min(0).max(1439).nullable().optional(),
  workDays: z.array(z.number().int().min(1).max(7)).optional(),
});

sitesRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = siteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      apiError(parsed.error.errors[0]?.message ?? "Некорректные данные", "VALIDATION")
    );
    return;
  }
  const d = parsed.data;
  const site = await prisma.site.create({
    data: {
      companyId: req.user!.companyId,
      name: d.name,
      domain: d.domain,
      active: d.active ?? true,
      widgetColor: d.widgetColor,
      widgetTitle: d.widgetTitle,
      widgetGreeting: d.widgetGreeting,
      widgetPosition: d.widgetPosition,
      offlineMessage: d.offlineMessage,
      metrikaCounterId: d.metrikaCounterId ?? undefined,
      workHoursStart: d.workHoursStart ?? undefined,
      workHoursEnd: d.workHoursEnd ?? undefined,
      workDays: d.workDays ? JSON.stringify(d.workDays) : undefined,
    },
  });
  res.status(201).json(site);
});

sitesRouter.patch("/:id", requireAdmin, async (req, res) => {
  const parsed = siteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(
      apiError(parsed.error.errors[0]?.message ?? "Некорректные данные", "VALIDATION")
    );
    return;
  }
  const siteId = String(req.params.id);
  const existing = await prisma.site.findFirst({
    where: { id: siteId, companyId: req.user!.companyId },
  });
  if (!existing) {
    res.status(404).json(apiError("Сайт не найден", "NOT_FOUND"));
    return;
  }

  const d = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (d.name !== undefined) updateData.name = d.name;
  if (d.domain !== undefined) updateData.domain = d.domain;
  if (d.active !== undefined) updateData.active = d.active;
  if (d.widgetColor !== undefined) updateData.widgetColor = d.widgetColor;
  if (d.widgetTitle !== undefined) updateData.widgetTitle = d.widgetTitle;
  if (d.widgetGreeting !== undefined) updateData.widgetGreeting = d.widgetGreeting;
  if (d.widgetPosition !== undefined) updateData.widgetPosition = d.widgetPosition;
  if (d.offlineMessage !== undefined) updateData.offlineMessage = d.offlineMessage;
  if (d.metrikaCounterId !== undefined) updateData.metrikaCounterId = d.metrikaCounterId;
  if (d.workHoursStart !== undefined) updateData.workHoursStart = d.workHoursStart;
  if (d.workHoursEnd !== undefined) updateData.workHoursEnd = d.workHoursEnd;
  if (d.workDays !== undefined) updateData.workDays = JSON.stringify(d.workDays);

  const site = await prisma.site.update({
    where: { id: existing.id },
    data: updateData,
  });
  res.json(site);
});

sitesRouter.get("/:id/embed", async (req, res) => {
  const siteId = String(req.params.id);
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: req.user!.companyId },
  });
  if (!site) {
    res.status(404).json(apiError("Сайт не найден", "NOT_FOUND"));
    return;
  }
  const apiUrl = process.env.PUBLIC_API_URL ?? "http://localhost:3001";
  const widgetUrl = process.env.PUBLIC_WIDGET_URL ?? apiUrl;
  res.json({
    publicKey: site.publicKey,
    snippet: `<script>
  (function(w,d,s,k,u){
    w.WidgetChat=w.WidgetChat||{q:[]};
    w.WidgetChat.init=function(o){w.WidgetChat.q.push(['init',o]);};
    var e=d.createElement(s);e.async=1;e.src=u+'/widget.js';
    e.onload=function(){WidgetChat.init({siteKey:'${site.publicKey}',apiUrl:'${apiUrl}'});};
    d.head.appendChild(e);
  })(window,document,'script','${site.publicKey}','${widgetUrl}');
</script>`,
  });
});

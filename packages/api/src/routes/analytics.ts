import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../lib/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(authMiddleware);

analyticsRouter.get("/summary", async (req, res) => {
  const siteId = req.query.siteId as string | undefined;
  const days = Math.min(parseInt(String(req.query.days ?? "30"), 10) || 30, 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const companyId = req.user!.companyId;

  const siteFilter = siteId
    ? { siteId, site: { companyId } }
    : { site: { companyId } };

  const dialogs = await prisma.dialog.findMany({
    where: { ...siteFilter, createdAt: { gte: since } },
    select: {
      id: true,
      status: true,
      isOffline: true,
      siteId: true,
      pageUrl: true,
      utmSource: true,
      firstMessageAt: true,
      firstResponseAt: true,
      visitor: { select: { email: true, phone: true, name: true } },
      site: { select: { id: true, name: true } },
    },
  });

  const withContact = dialogs.filter(
    (d) => d.visitor.name && (d.visitor.email || d.visitor.phone)
  ).length;

  const offlineCount = dialogs.filter((d) => d.isOffline).length;

  const responseTimes = dialogs
    .filter((d) => d.firstResponseAt)
    .map(
      (d) =>
        (d.firstResponseAt!.getTime() - d.firstMessageAt.getTime()) / 1000
    );
  const avgFirstResponseSec =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        )
      : null;

  const bySite: Record<string, { name: string; count: number }> = {};
  const byPage: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const d of dialogs) {
    const sid = d.site.id;
    if (!bySite[sid]) bySite[sid] = { name: d.site.name, count: 0 };
    bySite[sid].count++;
    if (d.pageUrl) byPage[d.pageUrl] = (byPage[d.pageUrl] ?? 0) + 1;
    const src = d.utmSource ?? "(direct)";
    bySource[src] = (bySource[src] ?? 0) + 1;
  }

  res.json({
    periodDays: days,
    totalDialogs: dialogs.length,
    leadsWithContact: withContact,
    offlineRequests: offlineCount,
    avgFirstResponseSec,
    bySite: Object.entries(bySite).map(([id, v]) => ({
      siteId: id,
      siteName: v.name,
      count: v.count,
    })),
    topPages: Object.entries(byPage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([url, count]) => ({ url, count })),
    topSources: Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, count]) => ({ source, count })),
  });
});

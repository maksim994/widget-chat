import { useEffect, useState } from "react";
import { api, type Site } from "../lib/api";

type Summary = {
  periodDays: number;
  totalDialogs: number;
  leadsWithContact: number;
  offlineRequests: number;
  avgFirstResponseSec: number | null;
  bySite: { siteId: string; siteName: string; count: number }[];
  topPages: { url: string; count: number }[];
  topSources: { source: string; count: number }[];
};

const PERIODS = [
  { value: 7, label: "7 дней" },
  { value: 14, label: "14 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
];

export default function AnalyticsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Site[]>("/api/sites").then(setSites);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (siteId) params.set("siteId", siteId);
    api<Summary>(`/api/analytics/summary?${params}`)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteId, days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Аналитика</h2>
          <p className="text-theme-sm text-gray-500">
            Статистика по диалогам и лидам
            {summary ? ` · период ${summary.periodDays} дн.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            <option value="">Все сайты</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && !summary && (
        <div className="flex justify-center py-12">
          <span className="text-gray-500">Загрузка...</span>
        </div>
      )}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Диалоги", summary.totalDialogs],
              ["Лиды с контактом", summary.leadsWithContact],
              ["Офлайн-заявки", summary.offlineRequests],
              [
                "Среднее время 1-го ответа",
                summary.avgFirstResponseSec != null ? `${summary.avgFirstResponseSec} сек` : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              >
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-white/90">По сайтам</h3>
              {summary.bySite.length === 0 ? (
                <p className="text-sm text-gray-500">Нет данных за период</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {summary.bySite.map((r) => (
                      <tr key={r.siteId} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2">{r.siteName}</td>
                        <td className="py-2 text-right font-medium">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-white/90">Источники (UTM)</h3>
              {summary.topSources.length === 0 ? (
                <p className="text-sm text-gray-500">Нет данных</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {summary.topSources.map((s) => (
                      <tr key={s.source} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2">{s.source}</td>
                        <td className="py-2 text-right">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {summary.topPages.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 font-medium text-gray-800 dark:text-white/90">Топ страниц</h3>
              <table className="w-full text-sm">
                <tbody>
                  {summary.topPages.map((p) => (
                    <tr key={p.url} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 break-all text-gray-600">{p.url}</td>
                      <td className="py-2 text-right font-medium w-16">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            События в Яндекс Метрике: chat_widget_shown, chat_widget_opened, chat_first_message_sent,
            chat_contact_submitted, chat_operator_replied, chat_offline_form_submitted, chat_dialog_closed.
            Подробнее в разделе документации.
          </div>
        </>
      )}
    </div>
  );
}

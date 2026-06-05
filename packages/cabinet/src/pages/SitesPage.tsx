import { useEffect, useState } from "react";
import { api, ApiError, type Site } from "../lib/api";
import Button from "../components/ui/Button";
import { Field, TextInput, TextArea, ColorInput } from "../components/form/Field";
import { DAY_LABELS, parseWorkDays, minutesToTime, timeToMinutes } from "../lib/workHours";

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-900";

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [editing, setEditing] = useState<Site | null>(null);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [embed, setEmbed] = useState("");
  const [form, setForm] = useState({ name: "", domain: "", metrikaCounterId: "" });
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setSites(await api<Site[]>("/api/sites"));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  function openEdit(site: Site) {
    setSaveError("");
    setEditing({ ...site });
    setWorkDays(parseWorkDays(site.workDays));
  }

  function toggleDay(day: number) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/sites", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          metrikaCounterId: form.metrikaCounterId || null,
          workDays: [1, 2, 3, 4, 5, 6, 7],
          workHoursStart: null,
          workHoursEnd: null,
        }),
      });
      setForm({ name: "", domain: "", metrikaCounterId: "" });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Не удалось добавить сайт");
    }
  }

  async function saveSite() {
    if (!editing) return;
    setSaveError("");
    setSaving(true);
    try {
      await api(`/api/sites/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editing.name,
          domain: editing.domain,
          active: editing.active,
          widgetTitle: editing.widgetTitle,
          widgetGreeting: editing.widgetGreeting,
          widgetColor: editing.widgetColor,
          widgetPosition: editing.widgetPosition,
          offlineMessage: editing.offlineMessage,
          metrikaCounterId: editing.metrikaCounterId || null,
          workHoursStart: editing.workHoursStart,
          workHoursEnd: editing.workHoursEnd,
          workDays: workDays.length ? workDays : [1, 2, 3, 4, 5],
        }),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(embed);
      alert("Код скопирован в буфер обмена");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Сайты</h2>
        <p className="text-theme-sm text-gray-500">
          Подключение виджета и настройки по каждому домену.{" "}
          <a href="/help" className="text-brand-500 hover:underline">
            Инструкция по установке
          </a>
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 font-medium text-gray-800 dark:text-white/90">Добавить сайт</h3>
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Field label="Название">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Мой сайт" required />
          </Field>
          <Field label="Домен">
            <TextInput value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" required />
          </Field>
          <Field label="ID Яндекс Метрики">
            <TextInput value={form.metrikaCounterId} onChange={(e) => setForm({ ...form, metrikaCounterId: e.target.value })} placeholder="12345678" />
          </Field>
          <div className="sm:col-span-2 lg:col-span-1">
            <Button type="submit" size="sm" className="w-full sm:w-auto">Добавить</Button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Название</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Домен</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Статус</th>
              <th className="px-5 py-3 text-left font-medium text-gray-600">Ключ</th>
              <th className="px-5 py-3 text-right font-medium text-gray-600">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sites.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-5 py-3 font-medium text-gray-800 dark:text-white/90">{s.name}</td>
                <td className="px-5 py-3 text-gray-600">{s.domain}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.active ? "bg-success-50 text-success-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.active ? "Активен" : "Выключен"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">{s.publicKey}</code>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Настроить</Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await api<{ snippet: string }>(`/api/sites/${s.id}/embed`);
                          setEmbed(res.snippet);
                        } catch (err) {
                          alert(err instanceof ApiError ? err.message : "Ошибка");
                        }
                      }}
                    >
                      Код
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/60 p-4" role="dialog" aria-modal>
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Настройки: {editing.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{editing.domain}</p>
            </div>
            <div className="space-y-4 overflow-y-auto custom-scrollbar px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Название сайта">
                  <TextInput value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </Field>
                <Field label="Домен">
                  <TextInput value={editing.domain} onChange={(e) => setEditing({ ...editing, domain: e.target.value })} />
                </Field>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-500"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Сайт активен (виджет работает)</span>
              </label>

              <Field label="Позиция кнопки виджета">
                <select
                  className={selectClass}
                  value={editing.widgetPosition}
                  onChange={(e) => setEditing({ ...editing, widgetPosition: e.target.value })}
                >
                  <option value="right">Справа внизу</option>
                  <option value="left">Слева внизу</option>
                </select>
              </Field>

              <Field label="Заголовок в виджете">
                <TextInput value={editing.widgetTitle} onChange={(e) => setEditing({ ...editing, widgetTitle: e.target.value })} />
              </Field>
              <Field label="Приветствие">
                <TextArea value={editing.widgetGreeting} onChange={(e) => setEditing({ ...editing, widgetGreeting: e.target.value })} rows={2} />
              </Field>
              <Field label="Цвет виджета">
                <ColorInput value={editing.widgetColor} onChange={(c) => setEditing({ ...editing, widgetColor: c })} />
              </Field>
              <Field label="Текст офлайн-формы">
                <TextArea value={editing.offlineMessage} onChange={(e) => setEditing({ ...editing, offlineMessage: e.target.value })} rows={2} />
              </Field>

              <div>
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Рабочие дни</span>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition ${
                        workDays.includes(d.value)
                          ? "border-brand-500 bg-brand-50 text-brand-600"
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="size-4 rounded border-gray-300"
                  checked={editing.workHoursStart == null && editing.workHoursEnd == null}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditing({ ...editing, workHoursStart: null, workHoursEnd: null });
                    } else {
                      setEditing({ ...editing, workHoursStart: 540, workHoursEnd: 1080 });
                    }
                  }}
                />
                Круглосуточно (чат доступен, когда оператор онлайн)
              </label>
              {editing.workHoursStart != null && editing.workHoursEnd != null && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Начало рабочего дня">
                    <input
                      type="time"
                      className={selectClass}
                      value={minutesToTime(editing.workHoursStart)}
                      onChange={(e) =>
                        setEditing({ ...editing, workHoursStart: timeToMinutes(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Конец рабочего дня">
                    <input
                      type="time"
                      className={selectClass}
                      value={minutesToTime(editing.workHoursEnd)}
                      onChange={(e) =>
                        setEditing({ ...editing, workHoursEnd: timeToMinutes(e.target.value) })
                      }
                    />
                  </Field>
                </div>
              )}
              <p className="text-xs text-gray-500 -mt-2">
                Офлайн-форма показывается, если нет операторов в кабинете или вне рабочих часов (если
                не включено «Круглосуточно»). Оператор должен быть залогинен в кабинете.
              </p>

              <Field label="ID счётчика Яндекс Метрики">
                <TextInput
                  value={editing.metrikaCounterId ?? ""}
                  onChange={(e) => setEditing({ ...editing, metrikaCounterId: e.target.value || null })}
                  placeholder="12345678"
                />
              </Field>

              {saveError && (
                <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10">{saveError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditing(null)}>Отмена</Button>
              <Button size="sm" type="button" onClick={saveSite} disabled={saving}>
                {saving ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {embed && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 font-semibold text-gray-800 dark:text-white/90">Код установки</h3>
            <p className="mb-3 text-sm text-gray-500">Вставьте перед закрывающим тегом &lt;/body&gt; на всех страницах сайта.</p>
            <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-4 text-xs dark:bg-gray-800">{embed}</pre>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={copyEmbed}>Копировать</Button>
              <Button size="sm" variant="outline" onClick={() => setEmbed("")}>Закрыть</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

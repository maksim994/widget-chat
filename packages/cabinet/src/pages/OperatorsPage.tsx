import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";

type Operator = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastSeenAt: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  OPERATOR: "Оператор",
};

const inputClass =
  "h-11 rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900";

export default function OperatorsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const showWelcome = searchParams.get("welcome") === "1";
  const [ops, setOps] = useState<Operator[]>([]);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadOps = useCallback(async () => {
    setOps(await api<Operator[]>("/api/operators"));
  }, []);

  useEffect(() => {
    loadOps().catch(console.error);
  }, [loadOps]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/operators", {
        method: "POST",
        body: JSON.stringify({ ...form, role: "OPERATOR" }),
      });
      setForm({ email: "", password: "", name: "" });
      await loadOps();
      if (showWelcome) setSearchParams({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось добавить оператора");
    } finally {
      setLoading(false);
    }
  }

  async function remove(op: Operator) {
    if (op.id === user?.id) return;
    const label = op.role === "ADMIN" ? "администратора" : "оператора";
    if (!confirm(`Удалить ${label} ${op.name}? Диалоги будут без назначенного оператора.`)) return;
    setError("");
    try {
      await api(`/api/operators/${op.id}`, { method: "DELETE" });
      await loadOps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Операторы</h2>
        <p className="text-theme-sm text-gray-500">
          Сотрудники, которые отвечают покупателям в чате на сайте. Добавьте операторов — они входят в
          кабинет под своим email и видят входящие диалоги.
        </p>
      </div>

      {showWelcome && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
          <p className="font-medium mb-1">Компания создана</p>
          <p>
            Вы — администратор. Добавьте хотя бы одного оператора (или войдите сами под другим
            браузером как оператор). Пока оператор онлайн в кабинете, на сайте доступен живой чат.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">
          Добавить оператора
        </h3>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <input
            className={inputClass}
            placeholder="Имя"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
          />
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Добавление…" : "Добавить"}
          </Button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-error-600 bg-error-50 px-3 py-2 rounded-lg">{error}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800">
            <tr>
              <th className="px-5 py-3 text-left">Имя</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Роль</th>
              <th className="px-5 py-3 text-left">Онлайн</th>
              <th className="px-5 py-3 text-right w-24"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {ops.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                  Нет операторов. Добавьте первого сотрудника для чата с покупателями.
                </td>
              </tr>
            ) : (
              ops.map((o) => {
                const isSelf = o.id === user?.id;
                const online =
                  o.lastSeenAt && Date.now() - new Date(o.lastSeenAt).getTime() < 120_000;
                return (
                  <tr key={o.id}>
                    <td className="px-5 py-3 font-medium">
                      {o.name}
                      {isSelf && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(вы)</span>
                      )}
                    </td>
                    <td className="px-5 py-3">{o.email}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                        {ROLE_LABELS[o.role] ?? o.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {online ? (
                        <span className="text-success-600 font-medium">Да</span>
                      ) : (
                        <span className="text-gray-400">Нет</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => remove(o)}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10"
                          title="Удалить"
                          aria-label={`Удалить ${o.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

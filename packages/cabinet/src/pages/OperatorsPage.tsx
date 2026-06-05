import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Button from "../components/ui/Button";

type Operator = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastSeenAt: string | null;
};

const inputClass =
  "h-11 rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900";

export default function OperatorsPage() {
  const [ops, setOps] = useState<Operator[]>([]);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  useEffect(() => {
    api<Operator[]>("/api/operators").then(setOps);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/operators", { method: "POST", body: JSON.stringify({ ...form, role: "OPERATOR" }) });
    setForm({ email: "", password: "", name: "" });
    setOps(await api<Operator[]>("/api/operators"));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Операторы</h2>
        <p className="text-theme-sm text-gray-500">Команда для обработки диалогов</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
          <input className={inputClass} placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className={inputClass} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className={inputClass} type="password" placeholder="Пароль" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Button type="submit" size="sm">Добавить</Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800">
            <tr>
              <th className="px-5 py-3 text-left">Имя</th>
              <th className="px-5 py-3 text-left">Email</th>
              <th className="px-5 py-3 text-left">Роль</th>
              <th className="px-5 py-3 text-left">Онлайн</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {ops.map((o) => (
              <tr key={o.id}>
                <td className="px-5 py-3 font-medium">{o.name}</td>
                <td className="px-5 py-3">{o.email}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{o.role}</span></td>
                <td className="px-5 py-3">
                  {o.lastSeenAt && Date.now() - new Date(o.lastSeenAt).getTime() < 120_000 ? (
                    <span className="text-success-600 font-medium">Да</span>
                  ) : (
                    <span className="text-gray-400">Нет</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import AuthPageLayout from "../components/auth/AuthPageLayout";
import Button from "../components/ui/Button";

const inputClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageLayout>
      <div className="flex flex-1 flex-col justify-center w-full max-w-md mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
            Регистрация
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Создайте компанию. Вы станете администратором и сможете добавить операторов для чата с
            покупателями на сайте.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {(
            [
              ["Компания", "companyName"],
              ["Ваше имя", "name"],
              ["Email", "email"],
              ["Пароль", "password"],
            ] as const
          ).map(([label, key]) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </label>
              <input
                type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                className={inputClass}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
                minLength={key === "password" ? 6 : undefined}
              />
            </div>
          ))}
          {error && (
            <p className="text-sm text-error-600 bg-error-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <Button type="submit" className="w-full" size="sm" disabled={loading}>
            {loading ? "Создание..." : "Создать аккаунт"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-center text-gray-600">
          <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium">
            Уже есть аккаунт
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}

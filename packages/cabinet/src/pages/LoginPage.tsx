import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api";
import AuthPageLayout from "../components/auth/AuthPageLayout";
import Button from "../components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@demo.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageLayout>
      <div className="flex flex-1 flex-col justify-center w-full max-w-md mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
            Вход
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Email и пароль от аккаунта компании
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Пароль
            </label>
            <input
              type="password"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-error-600 bg-error-50 dark:bg-error-500/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" size="sm" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-brand-500 hover:text-brand-600 font-medium">
            Регистрация
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  );
}

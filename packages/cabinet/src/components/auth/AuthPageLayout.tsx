import { Link } from "react-router-dom";

export default function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-1 bg-white p-6 dark:bg-gray-900 sm:p-0">
      <div className="relative flex h-screen w-full flex-col justify-center dark:bg-gray-900 lg:flex-row">
        <div className="flex w-full flex-col flex-1 lg:w-1/2">{children}</div>
        <div className="relative hidden h-full w-full items-center justify-center bg-brand-950 lg:grid lg:w-1/2 dark:bg-white/5">
          <div className="relative z-1 flex max-w-xs flex-col items-center px-8 text-center">
            <Link to="/" className="mb-6 block">
              <img src="/images/logo/auth-logo.svg" alt="Widget Chat" width={200} height={48} />
            </Link>
            <p className="text-gray-400 dark:text-white/60">
              Платформа для связи с клиентами на сайте. Онлайн-чат, лиды и Яндекс Метрика.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

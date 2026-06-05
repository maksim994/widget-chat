import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../auth/AuthContext";

export default function AppHeader() {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { user } = useAuth();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  return (
    <header className="sticky top-0 z-99999 flex w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 lg:h-11 lg:w-11 dark:border-gray-800 dark:text-gray-400"
          onClick={handleToggle}
          aria-label="Меню"
        >
          {isMobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.22 7.28a.75.75 0 011.06 0L12 11.94l4.72-4.72a.75.75 0 111.06 1.06L13.06 12l4.72 4.72a.75.75 0 11-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 11-1.06-1.06L10.94 12 6.22 7.28z" />
            </svg>
          ) : (
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
              <path d="M1.33 0.25h13.33a.75.75 0 010 1.5H1.33a.75.75 0 010-1.5zm0 5h6.67a.75.75 0 010 1.5H1.33a.75.75 0 010-1.5zm0 5h13.33a.75.75 0 010 1.5H1.33a.75.75 0 010-1.5z" />
            </svg>
          )}
        </button>

        <div className="hidden flex-1 lg:block">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {user?.companyName}
          </h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {user?.role === "ADMIN" ? "Панель администратора" : "Рабочее место оператора"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-theme-sm font-medium text-gray-700 sm:block dark:text-gray-300">
            {user?.name}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
            {user?.name?.charAt(0) ?? "?"}
          </div>
        </div>
      </div>
    </header>
  );
}

import { Link, NavLink } from "react-router-dom";
import {
  MessageSquare,
  Globe,
  Users,
  PieChart,
  BookOpen,
  LogOut,
  LayoutGrid,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../auth/AuthContext";

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { name: "Диалоги", path: "/", icon: <MessageSquare className="size-6" /> },
  { name: "Сайты", path: "/sites", icon: <Globe className="size-6" />, adminOnly: true },
  { name: "Операторы", path: "/operators", icon: <Users className="size-6" />, adminOnly: true },
  { name: "Аналитика", path: "/analytics", icon: <PieChart className="size-6" />, adminOnly: true },
  { name: "Справка", path: "/help", icon: <BookOpen className="size-6" />, adminOnly: true },
];

export default function AppSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user, logout } = useAuth();
  if (!user) return null;

  const items = navItems.filter((n) => !n.adminOnly || user.role === "ADMIN");
  const showLabel = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
      >
        <Link to="/" className="flex items-center gap-2">
          {showLabel ? (
            <>
              <img className="dark:hidden h-9" src="/images/logo/logo.svg" alt="Widget Chat" />
              <img className="hidden dark:block h-9" src="/images/logo/logo-dark.svg" alt="Widget Chat" />
            </>
          ) : (
            <img src="/images/logo/logo-icon.svg" alt="WC" width={32} height={32} />
          )}
        </Link>
      </div>

      <nav className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
        <p
          className={`mb-4 text-xs uppercase text-gray-400 ${!showLabel ? "lg:text-center" : ""}`}
        >
          {showLabel ? "Меню" : <LayoutGrid className="size-5 mx-auto lg:inline" />}
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive: active }) =>
                  `menu-item group ${active ? "menu-item-active" : "menu-item-inactive"} ${!showLabel ? "lg:justify-center" : ""}`
                }
              >
                <span className="menu-item-icon-size menu-item-icon-inactive group-[.menu-item-active]:menu-item-icon-active">
                  {item.icon}
                </span>
                {showLabel && <span>{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6 pb-8">
          {showLabel && (
            <div className="px-3 py-3 mb-2 rounded-xl bg-gray-50 dark:bg-white/5">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.companyName}</p>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className={`menu-item menu-item-inactive w-full ${!showLabel ? "lg:justify-center" : ""}`}
          >
            <span className="menu-item-icon-size menu-item-icon-inactive">
              <LogOut className="size-6" />
            </span>
            {showLabel && <span>Выйти</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Только администратор компании (настройки, операторы, аналитика). */
export default function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

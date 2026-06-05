import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DialogsPage from "./pages/DialogsPage";
import SitesPage from "./pages/SitesPage";
import OperatorsPage from "./pages/OperatorsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import HelpPage from "./pages/HelpPage";
import AdminRoute from "./components/AdminRoute";

function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <AuthRoot />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DialogsPage /> },
              {
                element: <AdminRoute />,
                children: [
                  { path: "sites", element: <SitesPage /> },
                  { path: "operators", element: <OperatorsPage /> },
                  { path: "analytics", element: <AnalyticsPage /> },
                  { path: "help", element: <HelpPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

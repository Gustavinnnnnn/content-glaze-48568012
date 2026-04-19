import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, AdminPermissions } from "@/contexts/AuthContext";
import { NavProvider } from "@/contexts/NavContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminVideos from "./pages/admin/AdminVideos.tsx";
import AdminModels from "./pages/admin/AdminModels.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminAdmins from "./pages/admin/AdminAdmins.tsx";
import AdminSales from "./pages/admin/AdminSales.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminTelegram from "./pages/admin/AdminTelegram.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const RequireAdmin = ({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission?: keyof AdminPermissions;
}) => {
  const { loading, user, isAdmin, isSuperAdmin, permissions } = useAuth();
  if (loading) return <div className="flex h-[100dvh] items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  if (permission && !isSuperAdmin && !permissions?.[permission]) return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NavProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<RequireAdmin permission="can_view_dashboard"><AdminDashboard /></RequireAdmin>} />
                <Route path="videos" element={<RequireAdmin permission="can_manage_videos"><AdminVideos /></RequireAdmin>} />
                <Route path="models" element={<RequireAdmin permission="can_manage_models"><AdminModels /></RequireAdmin>} />
                <Route path="users" element={<RequireAdmin permission="can_manage_users"><AdminUsers /></RequireAdmin>} />
                <Route path="admins" element={<RequireAdmin permission="can_manage_admins"><AdminAdmins /></RequireAdmin>} />
                <Route path="sales" element={<RequireAdmin permission="can_view_sales"><AdminSales /></RequireAdmin>} />
                <Route path="settings" element={<RequireAdmin permission="can_manage_settings"><AdminSettings /></RequireAdmin>} />
                <Route path="telegram" element={<RequireAdmin permission="can_manage_settings"><AdminTelegram /></RequireAdmin>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NavProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

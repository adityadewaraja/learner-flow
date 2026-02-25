import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
import Index from "./pages/Index";
import Completed from "./pages/Completed";
import Profile from "./pages/Profile";
import CourseDetail from "./pages/CourseDetail";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ManageCourses from "./pages/admin/ManageCourses";
import UserManagement from "./pages/admin/UserManagement";
import Reports from "./pages/admin/Reports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AppLayout>
                  <Index />
                </AppLayout>
              }
            />
            <Route
              path="/completed"
              element={
                <AppLayout>
                  <Completed />
                </AppLayout>
              }
            />
            <Route
              path="/course/:id"
              element={
                <AppLayout>
                  <CourseDetail />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <Profile />
                </AppLayout>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminLayout>
                  <Reports />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminLayout>
                  <Reports />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <AdminLayout>
                  <ManageCourses />
                </AdminLayout>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminLayout>
                  <UserManagement />
                </AdminLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./components/auth/LoginPage";
import { PageSkeleton } from "./components/PageSkeleton";
import type { ReactNode } from "react";

const Dashboard = lazy(() => import("./components/dashboard/Dashboard").then(m => ({ default: m.Dashboard })));
const ProjectsPage = lazy(() => import("./components/projects/ProjectsPage").then(m => ({ default: m.ProjectsPage })));
const ProjectDetail = lazy(() => import("./components/projects/ProjectDetail").then(m => ({ default: m.ProjectDetail })));
const DocumentVault = lazy(() => import("./components/documents/DocumentVault").then(m => ({ default: m.DocumentVault })));
const CertificateCenter = lazy(() => import("./components/certificates/CertificateCenter").then(m => ({ default: m.CertificateCenter })));
const MachineOrders = lazy(() => import("./components/orders/MachineOrders").then(m => ({ default: m.MachineOrders })));
const PaymentsModule = lazy(() => import("./components/payments/PaymentsModule").then(m => ({ default: m.PaymentsModule })));
const NotificationsPage = lazy(() => import("./components/notifications/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const SupportCenter = lazy(() => import("./components/support/SupportCenter").then(m => ({ default: m.SupportCenter })));
const ProfilePage = lazy(() => import("./components/profile/ProfilePage").then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import("./components/settings/SettingsPage").then(m => ({ default: m.SettingsPage })));

const TimelinePage = lazy(() => import("./components/timeline/TimelinePage").then(m => ({ default: m.TimelinePage })));
const MachineStore = lazy(() => import("./components/store/MachineStore").then(m => ({ default: m.MachineStore })));
const CompareStore = lazy(() => import("./components/store/CompareStore").then(m => ({ default: m.CompareStore })));

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageSkeleton />}>{node}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, element: withSuspense(<Dashboard />) },
      { path: "projects", element: withSuspense(<ProjectsPage />) },
      { path: "projects/:id", element: withSuspense(<ProjectDetail />) },
      { path: "timeline", element: withSuspense(<TimelinePage />) },
      { path: "documents", element: withSuspense(<DocumentVault />) },
      { path: "certificates", element: withSuspense(<CertificateCenter />) },
      { path: "orders", element: withSuspense(<MachineOrders />) },
      { path: "store", element: withSuspense(<MachineStore />) },
      { path: "store/compare", element: withSuspense(<CompareStore />) },
      { path: "payments", element: withSuspense(<PaymentsModule />) },
      { path: "notifications", element: withSuspense(<NotificationsPage />) },
      { path: "support", element: withSuspense(<SupportCenter />) },
      { path: "profile", element: withSuspense(<ProfilePage />) },
      { path: "settings", element: withSuspense(<SettingsPage />) },
      { path: "*", element: withSuspense(<NotFound />) },
    ],
  },
]);

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4">
        <span className="text-2xl">404</span>
      </div>
      <h2 className="text-lg font-semibold text-[#0F172A] mb-2">Page not found</h2>
      <p className="text-sm text-[#64748B] mb-6">The page you're looking for doesn't exist.</p>
      <a href="/" className="px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}>
        Back to Dashboard
      </a>
    </div>
  );
}

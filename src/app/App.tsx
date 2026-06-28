import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { useAppStore } from "./store/appStore";

export default function App() {
  const initializeAuth = useAppStore((state) => state.initializeAuth);
  const loading = useAppStore((state) => state.loading);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-[rgba(15,23,42,0.06)] shadow-sm animate-pulse">
            <span className="text-[#007FCD] font-bold text-xs">DC</span>
          </div>
          <p className="text-[11px] font-semibold text-[#64748B] tracking-wide uppercase">Loading Portal...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
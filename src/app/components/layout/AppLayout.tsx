import { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileSidebar } from "./MobileSidebar";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";

export function AppLayout() {
  const { isAuthenticated, user, setNotificationCount } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id)
          .eq("is_read", false);

        if (error) throw error;
        if (count !== null) {
          setNotificationCount(count);
        }
      } catch (err) {
        console.error("Error fetching notification count:", err);
      }
    };

    fetchCount();

    // Setup real-time listener for notification table changes for the user
    const channel = supabase
      .channel(`realtime-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, setNotificationCount]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && (!user.name || !user.companyName)) {
    return <Navigate to="/login" state={{ mode: "complete-profile" }} replace />;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

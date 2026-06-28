import { useState, useEffect } from "react";
import { Bell, CheckCheck, TrendingUp, Award, FileText, CreditCard, AlertCircle, MessageSquare, Loader2 } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";

interface Notification {
  id: string;
  type: "project" | "cert" | "document" | "payment" | "alert" | "support" | "system";
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  action_route?: string;
}

const typeConfig = {
  project: { icon: TrendingUp, color: "#007FCD", bg: "#EFF6FF" },
  cert: { icon: Award, color: "#22C55E", bg: "#F0FDF4" },
  document: { icon: FileText, color: "#00AFCF", bg: "#E0F7FA" },
  payment: { icon: CreditCard, color: "#F59E0B", bg: "#FFFBEB" },
  alert: { icon: AlertCircle, color: "#EF4444", bg: "#FEF2F2" },
  support: { icon: MessageSquare, color: "#14C6C8", bg: "#E0FDFD" },
  system: { icon: Bell, color: "#64748B", bg: "#F8FAFC" },
};

function formatTime(timestamp: string): string {
  try {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return "";
  }
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const { user, setNotificationCount } = useAppStore();

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      
      const unreadCount = (data || []).filter((n) => !n.is_read).length;
      setNotificationCount(unreadCount);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!user?.id) return;

    // Realtime update notifications inside page
    const channel = supabase
      .channel(`page-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      // Optimistic update
      setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
      setNotificationCount(0);

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("profile_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      fetchNotifications();
    }
  };

  const markRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;

    try {
      // Optimistic update
      setNotifications((n) =>
        n.map((x) => (x.id === id ? { ...x, is_read: true } : x))
      );
      const remainingUnread = notifications.filter((n) => !n.is_read && n.id !== id).length;
      setNotificationCount(remainingUnread);

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      fetchNotifications();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-[rgba(15,23,42,0.06)] animate-pulse">
        <Loader2 className="w-8 h-8 text-[#007FCD] animate-spin mb-3" />
        <p className="text-xs text-[#64748B]">Loading notifications...</p>
      </div>
    );
  }

  const displayed = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md font-semibold capitalize transition-colors cursor-pointer ${
                filter === f
                  ? "bg-[#007FCD] text-white"
                  : "bg-white border border-[rgba(15,23,42,0.08)] text-[#475569] hover:text-[#007FCD]"
              }`}
            >
              {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-[#007FCD] hover:underline font-semibold cursor-pointer"
          >
            <CheckCheck size={13} />
            Mark all as read
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-[rgba(15,23,42,0.06)]">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4">
            <Bell size={24} className="text-[#007FCD]" />
          </div>
          <h3 className="text-sm font-semibold text-[#0F172A] mb-1">All caught up</h3>
          <p className="text-xs text-[#64748B]">No unread notifications at this time.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayed.map((n) => {
            const configType = (n.type in typeConfig) ? n.type : "system";
            const tc = typeConfig[configType];
            const Icon = tc.icon;
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  n.is_read
                    ? "bg-white border-[rgba(15,23,42,0.04)] opacity-70"
                    : "bg-white border-[rgba(15,23,42,0.08)] hover:border-[rgba(0,127,205,0.2)] hover:shadow-sm"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: tc.bg }}
                >
                  <Icon size={15} style={{ color: tc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[#0F172A]">{n.title}</p>
                    {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-[#007FCD] flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1.5">{formatTime(n.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

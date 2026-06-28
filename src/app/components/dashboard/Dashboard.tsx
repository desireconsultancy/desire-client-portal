import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  FolderKanban, FileText, CreditCard, Award, ArrowRight,
  TrendingUp, Clock, CheckCircle2, AlertCircle, Upload,
  MessageSquare, Package, ArrowUpRight, AlertOctagon, HelpCircle, Sparkles, ChevronRight, Activity
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageSkeleton } from "../PageSkeleton";

interface ProjectMetric {
  name: string;
  type: string;
  completion: number;
  stage: string;
  id: string;
}

interface ActivityItem {
  id: string;
  icon: any;
  color: string;
  bg: string;
  message: string;
  time: string;
  dot: boolean;
}

export function Dashboard() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Dynamic Metrics
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const [pendingPaymentsAmount, setPendingPaymentsAmount] = useState(0);
  const [completedServicesCount, setCompletedServicesCount] = useState(0);

  // Dynamic Lists
  const [activeProjects, setActiveProjects] = useState<ProjectMetric[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [chartData, setChartData] = useState<{ month: string; projects: number; payments: number }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    
    async function loadDashboardData() {
      try {
        // 1. Fetch active projects count and list
        const { data: projects, error: projectsErr } = await supabase
          .from("projects")
          .select("*")
          .eq("profile_id", user.id);
        
        if (!projectsErr && projects) {
          const active = projects.filter((p: any) => p.status === "active");
          const completed = projects.filter((p: any) => p.status === "completed");
          setActiveProjectsCount(active.length);
          setCompletedServicesCount(completed.length);
          
          // Map top 3 active projects
          const mappedProjects = active.slice(0, 3).map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.service_type || "Consultancy",
            completion: Math.round(p.completion_percentage || 0),
            stage: p.current_stage || "Pending Initial Review"
          }));
          setActiveProjects(mappedProjects);
        }

        // 2. Fetch pending documents count
        const { data: docs, error: docsErr } = await supabase
          .from("vault_documents")
          .select("id")
          .eq("profile_id", user.id)
          .eq("status", "pending");
        
        if (!docsErr && docs) {
          setPendingDocsCount(docs.length);
        }

        // 3. Fetch pending payments sum
        const { data: payments, error: paymentsErr } = await supabase
          .from("payments")
          .select("amount, paid_amount, status")
          .eq("profile_id", user.id)
          .eq("status", "due");
        
        if (!paymentsErr && payments) {
          const totalDue = payments.reduce((acc: number, curr: any) => acc + (curr.amount - curr.paid_amount), 0);
          setPendingPaymentsAmount(totalDue);
        }

        // 4. Fetch notifications for Activity feed
        const { data: notifications, error: notifErr } = await supabase
          .from("notifications")
          .select("*")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!notifErr && notifications && notifications.length > 0) {
          const iconMap: Record<string, any> = {
            project: FolderKanban,
            payment: CreditCard,
            document: FileText,
            certificate: Award,
            order: Package,
            system: TrendingUp,
          };

          const colorMap: Record<string, string> = {
            project: "#007FCD",
            payment: "#EF4444",
            document: "#F59E0B",
            certificate: "#22C55E",
            order: "#00AFCF",
            system: "#64748B",
          };

          const bgMap: Record<string, string> = {
            project: "#EFF6FF",
            payment: "#FEF2F2",
            document: "#FFFBEB",
            certificate: "#F0FDF4",
            order: "#E0F7FA",
            system: "#F8FAFC",
          };

          const mappedNotifs = notifications.map((n: any) => {
            const timeAgo = formatTimeAgo(new Date(n.created_at));
            return {
              id: n.id,
              icon: iconMap[n.type] || HelpCircle,
              color: colorMap[n.type] || "#64748B",
              bg: bgMap[n.type] || "#F8FAFC",
              message: `${n.title} — ${n.body}`,
              time: timeAgo,
              dot: !n.is_read
            };
          });
          setActivities(mappedNotifs);
        } else {
          // Default Activities fallback if none in database
          setActivities([
            { id: "1", icon: TrendingUp, color: "#007FCD", bg: "#EFF6FF", message: "Welcome to Desire Consultancy portal", time: "Just now", dot: true },
            { id: "2", icon: Award, color: "#22C55E", bg: "#F0FDF4", message: "Profile creation completed successfully", time: "1d ago", dot: false }
          ]);
        }

        // 5. Generate beautiful chart data dynamically
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonthIdx = new Date().getMonth();
        const startIdx = Math.max(0, currentMonthIdx - 5);
        const activeMonths = months.slice(startIdx, currentMonthIdx + 1);

        const counts = activeMonths.map((m, idx) => {
          const monthNum = startIdx + idx;
          const monthProjects = projects ? projects.filter((p: any) => new Date(p.started_at).getMonth() === monthNum).length : 0;
          const monthPayments = payments ? payments.filter((py: any) => {
            const date = py.paid_at ? new Date(py.paid_at) : new Date();
            return date.getMonth() === monthNum;
          }).length : 0;

          return {
            month: m,
            projects: Math.max(1, monthProjects),
            payments: Math.max(0, monthPayments),
          };
        });
        setChartData(counts);

      } catch (err) {
        console.error("Error loading dashboard details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  function formatTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + "y ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + "m ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + "d ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    return "just now";
  }

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const typeColor: Record<string, string> = {
    FSSAI: "#007FCD", BIS: "#00AFCF", Trademark: "#14C6C8", Consultancy: "#64748B"
  };

  const quickActions = [
    { label: "Upload Document", desc: "Add client compliance records", icon: Upload, to: "/documents", color: "#007FCD", bg: "#EFF6FF" },
    { label: "View Certificates", desc: "Access granted clearances", icon: Award, to: "/certificates", color: "#22C55E", bg: "#F0FDF4" },
    { label: "Track Orders", desc: "Check machine procurement", icon: Package, to: "/orders", color: "#00AFCF", bg: "#E0F7FA" },
    { label: "Contact Support", desc: "Get real-time agent help", icon: MessageSquare, to: "/support", color: "#F59E0B", bg: "#FFFBEB" },
  ];

  if (loading) return <PageSkeleton />;

  const metricCards = [
    { label: "Active Projects", value: activeProjectsCount.toString(), sub: "Currently in execution", icon: FolderKanban, color: "#007FCD", bg: "#EFF6FF" },
    { label: "Pending Documents", value: pendingDocsCount.toString(), sub: "Require upload/action", icon: FileText, color: "#F59E0B", bg: "#FFFBEB" },
    { label: "Pending Payments", value: `₹${pendingPaymentsAmount.toLocaleString("en-IN")}`, sub: "Outstanding invoices", icon: CreditCard, color: "#EF4444", bg: "#FEF2F2" },
    { label: "Completed Services", value: completedServicesCount.toString(), sub: "Lifetime clearance records", icon: Award, color: "#22C55E", bg: "#F0FDF4" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-[#007FCD] bg-[#EFF6FF] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {greeting()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">{user?.name}</h2>
          <p className="text-sm text-[#64748B] mt-0.5">{user?.companyName}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#0F172A] bg-white border border-[rgba(15,23,42,0.06)] px-3 py-2 rounded-xl shadow-sm self-start sm:self-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="font-semibold text-slate-500">B2B ID:</span>
          <span className="font-mono text-slate-800">{user?.clientId}</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-5 hover:shadow-premium hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors group-hover:scale-105 duration-200" style={{ background: m.bg }}>
                <m.icon size={16} style={{ color: m.color }} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight mb-1">{m.value}</p>
            <p className="text-xs font-semibold text-[#475569]">{m.label}</p>
            <p className="text-[10px] text-[#94A3B8] mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Service Activity</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">Procurement and certification milestones</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#007FCD] inline-block" />Projects</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#14C6C8] inline-block" />Payments</span>
            </div>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007FCD" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#007FCD" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14C6C8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#14C6C8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 8, fontSize: 11, padding: "8px 12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
                  cursor={{ stroke: "rgba(15,23,42,0.04)", strokeWidth: 1.5 }}
                />
                <Area type="monotone" dataKey="projects" stroke="#007FCD" strokeWidth={2} fill="url(#gProj)" name="Projects" dot={false} activeDot={{ r: 4, fill: "#007FCD" }} />
                <Area type="monotone" dataKey="payments" stroke="#14C6C8" strokeWidth={2} fill="url(#gPay)" name="Payments" dot={false} activeDot={{ r: 4, fill: "#14C6C8" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={15} className="text-[#007FCD]" />
            <h3 className="text-sm font-semibold text-[#0F172A]">Workspace Actions</h3>
          </div>
          <div className="space-y-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-[#F8FAFC]/50 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 duration-200" style={{ background: a.bg }}>
                  <a.icon size={15} style={{ color: a.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0F172A]">{a.label}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{a.desc}</p>
                </div>
                <ChevronRight size={13} className="text-[#CBD5E1] group-hover:text-[#0F172A] group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Active Projects */}
        <div className="lg:col-span-2 bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-[#0F172A]">Active Operations</h3>
            <button onClick={() => navigate("/projects")} className="text-xs font-bold text-[#007FCD] hover:underline flex items-center gap-1">
              All projects <ArrowRight size={12} />
            </button>
          </div>
          {activeProjects.length > 0 ? (
            <div className="space-y-5">
              {activeProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="w-full text-left group animate-fade-in block"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded text-white flex-shrink-0" style={{ background: typeColor[p.type] || "#64748B" }}>
                      {p.type}
                    </span>
                    <p className="text-xs font-bold text-[#0F172A] truncate group-hover:text-[#007FCD] transition-colors">{p.name}</p>
                    <span className="ml-auto text-xs font-bold text-[#0F172A] flex-shrink-0">{p.completion}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${p.completion}%`, background: "linear-gradient(90deg, #007FCD, #00AFCF)" }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] mt-1.5 font-medium">{p.stage}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                <FolderKanban size={16} className="text-[#CBD5E1]" />
              </div>
              <p className="text-xs text-[#64748B]">No active consultancy projects found.</p>
              <button
                onClick={() => navigate("/support")}
                className="mt-3 text-[11px] font-semibold text-[#007FCD] hover:underline"
              >
                Request a new service
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-[#007FCD]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Activity Feed</h3>
            </div>
            <button onClick={() => navigate("/notifications")} className="text-xs font-semibold text-[#007FCD] hover:underline">All</button>
          </div>
          <div className="space-y-0.5">
            {activities.map((item) => (
              <div key={item.id} className="flex items-start gap-3.5 py-3 border-b border-[rgba(15,23,42,0.02)] last:border-0 hover:bg-[#F8FAFC]/30 rounded-lg px-1 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: item.bg }}>
                  <item.icon size={12} style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#0F172A] leading-relaxed truncate-2-lines">{item.message}</p>
                  <p className="text-[9px] text-[#94A3B8] mt-1 font-semibold">{item.time}</p>
                </div>
                {item.dot && <div className="w-1.5 h-1.5 rounded-full bg-[#007FCD] flex-shrink-0 mt-1.5 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { CreditCard, Download, Eye, TrendingUp, AlertCircle, CheckCircle2, Clock, IndianRupee, ArrowUpRight } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";
import { TableSkeleton } from "../PageSkeleton";

type PaymentStatus = "Paid" | "Pending" | "Overdue";

interface DBPayment {
  id: string;
  invoice_number: string;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  description: string;
  project_name: string | null;
}

const statusConfig: Record<PaymentStatus, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Paid: { color: "#22C55E", bg: "#F0FDF4", border: "#BBF7D0", icon: CheckCircle2 },
  Pending: { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: Clock },
  Overdue: { color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", icon: AlertCircle },
};

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

type FilterType = "All" | PaymentStatus;

export function PaymentsModule() {
  const { user } = useAppStore();
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("All");

  useEffect(() => {
    if (!user?.id) return;

    async function loadPayments() {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .eq("profile_id", user.id)
          .order("due_date", { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } catch (err) {
        console.error("Error loading payments list:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [user]);

  const mapPaymentStatus = (p: DBPayment): PaymentStatus => {
    if (p.status === "paid" || p.paid_amount >= p.amount) return "Paid";
    const isPastDue = new Date(p.due_date).getTime() < new Date().getTime();
    return isPastDue ? "Overdue" : "Pending";
  };

  const total = payments.reduce((s, p) => s + p.amount, 0);
  const paid = payments.reduce((s, p) => s + p.paid_amount, 0);
  const due = payments.reduce((s, p) => s + (p.amount - p.paid_amount), 0);

  const filtered = payments.filter((p) => filter === "All" || mapPaymentStatus(p) === filter);
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Billed", value: fmt(total), sub: `${payments.length} invoices`, icon: IndianRupee, color: "#007FCD", bg: "#EFF6FF", trend: null },
          { label: "Amount Paid", value: fmt(paid), sub: `${paidPct}% of total billed`, icon: TrendingUp, color: "#22C55E", bg: "#F0FDF4", trend: `${paidPct}%` },
          { label: "Amount Due", value: fmt(due), sub: `${payments.filter(p => mapPaymentStatus(p) !== "Paid").length} open invoices`, icon: AlertCircle, color: due > 0 ? "#EF4444" : "#22C55E", bg: due > 0 ? "#FEF2F2" : "#F0FDF4", trend: null },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon size={14} style={{ color: c.color }} />
              </div>
              {c.trend && (
                <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "#22C55E" }}>
                  <ArrowUpRight size={11} />{c.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mb-0.5" style={{ color: c.label === "Amount Due" && due > 0 ? "#EF4444" : "#0F172A" }}>{c.value}</p>
            <p className="text-xs font-semibold text-[#475569] mb-0.5">{c.label}</p>
            <p className="text-[11px] text-[#94A3B8]">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#0F172A]">Payment Progress</p>
          <p className="text-xs text-[#64748B]">{fmt(paid)} of {fmt(total)}</p>
        </div>
        <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${paidPct}%`, background: "linear-gradient(90deg, #007FCD, #22C55E)" }} />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(15,23,42,0.04)]">
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">Invoice History</h3>
          <div className="flex gap-1">
            {(["All", "Paid", "Pending", "Overdue"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${filter === f ? "bg-[#0F172A] text-white" : "text-[#475569] hover:bg-[#F8FAFC]"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-[rgba(15,23,42,0.04)]">
          {filtered.map((p) => {
            const displayStatus = mapPaymentStatus(p);
            const sc = statusConfig[displayStatus];
            const StatusIcon = sc.icon;
            const createdDate = p.paid_at ? new Date(p.paid_at) : new Date(p.due_date);

            return (
              <div key={p.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-[#F8FAFC] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)] flex items-center justify-center flex-shrink-0">
                  <CreditCard size={13} className="text-[#94A3B8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{p.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-[#94A3B8]">{p.invoice_number}</p>
                    <span className="text-[#E2E8F0] text-xs">·</span>
                    <p className="text-xs text-[#94A3B8]">Due {new Date(p.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    {displayStatus !== "Paid" && (
                      <>
                        <span className="text-[#E2E8F0] text-xs">·</span>
                        <p className="text-xs text-[#F59E0B] font-semibold">Remaining: {fmt(p.amount - p.paid_amount)}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <span className="text-sm font-bold text-[#0F172A] hidden sm:block">{fmt(p.amount)}</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                    <StatusIcon size={10} />
                    <span>{displayStatus}</span>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button aria-label="View invoice" className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#EFF6FF] hover:text-[#007FCD] transition-colors">
                      <Eye size={13} />
                    </button>
                    <button aria-label="Download invoice" className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#EFF6FF] hover:text-[#007FCD] transition-colors">
                      <Download size={13} />
                    </button>
                  </div>
                  {displayStatus !== "Paid" && (
                    <button className="h-7 px-3 text-[11px] font-semibold text-white rounded-lg" style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}>
                      Pay
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-3">
              <CreditCard size={20} className="text-[#94A3B8]" />
            </div>
            <p className="text-sm font-medium text-[#94A3B8]">No {filter.toLowerCase()} invoices</p>
          </div>
        )}
      </div>
    </div>
  );
}

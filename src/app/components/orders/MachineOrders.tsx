import { useState, useEffect } from "react";
import { Package, ChevronDown, ChevronUp, MapPin, Calendar, FileText, CheckCircle2, Truck, Settings, Star, Clock } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";
import { ListSkeleton } from "../PageSkeleton";

type OrderStatus = "Order Confirmed" | "Manufacturing" | "Dispatched" | "In Transit" | "Delivered" | "Installed";

interface OrderStage {
  stage: string;
  date: string;
  done: boolean;
  active: boolean;
}

interface DBOrder {
  id: string;
  order_number: string;
  machine_name: string;
  machine_model: string;
  current_stage: string;
  current_stage_index: number;
  stages: any[] | null;
  amount: number;
  order_date: string;
  installation_date: string | null;
  warranty_expiry: string | null;
  invoice_url: string | null;
  status: string;
}

const statusConfig: Record<OrderStatus, { color: string; bg: string; icon: React.ElementType }> = {
  "Order Confirmed": { color: "#007FCD", bg: "#EFF6FF", icon: CheckCircle2 },
  "Manufacturing": { color: "#F59E0B", bg: "#FFFBEB", icon: Settings },
  "Dispatched": { color: "#00AFCF", bg: "#E0F7FA", icon: Package },
  "In Transit": { color: "#007FCD", bg: "#EFF6FF", icon: Truck },
  "Delivered": { color: "#22C55E", bg: "#F0FDF4", icon: CheckCircle2 },
  "Installed": { color: "#22C55E", bg: "#F0FDF4", icon: Star },
};

export function MachineOrders() {
  const { user } = useAppStore();
  const [orders, setOrders] = useState<DBOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function loadOrders() {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("profile_id", user.id)
          .order("order_date", { ascending: false });

        if (error) throw error;
        setOrders(data || []);
        
        // Auto-expand first order if exists
        if (data && data.length > 0) {
          setExpanded(data[0].id);
        }
      } catch (err) {
        console.error("Error loading machine orders:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [user]);

  const getOrderStatus = (order: DBOrder): OrderStatus => {
    const stage = order.current_stage;
    if (stage === "Booking Payment" || stage === "Booking Initiated") return "Order Confirmed";
    if (stage === "Manufacturing") return "Manufacturing";
    if (stage === "Quality QA" || stage === "Dispatched") return "Dispatched";
    if (stage === "In Transit" || stage === "Shipping") return "In Transit";
    if (stage === "Delivered") return "Delivered";
    if (stage === "Installed") return "Installed";
    return (stage as OrderStatus) || "Order Confirmed";
  };

  const getOrderTimeline = (order: DBOrder): OrderStage[] => {
    // If order has custom stages saved in JSONB
    if (order.stages && Array.isArray(order.stages) && order.stages.length > 0) {
      return order.stages.map((st: any, idx: number) => ({
        stage: st.name || st.stage || "Stage",
        date: st.date || (st.status === "current" ? "In Progress" : "—"),
        done: st.status === "completed",
        active: st.status === "current" || st.status === "active",
      }));
    }

    // Default Fallbacks
    const index = order.current_stage_index || 0;
    const stagesList = ["Order Confirmed", "Manufacturing", "Dispatched", "In Transit", "Delivered", "Installed"];
    const dateStr = new Date(order.order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    return stagesList.map((stage, idx) => ({
      stage,
      date: idx === 0 ? dateStr : idx < index ? "Completed" : idx === index ? "In Progress" : "—",
      done: idx < index,
      active: idx === index,
    }));
  };

  if (loading) return <ListSkeleton rows={3} />;

  return (
    <div className="space-y-4 max-w-4xl animate-fade-in">
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4">
            <Package size={28} className="text-[#007FCD]" />
          </div>
          <h3 className="text-base font-semibold text-[#0F172A] mb-2">No machine orders</h3>
          <p className="text-sm text-[#64748B] mb-4">Your machine orders will appear here once placed.</p>
          <a
            href="/store"
            className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all"
            style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
          >
            Browse Machinery Store
          </a>
        </div>
      ) : (
        orders.map((order) => {
          const displayStatus = getOrderStatus(order);
          const sc = statusConfig[displayStatus] || statusConfig["Order Confirmed"];
          const StatusIcon = sc.icon;
          const isOpen = expanded === order.id;
          const timeline = getOrderTimeline(order);

          const warrantyDate = order.warranty_expiry 
            ? new Date(order.warranty_expiry).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
            : "1 year (Standard)";

          return (
            <div key={order.id} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden hover:shadow-sm transition-all">
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="w-full flex items-center gap-4 p-5 text-left focus:outline-none"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-[#007FCD]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A] truncate">{order.machine_name} — {order.machine_model}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    ID: {order.order_number || order.id.slice(0, 8).toUpperCase()} · Ordered {new Date(order.order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.color }}>
                    <StatusIcon size={11} />
                    {displayStatus}
                  </div>
                  <span className="hidden sm:block text-sm font-bold text-[#0F172A]">
                    ₹{order.amount.toLocaleString("en-IN")}
                  </span>
                  {isOpen ? <ChevronUp size={16} className="text-[#94A3B8]" /> : <ChevronDown size={16} className="text-[#94A3B8]" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-[rgba(15,23,42,0.04)]">
                  <div className="pt-5 grid md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[#94A3B8] mb-0.5 font-bold uppercase tracking-wide">Delivery Location</p>
                        <p className="text-xs font-semibold text-[#0F172A]">Plot 42, Industrial Area, Gurugram</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText size={14} className="text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[#94A3B8] mb-0.5 font-bold uppercase tracking-wide">Warranty</p>
                        <p className="text-xs font-semibold text-[#0F172A]">{warrantyDate}</p>
                      </div>
                    </div>
                    {order.installation_date && (
                      <div className="flex items-start gap-2">
                        <Calendar size={14} className="text-[#94A3B8] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-[#94A3B8] mb-0.5 font-bold uppercase tracking-wide">Installation Date</p>
                          <p className="text-xs font-semibold text-[#0F172A]">
                            {new Date(order.installation_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div>
                    <p className="text-xs font-bold text-[#0F172A] mb-4 uppercase tracking-wide">Order Progress</p>
                    <div className="flex items-center gap-0 overflow-x-auto pb-2">
                      {timeline.map((step, idx) => (
                        <div key={idx} className="flex items-center flex-shrink-0">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step.done ? "bg-[#22C55E] border-[#22C55E]" : step.active ? "bg-white border-[#007FCD]" : "bg-white border-[#E2E8F0]"}`}>
                              {step.done ? (
                                <CheckCircle2 size={14} className="text-white" />
                              ) : step.active ? (
                                <div className="w-2 h-2 rounded-full bg-[#007FCD] animate-pulse" />
                              ) : (
                                <Clock size={12} className="text-[#CBD5E1]" />
                              )}
                            </div>
                            <p className={`text-[10px] font-semibold mt-1.5 text-center max-w-[70px] leading-tight ${step.done ? "text-[#22C55E]" : step.active ? "text-[#007FCD]" : "text-[#CBD5E1]"}`}>
                              {step.stage}
                            </p>
                            <p className={`text-[9px] mt-0.5 text-center ${step.done || step.active ? "text-[#94A3B8]" : "text-[#E2E8F0]"}`}>
                              {step.date}
                            </p>
                          </div>
                          {idx < timeline.length - 1 && (
                            <div className={`w-8 h-0.5 mb-7 flex-shrink-0 ${step.done ? "bg-[#22C55E]" : "bg-[#E2E8F0]"}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

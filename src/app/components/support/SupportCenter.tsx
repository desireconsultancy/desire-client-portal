import { useState, useEffect } from "react";
import { MessageCircle, Phone, Ticket, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp, Paperclip, AlertCircle } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";

type TicketStatus = "Open" | "In Progress" | "Resolved";

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: TicketStatus;
  createdDate: string;
  updatedDate: string;
}

const defaultTickets: SupportTicket[] = [
  {
    id: "TKT-2026-021",
    subject: "BIS Test Report Format Clarification",
    category: "Documentation",
    description: "Need guidance on the correct format for BIS test reports as per IS 302-2-14. The current test lab report has been flagged.",
    status: "In Progress",
    createdDate: "2026-06-08",
    updatedDate: "2026-06-10",
  },
  {
    id: "TKT-2026-018",
    subject: "GST Document Query",
    category: "Documents",
    description: "Query regarding GST registration document validity period for FSSAI application.",
    status: "Resolved",
    createdDate: "2026-06-01",
    updatedDate: "2026-06-05",
  },
  {
    id: "TKT-2026-015",
    subject: "Invoice Correction Request",
    category: "Billing",
    description: "Invoice INV-2026-060 has incorrect GSTIN. Please issue a corrected invoice.",
    status: "Resolved",
    createdDate: "2026-05-28",
    updatedDate: "2026-05-30",
  },
];

const statusConfig: Record<TicketStatus, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  Open: { color: "#007FCD", bg: "#EFF6FF", border: "#BFDBFE", icon: Ticket },
  "In Progress": { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: Loader2 },
  Resolved: { color: "#059669", bg: "#F0FDF4", border: "#A7F3D0", icon: CheckCircle2 },
};

const categories = ["Technical Issue", "Documentation", "Billing", "Project Update", "Other"];

const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function SupportCenter() {
  const { user } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", category: "", description: "" });
  const [submitted, setSubmitted] = useState(false);
  const [savingTicket, setSavingTicket] = useState(false);
  
  // Dynamic state
  const [ticketList, setTicketList] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadLocalTickets = () => {
    if (!user) return;
    const localKey = `support_tickets_${user.id}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      try {
        setTicketList(JSON.parse(stored));
      } catch (e) {
        setTicketList(defaultTickets);
      }
    } else {
      localStorage.setItem(localKey, JSON.stringify(defaultTickets));
      setTicketList(defaultTickets);
    }
  };

  const saveLocalTicket = (ticket: SupportTicket) => {
    if (!user) return;
    const localKey = `support_tickets_${user.id}`;
    const updated = [ticket, ...ticketList];
    localStorage.setItem(localKey, JSON.stringify(updated));
    setTicketList(updated);
    setUsingFallback(true);
  };

  const fetchTickets = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01" || error.message?.includes("relation")) {
          setUsingFallback(true);
          loadLocalTickets();
        } else {
          throw error;
        }
      } else {
        const formatted: SupportTicket[] = (data || []).map((t: any) => ({
          id: t.ticket_number,
          subject: t.subject,
          category: t.category,
          description: t.description,
          status: t.status as TicketStatus,
          createdDate: t.created_at.split("T")[0],
          updatedDate: t.updated_at.split("T")[0],
        }));
        setTicketList(formatted);
        setUsingFallback(false);
      }
    } catch (err) {
      console.warn("Falling back to local storage for support tickets:", err);
      setUsingFallback(true);
      loadLocalTickets();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingTicket(true);

    const ticketNum = `TKT-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newTicket: SupportTicket = {
      id: ticketNum,
      subject: form.subject,
      category: form.category,
      description: form.description,
      status: "Open",
      createdDate: new Date().toISOString().split("T")[0],
      updatedDate: new Date().toISOString().split("T")[0],
    };

    try {
      if (!usingFallback) {
        const { error } = await supabase
          .from("support_tickets")
          .insert({
            id: generateUUID(),
            profile_id: user.id,
            ticket_number: ticketNum,
            subject: form.subject,
            category: form.category,
            description: form.description,
            status: "Open"
          });

        if (error) {
          if (error.code === "42P01" || error.message?.includes("relation")) {
            console.warn("Table support_tickets not found. Saving locally.");
            saveLocalTicket(newTicket);
          } else {
            throw error;
          }
        } else {
          await fetchTickets();
        }
      } else {
        saveLocalTicket(newTicket);
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setShowForm(false);
        setForm({ subject: "", category: "", description: "" });
      }, 2500);
    } catch (err) {
      console.error("Error raising ticket:", err);
      saveLocalTicket(newTicket);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setShowForm(false);
        setForm({ subject: "", category: "", description: "" });
      }, 2500);
    } finally {
      setSavingTicket(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      {/* Contact Options */}
      <div className="grid sm:grid-cols-3 gap-5">
        {[
          {
            icon: MessageCircle,
            label: "WhatsApp Support",
            detail: "Direct connection with an advisor",
            action: "Open Chat",
            color: "#10B981",
            bg: "#ECFDF5",
            border: "rgba(16,185,129,0.06)",
            onClick: () => window.open("https://wa.me/919999999999", "_blank"),
          },
          {
            icon: Phone,
            label: "Telephonic Helpline",
            detail: "+91 99999 99999 (9am - 6pm)",
            action: "Call Helpline",
            color: "#007FCD",
            bg: "#EFF6FF",
            border: "rgba(0,127,205,0.06)",
            onClick: () => window.open("tel:+919999999999"),
          },
          {
            icon: Ticket,
            label: "Raise a Ticket",
            detail: "Log an issue on our dashboard",
            action: "New Request",
            color: "#F59E0B",
            bg: "#FFFBEB",
            border: "rgba(245,158,11,0.06)",
            onClick: () => setShowForm(true),
          },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-5 hover:shadow-premium hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105 duration-200" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
              <item.icon size={16} style={{ color: item.color }} />
            </div>
            <p className="text-xs font-bold text-[#0F172A] mb-1">{item.label}</p>
            <p className="text-[11px] text-[#64748B] mb-4 font-medium">{item.detail}</p>
            <button
              onClick={item.onClick}
              className="w-full h-8 text-xs font-semibold rounded-lg border border-[rgba(15,23,42,0.08)] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#007FCD] hover:border-[#007FCD]/20 transition-all"
            >
              {item.action}
            </button>
          </div>
        ))}
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-md animate-fade-in">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-5">Open Support Case</h3>

          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-3">
                <CheckCircle2 size={24} className="text-[#22C55E]" />
              </div>
              <p className="text-sm font-bold text-[#0F172A]">Ticket Submitted!</p>
              <p className="text-xs text-[#64748B] mt-1 font-medium">An advisor will update you on this dashboard within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Provide a concise summary of the issue"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full h-10 px-3 text-xs border border-[rgba(15,23,42,0.08)] rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#007FCD] transition-colors text-[#0F172A] font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Category</label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-10 px-3 text-xs border border-[rgba(15,23,42,0.08)] rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#007FCD] transition-all text-[#0F172A] font-semibold"
                >
                  <option value="" className="text-gray-400">Select case category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-2">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide specific details (order IDs, application numbers, or project stages) to help us resolve this faster..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 text-xs border border-[rgba(15,23,42,0.08)] rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#007FCD] transition-colors resize-none text-[#0F172A] font-medium leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#007FCD] transition-colors">
                  <Paperclip size={13} />
                  Attach Screenshot
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="h-9 px-4 text-xs font-bold text-[#475569] border border-[rgba(15,23,42,0.06)] rounded-xl hover:bg-[#F8FAFC] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingTicket} className="h-9 px-4 text-xs font-bold text-white rounded-xl flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}>
                    {savingTicket && <Loader2 size={12} className="animate-spin" />}
                    Submit Case
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Ticket History */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[rgba(15,23,42,0.05)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0F172A]">Support Log</h3>
          {usingFallback && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 font-semibold tracking-wide uppercase">
              <AlertCircle size={10} /> Local Backup Active
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="animate-spin text-[#007FCD]" size={20} />
              <p className="text-xs text-[#64748B]">Querying ticket server...</p>
            </div>
          ) : ticketList.length === 0 ? (
            <div className="text-center py-16">
              <Ticket size={24} className="mx-auto text-[#94A3B8] mb-2" />
              <p className="text-xs text-[#64748B] font-semibold">No tickets raised yet.</p>
            </div>
          ) : (
            ticketList.map((t) => {
              const sc = statusConfig[t.status] || statusConfig["Open"];
              const StatusIcon = sc.icon;
              const isOpen = expanded === t.id;
              return (
                <div key={t.id} className="transition-all">
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-[#F8FAFC]/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#0F172A] mb-1 truncate">{t.subject}</p>
                      <p className="text-[10px] text-[#94A3B8] font-medium">{t.id} · {t.category} · {new Date(t.createdDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                        <StatusIcon size={10} className={t.status === "In Progress" ? "animate-spin" : ""} />
                        <span>{t.status}</span>
                      </div>
                      {isOpen ? <ChevronUp size={14} className="text-[#CBD5E1]" /> : <ChevronDown size={14} className="text-[#CBD5E1]" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 bg-slate-50/40 border-t border-slate-100/50 animate-fade-in">
                      <div className="pt-4 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-semibold">
                          <Clock size={11} />
                          <span>Last Update: {new Date(t.updatedDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                        </div>
                        <div className="p-3.5 bg-white border border-slate-100 rounded-xl">
                          <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-wrap">{t.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

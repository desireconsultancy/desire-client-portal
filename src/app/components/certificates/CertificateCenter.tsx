import { useState, useEffect } from "react";
import { Award, Download, Eye, Search, Calendar, Hash, Building2, Loader2 } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";

interface Certificate {
  id: string;
  name: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  licenseNo: string;
  issuedBy: string;
  status: "Active" | "Expiring Soon" | "Expired";
  fileUrl?: string;
}

const typeColor: Record<string, { primary: string; bg: string; gradient: string }> = {
  FSSAI: { primary: "#007FCD", bg: "#EFF6FF", gradient: "linear-gradient(135deg, #007FCD, #00AFCF)" },
  BIS: { primary: "#00AFCF", bg: "#E0F7FA", gradient: "linear-gradient(135deg, #00AFCF, #14C6C8)" },
  Trademark: { primary: "#14C6C8", bg: "#E0FDFD", gradient: "linear-gradient(135deg, #14C6C8, #4BE3FF)" },
};

const statusConfig = {
  Active: { color: "#22C55E", bg: "#F0FDF4" },
  "Expiring Soon": { color: "#F59E0B", bg: "#FFFBEB" },
  Expired: { color: "#EF4444", bg: "#FEF2F2" },
};

export function CertificateCenter() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const { user } = useAppStore();

  const fetchCertificates = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vault_documents")
        .select("*")
        .eq("profile_id", user.id)
        .in("category", ["Certificates", "FSSAI", "BIS", "Trademark"])
        .eq("status", "approved");

      if (error) throw error;

      const mapped: Certificate[] = (data || []).map((d: any) => {
        let type = "FSSAI";
        const cat = d.category?.toLowerCase() || "";
        const nameLower = d.name?.toLowerCase() || "";
        
        if (cat.includes("bis") || nameLower.includes("bis")) {
          type = "BIS";
        } else if (cat.includes("trademark") || nameLower.includes("trademark")) {
          type = "Trademark";
        }

        let issuedBy = "Food Safety and Standards Authority of India";
        if (type === "BIS") issuedBy = "Bureau of Indian Standards";
        else if (type === "Trademark") issuedBy = "Intellectual Property India";

        // Generate a recognizable license/reg number if not easily parsed from name
        const licenseNo = d.name.includes(" - Verified")
          ? "LIC-" + d.id.substring(0, 8).toUpperCase()
          : d.name.split(" - ").pop() || "LIC-" + d.id.substring(0, 8).toUpperCase();

        const created = new Date(d.uploaded_at);
        const expiry = new Date(created);
        // Fallback: certificates expire in 1 year for BIS/FSSAI, 10 years for Trademark
        expiry.setFullYear(created.getFullYear() + (type === "Trademark" ? 10 : 1));

        const now = new Date();
        const diffMs = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let status: "Active" | "Expiring Soon" | "Expired" = "Active";
        if (diffDays < 0) status = "Expired";
        else if (diffDays < 30) status = "Expiring Soon";

        return {
          id: d.id,
          name: d.name,
          type,
          issueDate: created.toISOString().split("T")[0],
          expiryDate: expiry.toISOString().split("T")[0],
          licenseNo,
          issuedBy,
          status,
          fileUrl: d.file_url || undefined,
        };
      });

      setCerts(mapped);
    } catch (err) {
      console.error("Error loading certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [user?.id]);

  const filtered = certs.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.licenseNo.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || c.type === filter || c.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-[rgba(15,23,42,0.06)] animate-pulse">
        <Loader2 className="w-8 h-8 text-[#007FCD] animate-spin mb-3" />
        <p className="text-xs text-[#64748B]">Loading certificates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search certificates or license numbers..."
            className="w-full h-9 pl-9 pr-4 text-xs bg-white border border-[rgba(15,23,42,0.08)] rounded-lg placeholder:text-[#94A3B8] text-[#0f172a] focus:outline-none focus:border-[#007FCD] transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["All", "FSSAI", "BIS", "Trademark", "Active", "Expiring Soon"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-colors cursor-pointer flex-shrink-0 ${
                filter === f
                  ? "bg-[#007FCD] text-white"
                  : "bg-white border border-[rgba(15,23,42,0.08)] text-[#475569] hover:border-[#007FCD] hover:text-[#007FCD]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4">
            <Award size={28} className="text-[#007FCD]" />
          </div>
          <h3 className="text-sm font-semibold text-[#0F172A] mb-1">No certificates found</h3>
          <p className="text-xs text-[#64748B]">Certificates will appear here once your vault documents are approved.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((cert) => {
            const tc = typeColor[cert.type] || typeColor.FSSAI;
            const sc = statusConfig[cert.status];
            return (
              <div
                key={cert.id}
                className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden hover:shadow-md transition-all group flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="h-24 relative flex items-center px-6" style={{ background: tc.gradient }}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white" />
                    <div className="absolute -right-2 top-8 w-16 h-16 rounded-full bg-white" />
                  </div>
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Award size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-[10px]">{cert.type} Certificate</p>
                      <p className="text-white font-bold text-sm line-clamp-1">{cert.name}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-[#94A3B8]" />
                      <span className="text-xs font-mono text-[#0F172A]">{cert.licenseNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 size={12} className="text-[#94A3B8]" />
                      <span className="text-xs text-[#64748B] truncate">{cert.issuedBy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-[#94A3B8]" />
                        <div>
                          <p className="text-[10px] text-[#94A3B8]">Valid till</p>
                          <p className="text-xs font-semibold text-[#0F172A]">
                            {new Date(cert.expiryDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        {cert.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {cert.fileUrl && (
                      <>
                        <a
                          href={cert.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-semibold rounded-lg border border-[rgba(15,23,42,0.08)] text-[#475569] hover:border-[#007FCD] hover:text-[#007FCD] transition-colors"
                        >
                          <Eye size={13} />
                          View
                        </a>
                        <a
                          href={cert.fileUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-semibold text-white rounded-lg transition-all"
                          style={{ background: tc.gradient }}
                        >
                          <Download size={13} />
                          Download
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

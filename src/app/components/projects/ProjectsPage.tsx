import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, ArrowRight, Clock, CheckCircle2, AlertCircle, RotateCcw, FolderKanban, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";
import { ListSkeleton } from "../PageSkeleton";

export interface DBProject {
  id: string;
  name: string;
  service_type: string;
  current_stage: string;
  completion_percentage: number;
  status: string;
  expected_completion: string | null;
  started_at: string;
  notes: string | null;
  steps: any[];
}

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; dot: string }> = {
  "In Progress": { color: "#007FCD", bg: "#EFF6FF", icon: RotateCcw, dot: "#007FCD" },
  "Completed": { color: "#22C55E", bg: "#F0FDF4", icon: CheckCircle2, dot: "#22C55E" },
  "Pending": { color: "#94A3B8", bg: "#F8FAFC", icon: Clock, dot: "#94A3B8" },
  "Query Raised": { color: "#F59E0B", bg: "#FFFBEB", icon: AlertCircle, dot: "#F59E0B" },
};

const typeConfig: Record<string, { color: string; gradient: string }> = {
  FSSAI: { color: "#007FCD", gradient: "linear-gradient(135deg, #007FCD, #00AFCF)" },
  BIS: { color: "#00AFCF", gradient: "linear-gradient(135deg, #00AFCF, #14C6C8)" },
  Trademark: { color: "#14C6C8", gradient: "linear-gradient(135deg, #14C6C8, #4BE3FF)" },
  Consultancy: { color: "#64748B", gradient: "linear-gradient(135deg, #64748B, #94A3B8)" },
};

const filters = ["All", "In Progress", "Query Raised", "Pending", "Completed"];

export function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<DBProject[]>([]);
  const { user } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;

    async function loadProjects() {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("profile_id", user.id)
          .order("started_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error("Error loading projects list:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [user]);

  const mapStatus = (dbStatus: string) => {
    if (dbStatus === "active") return "In Progress";
    if (dbStatus === "completed") return "Completed";
    if (dbStatus === "pending") return "Pending";
    if (dbStatus === "query" || dbStatus === "query_raised") return "Query Raised";
    return dbStatus;
  };

  const filtered = projects.filter((p) => {
    const mappedStatus = mapStatus(p.status);
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.service_type.toLowerCase().includes(search.toLowerCase());
    
    const matchFilter = activeFilter === "All" || mappedStatus === activeFilter;
    return matchSearch && matchFilter;
  });

  if (loading) return <ListSkeleton rows={5} />;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-[rgba(15,23,42,0.08)] rounded-lg placeholder:text-[#94A3B8] focus:outline-none focus:border-[#007FCD] transition-colors text-[#0F172A]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal size={13} className="text-[#94A3B8] flex-shrink-0" />
          {filters.map((f) => {
            const count =
              f === "All"
                ? projects.length
                : projects.filter((p) => mapStatus(p.status) === f).length;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all ${
                  activeFilter === f
                    ? "bg-[#0F172A] text-white"
                    : "bg-white border border-[rgba(15,23,42,0.08)] text-[#475569] hover:border-[rgba(15,23,42,0.2)]"
                }`}
              >
                {f} <span className={`ml-1 text-[10px] ${activeFilter === f ? "text-white/60" : "text-[#94A3B8]"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
        <span>{filtered.length} project{filtered.length !== 1 ? "s" : ""}</span>
        {activeFilter !== "All" && (
          <button onClick={() => setActiveFilter("All")} className="text-[#007FCD] hover:underline">Clear filter</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState search={search} onClear={() => { setSearch(""); setActiveFilter("All"); }} />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => {
            const displayStatus = mapStatus(p.status);
            const sc = statusConfig[displayStatus] || statusConfig["Pending"];
            const type = p.service_type || "Consultancy";
            const tc = typeConfig[type] || typeConfig.Consultancy;
            const StatusIcon = sc.icon;

            const expectedDate = p.expected_completion 
              ? new Date(p.expected_completion) 
              : new Date(new Date(p.started_at).getTime() + 30 * 24 * 60 * 60 * 1000); // fallback 30 days

            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="w-full bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-4 sm:p-5 hover:border-[rgba(0,127,205,0.25)] hover:shadow-sm transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  {/* Type badge strip */}
                  <div className="hidden sm:flex w-1 self-stretch rounded-full flex-shrink-0" style={{ background: tc.gradient }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ background: tc.gradient }}>
                        {type}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-mono">{p.id}</span>
                      <div className="flex items-center gap-1 ml-auto sm:hidden">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                        <span className="text-[11px] font-medium" style={{ color: sc.color }}>{displayStatus}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#0F172A] mb-1 group-hover:text-[#007FCD] transition-colors">{p.name}</p>
                    <p className="text-xs text-[#64748B] mb-3">
                      Stage: <span className="text-[#0F172A] font-semibold">{p.current_stage || "Initial Phase"}</span>
                    </p>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${p.completion_percentage}%`,
                            background: p.completion_percentage === 100 ? "#22C55E" : tc.gradient,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#0F172A] flex-shrink-0">{Math.round(p.completion_percentage || 0)}%</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: sc.bg, color: sc.color }}>
                      <StatusIcon size={10} />
                      {displayStatus}
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-[9px] text-[#94A3B8] uppercase tracking-wide font-bold">Expected</p>
                      <p className="text-[11px] font-semibold text-[#475569]">
                        {expectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-[#CBD5E1] group-hover:text-[#007FCD] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-4">
        <FolderKanban size={24} className="text-[#94A3B8]" />
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A] mb-1">
        {search ? "No results found" : "No projects yet"}
      </h3>
      <p className="text-xs text-[#64748B] max-w-xs mb-5">
        {search
          ? `No projects match "${search}". Try a different search term.`
          : "Your consultancy projects will appear here once created."}
      </p>
      {search && (
        <button onClick={onClear} className="px-4 py-2 text-xs font-medium text-[#007FCD] bg-[#EFF6FF] rounded-lg hover:bg-[#DBEAFE] transition-colors">
          Clear search
        </button>
      )}
    </div>
  );
}

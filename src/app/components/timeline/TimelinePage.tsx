import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown, ChevronRight, Calendar, GanttChart,
  CheckCircle2, Circle, Clock, TrendingUp, FolderKanban, BarChart3,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { useAppStore } from "../../store/appStore";
import { PageSkeleton } from "../PageSkeleton";
import { cn } from "../../utils/cn";
import type { DBProject } from "../projects/ProjectsPage";

interface TimelineProject extends DBProject {
  expanded: boolean;
}

const typeColor: Record<string, string> = {
  FSSAI: "#007FCD",
  BIS: "#00AFCF",
  Trademark: "#14C6C8",
  Consultancy: "#64748B",
};

const typeBg: Record<string, string> = {
  FSSAI: "#EFF6FF",
  BIS: "#E0F7FA",
  Trademark: "#E0FAF5",
  Consultancy: "#F1F5F9",
};

const statusFilters = ["All", "Active", "Completed", "Pending"];

function getTimelineBounds(projects: DBProject[]) {
  let min = Date.now();
  let max = Date.now();
  for (const p of projects) {
    const start = new Date(p.started_at).getTime();
    const end = p.expected_completion
      ? new Date(p.expected_completion).getTime()
      : start + 30 * 86400000;
    if (start < min) min = start;
    if (end > max) max = end;
  }
  const buffer = 7 * 86400000;
  return { start: min - buffer, end: max + buffer };
}

function dateToPercent(dateMs: number, tStart: number, tEnd: number): number {
  return ((dateMs - tStart) / (tEnd - tStart)) * 100;
}

function buildMonthColumns(start: number, end: number) {
  const months: { label: string; short: string; startMs: number }[] = [];
  const d = new Date(start);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  while (d.getTime() <= end) {
    months.push({
      label: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      short: d.toLocaleDateString("en-IN", { month: "short" }),
      startMs: d.getTime(),
    });
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

function distributeSteps(steps: any[], pStart: number, pEnd: number) {
  if (!steps || steps.length === 0) return [];
  const totalMs = pEnd - pStart;
  const stepMs = totalMs / steps.length;
  return steps.map((s, i) => ({
    ...s,
    startDate: pStart + i * stepMs,
    endDate: pStart + (i + 1) * stepMs,
    index: i,
  }));
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(a: number, b: number) {
  return Math.round((b - a) / 86400000);
}

export function TimelinePage() {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<TimelineProject[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!user?.id) return;
    async function loadProjects() {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("profile_id", user.id)
          .order("started_at", { ascending: true });
        if (error) throw error;
        setProjects((data || []).map((p) => ({ ...p, expanded: false })));
      } catch (err) {
        console.error("Error loading timeline:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [user]);

  const filtered = useMemo(() => {
    if (activeFilter === "All") return projects;
    return projects.filter((p) => {
      if (activeFilter === "Active") return p.status === "active";
      if (activeFilter === "Completed") return p.status === "completed";
      if (activeFilter === "Pending") return p.status === "pending";
      return true;
    });
  }, [projects, activeFilter]);

  const { start: tStart, end: tEnd } = useMemo(
    () => getTimelineBounds(filtered.length > 0 ? filtered : projects),
    [filtered, projects]
  );

  const months = useMemo(() => buildMonthColumns(tStart, tEnd), [tStart, tEnd]);
  const nowPct = dateToPercent(Date.now(), tStart, tEnd);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === "active").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const avgProgress = projects.length
      ? Math.round(projects.reduce((s, p) => s + (p.completion_percentage || 0), 0) / projects.length)
      : 0;
    return { total: projects.length, active, completed, avgProgress };
  }, [projects]);

  const toggleExpand = useCallback((id: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)));
  }, []);

  const mapStatus = (s: string) => {
    if (s === "active") return "Active";
    if (s === "completed") return "Completed";
    return "Pending";
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
          >
            <GanttChart size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Work Timeline</h2>
            <p className="text-xs text-[#94A3B8]">Project schedule and progress overview</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Calendar size={13} className="text-[#94A3B8] mr-0.5" />
          {statusFilters.map((f) => {
            const count = f === "All" ? projects.length : projects.filter((p) => mapStatus(p.status) === f).length;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all",
                  activeFilter === f
                    ? "bg-[#0F172A] text-white shadow-sm"
                    : "bg-white border border-[rgba(15,23,42,0.08)] text-[#475569] hover:border-[rgba(15,23,42,0.18)]"
                )}
              >
                {f}
                <span className={cn("ml-1.5 text-[10px]", activeFilter === f ? "text-white/60" : "text-[#94A3B8]")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Projects", value: stats.total, icon: FolderKanban, color: "#007FCD", bg: "#EFF6FF" },
          { label: "Active", value: stats.active, icon: TrendingUp, color: "#00AFCF", bg: "#E0F7FA" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "#22C55E", bg: "#F0FDF4" },
          { label: "Avg. Progress", value: `${stats.avgProgress}%`, icon: BarChart3, color: "#8B5CF6", bg: "#F5F3FF" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: m.bg }}>
                <m.icon size={14} style={{ color: m.color }} />
              </div>
              <span className="text-[11px] font-medium text-[#64748B]">{m.label}</span>
            </div>
            <p className="text-xl font-bold text-[#0F172A]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #EFF6FF, #E0F7FA)" }}>
            <GanttChart size={28} className="text-[#007FCD]" />
          </div>
          <h3 className="text-sm font-semibold text-[#0F172A] mb-1.5">No projects to display</h3>
          <p className="text-xs text-[#64748B] max-w-sm leading-relaxed">
            {activeFilter !== "All"
              ? `No ${activeFilter.toLowerCase()} projects found. Try clearing the filter to see all projects.`
              : "Your project timeline will appear here once you have active projects."}
          </p>
          {activeFilter !== "All" && (
            <button
              onClick={() => setActiveFilter("All")}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all"
              style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
            >
              Clear filter
            </button>
          )}
        </div>
      ) : (
        /* Gantt Chart */
        <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl shadow-sm overflow-hidden">
          {/* Scroll wrapper */}
          <div className="overflow-x-auto scrollbar-thin">
            <div style={{ minWidth: 256 + months.length * 140 }}>
              {/* Column Headers */}
            <div className="flex border-b border-[rgba(15,23,42,0.06)]">
              <div className="w-64 flex-shrink-0 bg-[#FAFBFC] border-r border-[rgba(15,23,42,0.06)] px-4 h-11 flex items-center sticky left-0 z-20 shadow-[2px_0_5px_rgba(15,23,42,0.02)]">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Projects</span>
              </div>
              <div className="flex-1 relative h-11 overflow-hidden">
              <div className="absolute inset-0 flex" style={{ minWidth: months.length * 140 }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-full border-l border-[rgba(15,23,42,0.05)] flex items-center px-3",
                      i % 2 === 0 ? "bg-[#FAFBFC]" : "bg-white"
                    )}
                    style={{ width: `${(1 / months.length) * 100}%`, minWidth: 140 }}
                  >
                    <span className="text-[11px] font-semibold text-[#64748B]">{m.label}</span>
                  </div>
                ))}
              </div>
              {/* Today marker in header */}
              {nowPct > 0 && nowPct < 100 && (
                <div className="absolute top-0 bottom-0 z-10 flex flex-col items-center" style={{ left: `${nowPct}%` }}>
                  <div className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-b-md tracking-wider">
                    TODAY
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project Rows */}
          <div>
            {filtered.map((project, rowIdx) => {
              const startMs = new Date(project.started_at).getTime();
              const endMs = project.expected_completion
                ? new Date(project.expected_completion).getTime()
                : startMs + 30 * 86400000;

              const barLeft = dateToPercent(startMs, tStart, tEnd);
              const barWidth = dateToPercent(endMs, tStart, tEnd) - barLeft;
              const color = typeColor[project.service_type] || "#64748B";
              const bg = typeBg[project.service_type] || "#F1F5F9";

              const steps = project.steps?.length > 0 ? distributeSteps(project.steps, startMs, endMs) : [];
              const duration = daysBetween(startMs, endMs);
              const daysLeft = daysBetween(Date.now(), endMs);

              return (
                <div
                  key={project.id}
                  className={cn(
                    "animate-fade-in",
                    rowIdx % 2 === 0 ? "bg-white" : "bg-[#FCFDFE]"
                  )}
                  style={{ animationDelay: `${rowIdx * 40}ms` }}
                >
                  {/* Project Row */}
                  <div className="flex border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC]/60 transition-colors group/row" style={{ minHeight: 56 }}>
                    {/* Left Panel */}
                    <div className="w-64 flex-shrink-0 border-r border-[rgba(15,23,42,0.06)] px-3 py-3 flex gap-2.5 sticky left-0 bg-inherit z-10 shadow-[2px_0_5px_rgba(15,23,42,0.02)]">
                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpand(project.id)}
                        className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F9] transition-all"
                      >
                        {steps.length > 0 ? (
                          <ChevronDown
                            size={14}
                            className={cn("transition-transform duration-200", !project.expanded && "-rotate-90")}
                          />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
                        )}
                      </button>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <button onClick={() => navigate(`/projects/${project.id}`)} className="text-left w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                              style={{ background: color, ringColor: bg, ringOffsetColor: "white" }}
                            />
                            <p className="text-[13px] font-semibold text-[#0F172A] truncate group-hover/row:text-[#007FCD] transition-colors">
                              {project.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pl-4">
                            <span
                              className="text-[9px] font-bold px-1.5 py-px rounded-md uppercase tracking-wide text-white"
                              style={{ background: color }}
                            >
                              {project.service_type || "Consultancy"}
                            </span>
                            <span className="text-[10px] text-[#94A3B8]">{duration}d</span>
                            {daysLeft > 0 && (
                              <span className="text-[10px] text-[#94A3B8]">{daysLeft}d left</span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Bar Area */}
                    <div className="flex-1 relative" style={{ minWidth: months.length * 140 }}>
                      <div className="relative h-full flex items-center">
                        {/* Alternating month backgrounds */}
                        {months.map((m, i) => (
                          <div
                            key={i}
                            className={cn(
                              "absolute top-0 bottom-0 border-l border-[rgba(15,23,42,0.04)]",
                              i % 2 === 0 ? "bg-[#FAFBFC]/40" : ""
                            )}
                            style={{ left: `${(i / months.length) * 100}%`, width: `${(1 / months.length) * 100}%` }}
                          />
                        ))}

                        {/* Today line */}
                        {nowPct > 0 && nowPct < 100 && (
                          <div className="absolute top-0 bottom-0 w-px bg-red-400/40 z-[5]" style={{ left: `${nowPct}%` }} />
                        )}

                        {/* Project Bar */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-8 rounded-lg cursor-pointer transition-all duration-200 group/bar shadow-sm hover:shadow-md hover:-translate-y-[calc(50%-1px)]"
                          style={{
                            left: `${barLeft}%`,
                            width: `${Math.max(barWidth, 1.5)}%`,
                            background: project.completion_percentage === 100
                              ? "linear-gradient(135deg, #22C55E, #16A34A)"
                              : `linear-gradient(135deg, ${color}, ${color}dd)`,
                          }}
                          onMouseEnter={(e) => { setHoveredBar(project.id); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                          onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredBar(null)}
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          {/* Inner progress */}
                          <div
                            className="absolute inset-0 rounded-lg overflow-hidden"
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-white/15"
                              style={{ width: `${project.completion_percentage || 0}%` }}
                            />
                          </div>
                          {/* Label */}
                          <span className="relative z-10 absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white px-3 truncate drop-shadow-sm">
                            {project.name}
                          </span>
                          {/* Completion badge */}
                          <div className="absolute -right-1 -top-1 bg-white rounded-full px-1.5 py-px shadow-sm border border-[rgba(15,23,42,0.06)] hidden group-hover/bar:flex z-20">
                            <span className="text-[9px] font-bold" style={{ color }}>{Math.round(project.completion_percentage || 0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-task Rows */}
                  {project.expanded && steps.map((step) => {
                    const subLeft = dateToPercent(step.startDate, tStart, tEnd);
                    const subWidth = dateToPercent(step.endDate, tStart, tEnd) - subLeft;

                    return (
                      <div
                        key={step.index}
                        className="flex border-b border-[rgba(15,23,42,0.03)] hover:bg-[#F8FAFC]/40 transition-colors"
                        style={{ minHeight: 34 }}
                      >
                        {/* Left: step label */}
                        <div className="w-64 flex-shrink-0 border-r border-[rgba(15,23,42,0.06)] pl-11 pr-3 py-2 flex items-center gap-2 sticky left-0 bg-inherit z-10 shadow-[2px_0_5px_rgba(15,23,42,0.02)]">
                          {step.status === "completed" ? (
                            <CheckCircle2 size={12} className="text-[#22C55E] flex-shrink-0" />
                          ) : step.status === "active" ? (
                            <div className="relative flex-shrink-0">
                              <div className="w-3 h-3 rounded-full border-2 border-[#007FCD] bg-white" />
                              <div className="absolute inset-0 w-3 h-3 rounded-full bg-[#007FCD] animate-ping opacity-30" />
                            </div>
                          ) : (
                            <Circle size={12} className="text-[#CBD5E1] flex-shrink-0" />
                          )}
                          <span className={cn(
                            "text-[12px] truncate",
                            step.status === "completed" ? "text-[#475569] font-medium" :
                            step.status === "active" ? "text-[#0F172A] font-semibold" :
                            "text-[#94A3B8]"
                          )}>
                            {step.label}
                          </span>
                          {step.status === "active" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#007FCD] uppercase tracking-wide flex-shrink-0">
                              Now
                            </span>
                          )}
                        </div>

                        {/* Right: sub-bar */}
                        <div className="flex-1 relative" style={{ minWidth: months.length * 140 }}>
                          <div className="relative h-full flex items-center px-0">
                            {/* Grid */}
                            {months.map((m, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "absolute top-0 bottom-0 border-l border-[rgba(15,23,42,0.03)]",
                                  i % 2 === 0 ? "bg-[#FAFBFC]/20" : ""
                                )}
                                style={{ left: `${(i / months.length) * 100}%`, width: `${(1 / months.length) * 100}%` }}
                              />
                            ))}

                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 h-[18px] rounded-md transition-all",
                                step.status === "active" && "ring-2 ring-[#007FCD]/20 ring-offset-1"
                              )}
                              style={{
                                left: `${subLeft}%`,
                                width: `${Math.max(subWidth, 0.8)}%`,
                                background: step.status === "completed"
                                  ? `linear-gradient(90deg, ${color}, ${color}dd)`
                                  : step.status === "active"
                                    ? `linear-gradient(90deg, ${color}, ${color}cc)`
                                    : `${color}30`,
                              }}
                            >
                               <span 
                                className={cn(
                                  "absolute inset-0 flex items-center justify-center text-[9px] font-semibold px-2 truncate",
                                  step.status !== "pending" && "text-white drop-shadow-sm"
                                )}
                                style={step.status === "pending" ? { color } : undefined}
                              >
                                {step.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          
          </div>
          </div>

          {/* Legend Footer */}
          <div className="px-5 py-3.5 border-t border-[rgba(15,23,42,0.06)] bg-[#FAFBFC] flex items-center gap-5 flex-wrap">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Legend</span>
            <div className="h-4 w-px bg-[rgba(15,23,42,0.08)]" />
            {Object.entries(typeColor).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-4 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-[11px] font-medium text-[#64748B]">{type}</span>
              </div>
            ))}
            <div className="h-4 w-px bg-[rgba(15,23,42,0.08)]" />
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className="w-px h-3 bg-red-500" />
              </div>
              <span className="text-[11px] font-medium text-[#64748B]">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-2.5 rounded-sm bg-[#CBD5E1]" />
              <span className="text-[11px] font-medium text-[#64748B]">Pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredBar && (() => {
        const p = filtered.find((pp) => pp.id === hoveredBar);
        if (!p) return null;
        const startMs = new Date(p.started_at).getTime();
        const endMs = p.expected_completion
          ? new Date(p.expected_completion).getTime()
          : startMs + 30 * 86400000;
        const color = typeColor[p.service_type] || "#64748B";
        const days = daysBetween(startMs, endMs);
        const daysLeft = daysBetween(Date.now(), endMs);

        return (
          <div
            className="fixed z-50 pointer-events-none bg-white rounded-xl shadow-xl border border-[rgba(15,23,42,0.08)] max-w-[280px] overflow-hidden"
            style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 8 }}
          >
            {/* Colored header */}
            <div className="px-4 py-2.5" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
              <p className="text-[13px] font-bold text-white truncate">{p.name}</p>
              <p className="text-[10px] text-white/80 mt-0.5">{p.service_type || "Consultancy"}</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-[#94A3B8] mb-0.5">Started</p>
                  <p className="font-semibold text-[#0F172A]">{formatDate(startMs)}</p>
                </div>
                <div>
                  <p className="text-[#94A3B8] mb-0.5">Expected</p>
                  <p className="font-semibold text-[#0F172A]">{formatDate(endMs)}</p>
                </div>
                <div>
                  <p className="text-[#94A3B8] mb-0.5">Duration</p>
                  <p className="font-semibold text-[#0F172A]">{days} days</p>
                </div>
                <div>
                  <p className="text-[#94A3B8] mb-0.5">Time Left</p>
                  <p className={cn("font-semibold", daysLeft > 0 ? "text-[#0F172A]" : "text-red-500")}>
                    {daysLeft > 0 ? `${daysLeft} days` : "Overdue"}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-[#94A3B8]">Progress</span>
                  <span className="font-bold text-[#0F172A]">{Math.round(p.completion_percentage || 0)}%</span>
                </div>
                <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${p.completion_percentage || 0}%`,
                      background: p.completion_percentage === 100 ? "#22C55E" : `linear-gradient(90deg, ${color}, ${color}cc)`,
                    }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#94A3B8] pt-1 border-t border-[rgba(15,23,42,0.06)]">
                Click to view full project details
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

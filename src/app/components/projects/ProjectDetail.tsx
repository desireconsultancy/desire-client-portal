import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, CheckCircle2, Circle, Clock, AlertTriangle, FileText, MessageSquare } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { useAppStore } from "../../store/appStore";
import { PageSkeleton } from "../PageSkeleton";
import { DBProject } from "./ProjectsPage";

interface WorkflowStep {
  label: string;
  status: "completed" | "active" | "pending";
  date?: string | null;
  note?: string | null;
}

interface Representative {
  name: string;
  phone: string;
}

const repsByService: Record<string, Representative> = {
  FSSAI: { name: "Priya Sharma", phone: "+91 98101 55278" },
  BIS: { name: "Amit Verma", phone: "+91 98202 44169" },
  Trademark: { name: "Sneha Gupta", phone: "+91 98303 33258" },
  Consultancy: { name: "Rajesh Kumar", phone: "+91 98112 00391" },
};

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<DBProject | null>(null);

  useEffect(() => {
    if (!id || !user?.id) return;

    async function loadProjectDetails() {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .eq("profile_id", user.id)
          .single();

        if (error) throw error;
        setProject(data);
      } catch (err) {
        console.error("Error loading project details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjectDetails();
  }, [id, user]);

  if (loading) return <PageSkeleton />;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <AlertTriangle size={32} className="text-red-500 mb-3" />
        <h3 className="text-sm font-semibold text-[#0F172A]">Project not found</h3>
        <p className="text-xs text-[#64748B] mt-1 mb-5">The request project does not exist or you don't have access.</p>
        <button
          onClick={() => navigate("/projects")}
          className="px-4 py-2 text-xs font-semibold text-white rounded-lg"
          style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const type = project.service_type || "Consultancy";
  const rep = repsByService[type] || repsByService.Consultancy;

  const typeColor: Record<string, string> = { 
    FSSAI: "#007FCD", 
    BIS: "#00AFCF", 
    Trademark: "#14C6C8",
    Consultancy: "#64748B"
  };

  // Generate dynamic/default workflow stages if none specified in JSONB steps
  const getWorkflowSteps = (): WorkflowStep[] => {
    if (project.steps && Array.isArray(project.steps) && project.steps.length > 0) {
      return project.steps;
    }

    // Default Fallbacks
    const index = project.current_step_index || 0;
    const dateStr = new Date(project.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    if (type === "FSSAI") {
      return [
        { label: "Document Collection", status: index > 0 ? "completed" : index === 0 ? "active" : "pending", date: dateStr, note: "All KYC documents and checklists." },
        { label: "FoSCoS Submission", status: index > 1 ? "completed" : index === 1 ? "active" : "pending", note: "Filing and reference ID allocation." },
        { label: "Government Scrutiny", status: index > 2 ? "completed" : index === 2 ? "active" : "pending", note: "Under review by FSSAI authority." },
        { label: "Query Raised / Clarifications", status: index > 3 ? "completed" : index === 3 ? "active" : "pending" },
        { label: "License Granted", status: index === 4 && project.status === "completed" ? "completed" : "pending" },
      ];
    }

    if (type === "BIS") {
      return [
        { label: "IS Identification", status: index > 0 ? "completed" : index === 0 ? "active" : "pending", date: dateStr, note: "Standards audit and confirmation." },
        { label: "Infrastructure Setup", status: index > 1 ? "completed" : index === 1 ? "active" : "pending", note: "Factory equipment checklist assessment." },
        { label: "MANAK Submission", status: index > 2 ? "completed" : index === 2 ? "active" : "pending" },
        { label: "Inspection & Lab Testing", status: index > 3 ? "completed" : index === 3 ? "active" : "pending" },
        { label: "Grant of License", status: index === 4 && project.status === "completed" ? "completed" : "pending" },
      ];
    }

    if (type === "Trademark") {
      return [
        { label: "Trademark Search", status: index > 0 ? "completed" : index === 0 ? "active" : "pending", date: dateStr },
        { label: "Application Filing", status: index > 1 ? "completed" : index === 1 ? "active" : "pending" },
        { label: "Examination", status: index > 2 ? "completed" : index === 2 ? "active" : "pending" },
        { label: "Advertisement in Journal", status: index > 3 ? "completed" : index === 3 ? "active" : "pending" },
        { label: "Registration Certificate", status: index === 4 && project.status === "completed" ? "completed" : "pending" },
      ];
    }

    // Default Consultancy
    return [
      { label: "Requirement Gathering", status: index > 0 ? "completed" : index === 0 ? "active" : "pending", date: dateStr },
      { label: "Feasibility Assessment", status: index > 1 ? "completed" : index === 1 ? "active" : "pending" },
      { label: "Draft Submission", status: index > 2 ? "completed" : index === 2 ? "active" : "pending" },
      { label: "Client Approval", status: index > 3 ? "completed" : index === 3 ? "active" : "pending" },
      { label: "Final Handover", status: index === 4 && project.status === "completed" ? "completed" : "pending" },
    ];
  };

  const workflow = getWorkflowSteps();

  const stepIcon = (status: WorkflowStep["status"]) => {
    if (status === "completed") return <CheckCircle2 size={16} className="text-[#22C55E]" />;
    if (status === "active") return <div className="w-4 h-4 rounded-full border-2 border-[#007FCD] bg-white flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#007FCD]" /></div>;
    return <Circle size={16} className="text-[#CBD5E1]" />;
  };

  const expectedDate = project.expected_completion 
    ? new Date(project.expected_completion) 
    : new Date(new Date(project.started_at).getTime() + 30 * 24 * 60 * 60 * 1000); // 30 day default

  // Parse notes text into multiple notes if possible
  const notesList = project.notes 
    ? project.notes.split("\n").filter((n) => n.trim().length > 0)
    : ["Ensure all requested documents are uploaded in the Document Vault.", "Changes or updates will be notified directly in real-time."];

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#007FCD] transition-colors"
      >
        <ChevronLeft size={16} />
        All Projects
      </button>

      {/* Header Info */}
      <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: typeColor[type] || "#007FCD" }}>
                {type}
              </span>
              <span className="text-xs text-[#94A3B8] font-mono">{project.id}</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] mb-1">{project.name}</h2>
            <p className="text-sm text-[#64748B]">Managed by {rep.name} · {rep.phone}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
              <Clock size={12} />
              Expected: {expectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
            <div className="w-full md:w-40">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#64748B]">Progress</span>
                <span className="font-semibold text-[#0F172A]">{Math.round(project.completion_percentage || 0)}%</span>
              </div>
              <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${project.completion_percentage}%`,
                    background: project.completion_percentage === 100 ? "#22C55E" : "linear-gradient(90deg, #007FCD, #00AFCF)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="md:col-span-2 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#0F172A] mb-6">Project Timeline</h3>
          <div className="space-y-0">
            {workflow.map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex-shrink-0 mt-0.5">{stepIcon(step.status)}</div>
                  {idx < workflow.length - 1 && (
                    <div className={`w-px flex-1 my-1 ${step.status === "completed" ? "bg-[#22C55E]" : "bg-[#E2E8F0]"}`} style={{ minHeight: 32 }} />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${step.status === "pending" ? "text-[#94A3B8]" : "text-[#0F172A]"}`}>
                      {step.label}
                    </p>
                    {step.date && (
                      <span className={`text-xs flex-shrink-0 ${step.status === "active" ? "text-[#007FCD] font-semibold" : "text-[#94A3B8]"}`}>
                        {step.date}
                      </span>
                    )}
                  </div>
                  {step.note && (
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{step.note}</p>
                  )}
                  {step.status === "active" && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-[#EFF6FF] rounded-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#007FCD] animate-pulse" />
                      <span className="text-xs text-[#007FCD] font-semibold">Currently Active</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-[#007FCD]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Important Notes</h3>
            </div>
            <ul className="space-y-2">
              {notesList.map((note, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle size={12} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#64748B] leading-relaxed">{note}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={14} className="text-[#007FCD]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Need Help?</h3>
            </div>
            <p className="text-xs text-[#64748B] mb-3">Contact your dedicated project manager for updates or queries.</p>
            <div className="space-y-2">
              <div className="p-3 bg-[#F8FAFC] rounded-lg">
                <p className="text-xs font-semibold text-[#0F172A]">{rep.name}</p>
                <p className="text-xs text-[#64748B]">{rep.phone}</p>
              </div>
              <button
                onClick={() => navigate("/support")}
                className="w-full h-9 text-xs font-semibold text-white rounded-lg transition-all"
                style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
              >
                Raise a Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

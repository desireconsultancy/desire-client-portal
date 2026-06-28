import { useState } from "react";
import { machinesCatalog } from "./MachineStore";
import { ArrowLeft, ArrowLeftRight, Check, Zap } from "lucide-react";
import { useNavigate } from "react-router";

export function CompareStore() {
  const [machine1Id, setMachine1Id] = useState<string>("MAC-001");
  const [machine2Id, setMachine2Id] = useState<string>("MAC-003");

  const navigate = useNavigate();

  const m1 = machinesCatalog.find((m) => m.id === machine1Id) || machinesCatalog[0];
  const m2 = machinesCatalog.find((m) => m.id === machine2Id) || machinesCatalog[2];

  // List of all keys in specs and fullSpecs to show in comparisons
  const allSpecKeys = [
    ...new Set([
      ...Object.keys(m1.specs),
      ...Object.keys(m1.fullSpecs),
      ...Object.keys(m2.specs),
      ...Object.keys(m2.fullSpecs),
    ]),
  ].filter(
    (key) =>
      key !== "Axis" &&
      key !== "Spindle Speed" &&
      key !== "Travel (X/Y/Z)" &&
      key !== "Clamping Force" &&
      key !== "Screw Diameter" &&
      key !== "Shot Weight" &&
      key !== "Laser Source" &&
      key !== "Cutting Area" &&
      key !== "Max MS Thickness" &&
      key !== "Production Speed" &&
      key !== "Cup Capacity" &&
      key !== "Paper Weight"
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 pb-2 border-b border-slate-100">
        <button
          onClick={() => navigate("/store")}
          className="w-9 h-9 rounded-xl bg-white border border-[rgba(15,23,42,0.06)] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Machinery Comparison</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Compare technical specifications, layouts, and costs side-by-side.</p>
        </div>
      </div>

      {/* Selectors grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-5 shadow-sm">
        <div className="relative">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Machine A (Primary)</label>
          <select
            value={machine1Id}
            onChange={(e) => setMachine1Id(e.target.value)}
            className="w-full h-11 px-3 text-xs bg-slate-50 border border-[rgba(15,23,42,0.08)] rounded-xl focus:outline-none focus:border-[#007FCD] focus:bg-white text-[#0F172A] font-semibold transition-all"
          >
            {machinesCatalog.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.model})
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Machine B (Secondary)</label>
          <select
            value={machine2Id}
            onChange={(e) => setMachine2Id(e.target.value)}
            className="w-full h-11 px-3 text-xs bg-slate-50 border border-[rgba(15,23,42,0.08)] rounded-xl focus:outline-none focus:border-[#007FCD] focus:bg-white text-[#0F172A] font-semibold transition-all"
          >
            {machinesCatalog.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.model})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl overflow-hidden shadow-sm">
        {/* Table Head / Core Card info */}
        <div className="grid grid-cols-3 border-b border-[rgba(15,23,42,0.05)] text-center divide-x divide-slate-100">
          <div className="p-6 flex flex-col items-center justify-center bg-slate-50/40">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#007FCD] mb-3">
              <ArrowLeftRight size={20} />
            </div>
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Product Specs</span>
          </div>

          {/* Machine A core */}
          <div className="p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-32 overflow-hidden rounded-xl bg-slate-50 border border-[rgba(15,23,42,0.03)] group">
                <img src={m1.image} alt={m1.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
              </div>
              <div className="text-left pl-1">
                <p className="text-[9px] text-[#94A3B8] font-bold tracking-wider uppercase mb-0.5">{m1.model}</p>
                <h3 className="text-sm font-bold text-[#0F172A]">{m1.title}</h3>
                <p className="text-base font-extrabold text-[#007FCD] mt-1.5">₹{m1.price.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/store")}
              className="h-9 w-full bg-[#EFF6FF] border border-[#007FCD]/10 rounded-xl text-xs font-bold text-[#007FCD] hover:bg-[#EFF6FF]/80 transition-colors flex items-center justify-center gap-1.5"
            >
              <Zap size={12} />
              Calculate EMI
            </button>
          </div>

          {/* Machine B core */}
          <div className="p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-32 overflow-hidden rounded-xl bg-slate-50 border border-[rgba(15,23,42,0.03)] group">
                <img src={m2.image} alt={m2.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
              </div>
              <div className="text-left pl-1">
                <p className="text-[9px] text-[#94A3B8] font-bold tracking-wider uppercase mb-0.5">{m2.model}</p>
                <h3 className="text-sm font-bold text-[#0F172A]">{m2.title}</h3>
                <p className="text-base font-extrabold text-[#007FCD] mt-1.5">₹{m2.price.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/store")}
              className="h-9 w-full bg-[#EFF6FF] border border-[#007FCD]/10 rounded-xl text-xs font-bold text-[#007FCD] hover:bg-[#EFF6FF]/80 transition-colors flex items-center justify-center gap-1.5"
            >
              <Zap size={12} />
              Calculate EMI
            </button>
          </div>
        </div>

        {/* Spec Rows */}
        <div className="divide-y divide-slate-100">
          {/* Row: Category */}
          <div className="grid grid-cols-3 text-center divide-x divide-slate-100 items-center">
            <div className="p-4 text-xs font-semibold text-[#475569] bg-slate-50/20 text-left pl-6">Category</div>
            <div className="p-4 text-xs text-[#0F172A] font-semibold">{m1.category}</div>
            <div className="p-4 text-xs text-[#0F172A] font-semibold">{m2.category}</div>
          </div>

          {/* Row: Description */}
          <div className="grid grid-cols-3 text-center divide-x divide-slate-100 items-center">
            <div className="p-4 text-xs font-semibold text-[#475569] bg-slate-50/20 text-left pl-6">Description</div>
            <div className="p-4 text-xs text-[#475569] text-left leading-relaxed px-6 font-medium">{m1.description}</div>
            <div className="p-4 text-xs text-[#475569] text-left leading-relaxed px-6 font-medium">{m2.description}</div>
          </div>

          {/* Core Specs Row */}
          <div className="grid grid-cols-3 text-center divide-x divide-slate-100 items-center bg-slate-50/30">
            <div className="p-4 text-xs font-semibold text-[#007FCD] bg-slate-50/40 text-left pl-6 uppercase tracking-wider text-[10px]">Primary Specifications</div>
            <div className="p-4 text-xs text-left px-6 space-y-2">
              {Object.entries(m1.specs).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[11px] border-b border-slate-100/50 pb-1 last:border-0 last:pb-0">
                  <span className="text-[#94A3B8] font-medium">{k}</span>
                  <span className="font-bold text-[#475569]">{v}</span>
                </div>
              ))}
            </div>
            <div className="p-4 text-xs text-left px-6 space-y-2">
              {Object.entries(m2.specs).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[11px] border-b border-slate-100/50 pb-1 last:border-0 last:pb-0">
                  <span className="text-[#94A3B8] font-medium">{k}</span>
                  <span className="font-bold text-[#475569]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* General specs comparison */}
          {allSpecKeys.map((key) => {
            const v1 = m1.fullSpecs[key] || m1.specs[key] || "—";
            const v2 = m2.fullSpecs[key] || m2.specs[key] || "—";
            return (
              <div key={key} className="grid grid-cols-3 text-center divide-x divide-slate-100 items-center hover:bg-[#F8FAFC]/50 transition-colors">
                <div className="p-4 text-xs font-semibold text-[#475569] bg-slate-50/20 text-left pl-6">{key}</div>
                <div className="p-4 text-xs text-[#334155] font-semibold px-6">{v1}</div>
                <div className="p-4 text-xs text-[#334155] font-semibold px-6">{v2}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

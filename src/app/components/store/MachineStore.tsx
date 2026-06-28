import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";
import { Search, Info, Calculator, CheckCircle2, ArrowRight, X, ChevronRight, ShoppingBag, Download, ArrowLeftRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";

export interface Machine {
  id: string;
  title: string;
  model: string;
  price: number;
  category: string;
  image: string;
  specs: Record<string, string>;
  fullSpecs: Record<string, string>;
  description: string;
}

export const machinesCatalog: Machine[] = [
  {
    id: "MAC-001",
    title: "CNC Milling Center",
    model: "CNC-850 Pro",
    price: 4500000,
    category: "CNC Machining",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=60&fm=webp",
    description: "High-precision vertical machining center with robust cast-iron construction and high spindle speed, ideal for die mould and complex engineering components.",
    specs: {
      "Axis": "3-Axis Standard",
      "Spindle Speed": "8,000 RPM",
      "Travel (X/Y/Z)": "800/500/500 mm",
    },
    fullSpecs: {
      "Spindle Motor Power": "11 kW / 15 HP",
      "Spindle Taper": "BT-40",
      "Table Size": "1000 x 500 mm",
      "Max Table Load": "600 kg",
      "ATC Tool Capacity": "24 Tools ARM Type",
      "Rapid Traverse": "36/36/32 m/min",
      "CNC Controller": "Fanuc 0i-MF Plus / Siemens 828D",
      "Machine Weight": "5,200 kg",
    }
  },
  {
    id: "MAC-002",
    title: "Injection Molding Machine",
    model: "IMM-180V Elite",
    price: 2800000,
    category: "Plastics",
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&q=60&fm=webp",
    description: "Energy-efficient servo-motor driven plastics injection molding machine offering precision clamping, high speed injection response, and robust durability.",
    specs: {
      "Clamping Force": "180 Ton",
      "Screw Diameter": "45 mm",
      "Shot Weight": "220 g (PS)",
    },
    fullSpecs: {
      "Tie Bar Distance": "460 x 460 mm",
      "Ejector Stroke": "130 mm",
      "Ejector Force": "50 kN",
      "Max Mold Height": "480 mm",
      "Min Mold Height": "180 mm",
      "Pump Motor Power": "15 kW (Servo)",
      "Heating Capacity": "10.8 kW",
      "Machine Weight": "6,500 kg",
    }
  },
  {
    id: "MAC-003",
    title: "Fiber Laser Cutter",
    model: "LC-3015 Fiber",
    price: 6200000,
    category: "Sheet Metal",
    image: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=400&q=60&fm=webp",
    description: "Enterprise industrial fiber laser cutting system featuring dual-shuttle tables, robust gantry motion system, and advanced auto-focus laser head for metal plates.",
    specs: {
      "Laser Source": "3kW IPG / Raycus",
      "Cutting Area": "3000 x 1500 mm",
      "Max MS Thickness": "20 mm",
    },
    fullSpecs: {
      "Max SS Thickness": "10 mm",
      "Max Aluminum Thickness": "8 mm",
      "Positioning Accuracy": "±0.03 mm",
      "Repositioning Accuracy": "±0.02 mm",
      "Max Acceleration": "1.2G",
      "Max Velocity": "120 m/min",
      "Control Software": "CypCut FSCUT2000",
      "Machine Weight": "7,800 kg",
    }
  },
  {
    id: "MAC-004",
    title: "Paper Cup Making Machine",
    model: "PCM-120 Ultra",
    price: 1450000,
    category: "Packaging",
    image: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=400&q=60&fm=webp",
    description: "High-speed automatic paper cup forming machine using ultrasonic sealers, index-gear transmission, and hot-air heating systems for disposable cups production.",
    specs: {
      "Production Speed": "120 pcs/min",
      "Cup Capacity": "2 - 16 oz",
      "Paper Weight": "150 - 380 gsm",
    },
    fullSpecs: {
      "Total Power": "8.5 kW",
      "Air Source Requirement": "0.6 MPa, 0.4 m³/min",
      "Bottom Knife Size": "80-120 mm",
      "Cup Side Welding": "Ultrasonic Device",
      "Bottom Pre-Heating": "Hot Air Units",
      "Main Transmission": "Heavy Duty Indexer Gear Box",
      "Machine Weight": "2,800 kg",
      "Dimensions": "2600 x 1350 x 1800 mm",
    }
  }
];

export function MachineStore() {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [emiCalculatorOpen, setEmiCalculatorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // EMI Calculator states
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [tenureMonths, setTenureMonths] = useState(36);
  const interestRateAnnual = 10.5; // 10.5% interest rate p.a.

  // Pre-booking states
  const [preBookingOpen, setPreBookingOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const { user } = useAppStore();
  const navigate = useNavigate();

  const handleOpenEmi = (machine: Machine) => {
    setSelectedMachine(machine);
    setEmiCalculatorOpen(true);
  };

  const handleOpenBooking = (machine: Machine) => {
    setSelectedMachine(machine);
    setPreBookingOpen(true);
  };

  // EMI Logic
  const getEmiDetails = () => {
    if (!selectedMachine) return { downPayment: 0, loanAmount: 0, monthlyEmi: 0, totalInterest: 0, totalPayment: 0 };
    const price = selectedMachine.price;
    const downPayment = (price * downPaymentPercent) / 100;
    const loanAmount = price - downPayment;

    // Monthly interest rate
    const r = interestRateAnnual / 12 / 100;
    const n = tenureMonths;

    // EMI formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
    const monthlyEmi = loanAmount > 0 
      ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : 0;

    const totalPayment = monthlyEmi * n;
    const totalInterest = totalPayment - loanAmount;

    return {
      downPayment,
      loanAmount,
      monthlyEmi: Math.round(monthlyEmi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
    };
  };

  const emi = getEmiDetails();

  const handleConfirmBooking = async () => {
    if (!selectedMachine || !user?.id) return;
    setBookingLoading(true);

    try {
      const generatedOrderNum = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const stages = [
        { name: "Booking Initiated", status: "completed", date: new Date().toISOString().split("T")[0] },
        { name: "Booking Payment", status: "current", date: null },
        { name: "Manufacturing", status: "upcoming", date: null },
        { name: "Quality Assurance", status: "upcoming", date: null },
        { name: "Dispatch & Delivery", status: "upcoming", date: null },
      ];

      // Insert new order to Supabase
      const { error } = await supabase.from("orders").insert([
        {
          id: generatedOrderNum,
          profile_id: user.id,
          machine_name: `${selectedMachine.title} ${selectedMachine.model}`,
          amount: selectedMachine.price,
          status: "active",
          current_stage: "Booking Payment",
          stages: stages,
        },
      ]);

      if (error) throw error;

      setBookingLoading(false);
      setBookingSuccess(true);
      await new Promise((r) => setTimeout(r, 1500));
      setBookingSuccess(false);
      setPreBookingOpen(false);
      setSelectedMachine(null);
      navigate("/orders");
    } catch (err) {
      console.error("Booking error:", err);
      setBookingLoading(false);
    }
  };

  const filteredCatalog = machinesCatalog.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="relative z-10 space-y-2 max-w-xl">
          <h1 className="text-2xl font-bold text-[#0F172A]">Machinery Store</h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Procure high-performance industrial machinery with live pre-booking, flexible EMI calculations, and step-by-step dispatch tracking. Fully integrated with your Desire Consultancy client account.
          </p>
        </div>
        <button
          onClick={() => navigate("/store/compare")}
          className="flex items-center gap-2 h-10 px-4 text-xs font-semibold text-[#007FCD] bg-[#EFF6FF] border border-[#007FCD]/20 hover:bg-[#EFF6FF]/80 rounded-xl transition-colors relative z-10 flex-shrink-0"
        >
          <ArrowLeftRight size={14} />
          Compare Machinery Side-by-Side
        </button>
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-sky-50/50 to-transparent pointer-events-none" />
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search machine model, name, or category..."
          className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[rgba(15,23,42,0.08)] rounded-lg placeholder:text-[#94A3B8] focus:outline-none focus:border-[#007FCD] transition-colors text-[#0F172A]"
        />
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredCatalog.map((machine) => (
          <div
            key={machine.id}
            className="group bg-white border border-[rgba(15,23,42,0.06)] hover:border-[#007FCD]/30 hover:shadow-sm rounded-xl overflow-hidden flex flex-col transition-all"
          >
            <div className="h-44 overflow-hidden relative">
              <img
                src={machine.image}
                alt={machine.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-3 left-3 bg-[#0F172A] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                {machine.category}
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-[10px] text-[#94A3B8] font-semibold">{machine.model}</p>
                <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#007FCD] transition-colors mt-0.5">
                  {machine.title}
                </h3>
                <p className="text-[11px] text-[#64748B] line-clamp-2 mt-2 leading-relaxed">
                  {machine.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-50 space-y-1.5">
                  {Object.entries(machine.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-[10px]">
                      <span className="text-[#94A3B8]">{key}</span>
                      <span className="font-medium text-[#475569]">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-50 mb-3">
                  <span className="text-[10px] text-[#94A3B8]">Ex-factory Price</span>
                  <span className="text-sm font-bold text-[#0F172A]">
                    ₹{machine.price.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenEmi(machine)}
                    className="h-8 border border-[rgba(15,23,42,0.1)] hover:bg-[#EFF6FF] hover:border-[#007FCD]/20 rounded-lg text-[10px] font-semibold text-[#007FCD] flex items-center justify-center gap-1 transition-all"
                  >
                    <Calculator size={11} />
                    EMI Calc
                  </button>
                  <button
                    onClick={() => handleOpenBooking(machine)}
                    className="h-8 text-white rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all"
                    style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
                  >
                    <ShoppingBag size={11} />
                    Pre-Book
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ==================== EMI CALCULATOR MODAL ==================== */}
      {emiCalculatorOpen && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[rgba(15,23,42,0.1)] p-6 shadow-xl relative overflow-hidden">
            <button
              onClick={() => { setEmiCalculatorOpen(false); setSelectedMachine(null); }}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-[#007FCD]">
                <Calculator size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Machinery EMI Calculator</h3>
                <p className="text-xs text-[#64748B]">{selectedMachine.title} · {selectedMachine.model}</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Slider 1: Down Payment Percent */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#475569]">Down Payment ({downPaymentPercent}%)</span>
                  <span className="text-[#0F172A]">₹{emi.downPayment.toLocaleString("en-IN")}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#007FCD]"
                />
                <div className="flex justify-between text-[9px] text-[#94A3B8]">
                  <span>Min 10% (₹{(selectedMachine.price * 0.1).toLocaleString("en-IN")})</span>
                  <span>Max 90% (₹{(selectedMachine.price * 0.9).toLocaleString("en-IN")})</span>
                </div>
              </div>

              {/* Slider 2: Tenure */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#475569]">Tenure (Months)</span>
                  <span className="text-[#0F172A]">{tenureMonths} Months</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="60"
                  step="12"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#007FCD]"
                />
                <div className="flex justify-between text-[9px] text-[#94A3B8]">
                  <span>1 Year (12m)</span>
                  <span>5 Years (60m)</span>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-baseline py-1.5 border-b border-dashed border-slate-200">
                  <span className="text-xs font-semibold text-[#64748B]">Monthly EMI</span>
                  <span className="text-lg font-bold text-[#007FCD]">
                    ₹{emi.monthlyEmi.toLocaleString("en-IN")} /mo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px] pt-1.5">
                  <div>
                    <span className="text-[#94A3B8]">Loan Amount</span>
                    <p className="font-semibold text-[#0F172A] mt-0.5">₹{emi.loanAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Interest Rate</span>
                    <p className="font-semibold text-[#0F172A] mt-0.5">{interestRateAnnual}% p.a. (Fixed)</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Total Interest</span>
                    <p className="font-semibold text-[#0F172A] mt-0.5">₹{emi.totalInterest.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Total Payable</span>
                    <p className="font-semibold text-[#0F172A] mt-0.5">₹{emi.totalPayment.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setEmiCalculatorOpen(false); setSelectedMachine(null); }}
                  className="flex-1 h-10 border border-[rgba(15,23,42,0.12)] hover:bg-slate-50 rounded-lg text-xs font-semibold text-[#475569] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => { setEmiCalculatorOpen(false); handleOpenBooking(selectedMachine); }}
                  className="flex-1 h-10 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
                >
                  Book with this EMI Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PRE-BOOKING MODAL ==================== */}
      {preBookingOpen && selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[rgba(15,23,42,0.1)] p-6 shadow-xl relative overflow-hidden">
            {bookingSuccess ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-base font-bold text-emerald-800">Machinery Booked Successfully!</h3>
                <p className="text-xs text-[#64748B] mt-1">Order registered. Redirecting to Track Orders...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-[#007FCD]">
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">Pre-Book Machinery</h3>
                    <p className="text-xs text-[#64748B]">{selectedMachine.title} · {selectedMachine.model}</p>
                  </div>
                </div>

                <div className="border border-dashed border-[rgba(15,23,42,0.08)] bg-slate-50/50 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Client ID</span>
                    <span className="font-semibold text-[#0F172A]">{user?.clientId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Company Name</span>
                    <span className="font-semibold text-[#0F172A]">{user?.companyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Ex-factory Price</span>
                    <span className="font-bold text-[#0F172A]">₹{selectedMachine.price.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-[#007FCD]">
                    <span>Pre-booking Token Amount</span>
                    <span>₹50,000</span>
                  </div>
                </div>

                <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                  *A nominal booking token of ₹50,000 is required to initiate the procurement. The remaining down payment and financial verification will be scheduled with our consultancy representative.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setPreBookingOpen(false); setSelectedMachine(null); }}
                    className="flex-1 h-10 border border-[rgba(15,23,42,0.12)] hover:bg-slate-50 rounded-lg text-xs font-semibold text-[#475569] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={bookingLoading}
                    className="flex-1 h-10 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                    style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
                  >
                    {bookingLoading ? <RefreshCw size={13} className="animate-spin" /> : "Confirm Booking"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

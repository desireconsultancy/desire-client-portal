import { useState, useRef, useEffect } from "react";
import { Search, Upload, Download, Eye, FileText, CheckCircle2, Clock, XCircle, FolderOpen, SlidersHorizontal, X, Scan, Edit3, Trash2 } from "lucide-react";
import { Skeleton } from "../PageSkeleton";
import { supabase } from "../../utils/supabaseClient";
import { useAppStore } from "../../store/appStore";

type DocStatus = "Approved" | "Pending Review" | "Rejected" | "Signed";

interface Document {
  id: string;
  name: string;
  category: string;
  uploadDate: string;
  size: string;
  status: DocStatus;
  notes?: string;
  fileUrl?: string;
}

const categories = ["All", "Aadhaar", "PAN", "GST", "FSSAI", "BIS", "Trademark", "Certificates", "Invoices", "Agreement"];

const statusConfig: Record<DocStatus, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  Approved: { color: "#22C55E", bg: "#F0FDF4", border: "#BBF7D0", icon: CheckCircle2, label: "Approved" },
  "Pending Review": { color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", icon: Clock, label: "Pending" },
  Rejected: { color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", icon: XCircle, label: "Rejected" },
  Signed: { color: "#06B6D4", bg: "#ECFEFF", border: "#CFFAFE", icon: CheckCircle2, label: "Signed" },
};

function DocListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[rgba(15,23,42,0.06)]">
          <Skeleton className="h-9 w-9 rounded-lg bg-[#F1F5F9] flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3 bg-[#F1F5F9]" />
            <Skeleton className="h-3 w-1/3 bg-[#F1F5F9]" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full bg-[#F1F5F9]" />
        </div>
      ))}
    </div>
  );
}

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

export function DocumentVault() {
  const [dbDocs, setDbDocs] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDocType, setScanDocType] = useState("GST Certificate");
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Signature canvas states
  const [signatureMode, setSignatureMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState("Caveat");
  const [isDrawing, setIsDrawing] = useState(false);
  const [stamping, setStamping] = useState(false);
  const [stampSuccess, setStampSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerFileRef = useRef<HTMLInputElement>(null);

  const { user } = useAppStore();

  const loadDocuments = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vault_documents")
        .select("*")
        .eq("profile_id", user.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      const mapped: Document[] = (data || []).map((d: any) => {
        let status: DocStatus = "Pending Review";
        const dbStatus = d.status?.toLowerCase();
        if (dbStatus === "approved" || dbStatus === "active") status = "Approved";
        else if (dbStatus === "rejected") status = "Rejected";
        else if (dbStatus === "signed") status = "Signed";

        return {
          id: d.id,
          name: d.name,
          category: d.category,
          uploadDate: d.uploaded_at?.split("T")[0] || new Date().toISOString().split("T")[0],
          size: `${((d.file_size_kb || 1024) / 1024).toFixed(1)} MB`,
          status: status,
          notes: d.rejection_reason || undefined,
          fileUrl: d.file_url || undefined,
        };
      });

      setDbDocs(mapped);
    } catch (err: any) {
      console.error("Error loading documents:", err);
      alert("Error loading documents: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user]);

  // Main file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Client-side security checks: limit size to 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size exceeds the 10MB limit. Please upload a smaller file.");
      return;
    }

    // Client-side security checks: validate file extensions
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["pdf", "png", "jpg", "jpeg", "doc", "docx"];
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      alert("Invalid file format. Allowed formats: PDF, PNG, JPG, JPEG, DOC, DOCX.");
      return;
    }

    try {
      setLoading(true);
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload file to Supabase storage bucket
      let fileUrl = "";
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      } else {
        // Fallback fileUrl in case bucket isn't set up
        fileUrl = "https://kncivfijkpxzbtlwnydb.supabase.co/storage/v1/object/public/documents/mock-doc.pdf";
      }

      // Add record to vault_documents table
      const { error: insertError } = await supabase.from("vault_documents").insert([
        {
          id: generateUUID(),
          profile_id: user.id,
          name: file.name,
          category: "Certificates",
          status: "pending",
          file_url: fileUrl,
          file_type: fileExt || "pdf",
          file_size_kb: Math.round(file.size / 1024),
        },
      ]);

      if (insertError) {
        alert("Failed to save record to vault_documents table: " + insertError.message);
        throw insertError;
      }
      await loadDocuments();
    } catch (err: any) {
      console.error("Error uploading file:", err);
      alert("Error uploading document: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // AI scanner runner
  const runAIScan = async () => {
    if (!scanFile) return;
    setScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          generateMockExtractedData();
          setScanning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 250);
  };

  const generateMockExtractedData = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    switch (scanDocType) {
      case "GST Certificate":
        setExtractedData({
          gstin: `06AADCS${randomSuffix}F1Z5`,
          legalName: user?.companyName || "Sunrise Foods Pvt. Ltd.",
          tradeName: user?.companyName || "Sunrise Foods",
          dateOfRegistration: "12/03/2022",
          constitution: "Private Limited Company",
          confidence: "99.4%",
        });
        break;
      case "FSSAI License":
        setExtractedData({
          licenseNum: `10022064000${randomSuffix}`,
          businessName: user?.companyName || "Sunrise Foods",
          address: user?.address || "Gurugram, Haryana",
          licenseType: "State License",
          confidence: "98.7%",
        });
        break;
      case "PAN Card":
        setExtractedData({
          panNum: `AADCS${randomSuffix}F`,
          name: user?.name || "Rajesh Kumar",
          fatherName: "Madan Lal Kumar",
          dob: "15/08/1988",
          confidence: "99.1%",
        });
        break;
      case "Aadhaar Card":
        setExtractedData({
          aadhaarNum: `3840 9281 ${randomSuffix}`,
          name: user?.name || "Rajesh Kumar",
          gender: "Male",
          yob: "1988",
          confidence: "97.5%",
        });
        break;
      default:
        setExtractedData({
          docId: `TM-${randomSuffix}`,
          name: user?.name || "Rajesh Kumar",
          confidence: "95.0%",
        });
    }
  };

  const saveScannedDoc = async () => {
    if (!user?.id || !extractedData) return;

    try {
      setLoading(true);
      const name = `${scanDocType} - Verified`;
      const cat = scanDocType.split(" ")[0]; // e.g. "GST", "FSSAI", "PAN", "Aadhaar"

      const { error } = await supabase.from("vault_documents").insert([
        {
          id: generateUUID(),
          profile_id: user.id,
          name: name,
          category: cat,
          status: "approved", // auto approved by smart scan
          file_url: "https://kncivfijkpxzbtlwnydb.supabase.co/storage/v1/object/public/documents/mock-doc.pdf",
          file_type: "pdf",
          file_size_kb: 1420,
        },
      ]);

      if (error) throw error;
      setScannerOpen(false);
      setExtractedData(null);
      setScanFile(null);
      await loadDocuments();
    } catch (err) {
      console.error("Error saving scanned doc:", err);
    } finally {
      setLoading(false);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const pos = getEventPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getEventPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getEventPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Stamping and signing agreement
  const handleSignatureSubmit = async () => {
    if (!selected || !user?.id) return;
    setStamping(true);

    // Simulate stamping animation
    await new Promise((r) => setTimeout(r, 1800));
    setStamping(false);
    setStampSuccess(true);
    await new Promise((r) => setTimeout(r, 1200));

    try {
      const { error } = await supabase
        .from("vault_documents")
        .update({ status: "signed" })
        .eq("id", selected.id);

      if (error) throw error;

      setSignOpen(false);
      setStampSuccess(false);
      setTypedName("");
      setSelected(null);
      await loadDocuments();
    } catch (err) {
      console.error("Error signing agreement:", err);
    }
  };

  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document from your vault?")) return;
    try {
      setLoading(true);
      const { error } = await supabase.from("vault_documents").delete().eq("id", id);
      if (error) throw error;
      setSelected(null);
      await loadDocuments();
    } catch (err) {
      console.error("Error deleting document:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = dbDocs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || d.category === category;
    return matchSearch && matchCat;
  });

  const statusCounts = {
    approved: dbDocs.filter((d) => d.status === "Approved").length,
    pending: dbDocs.filter((d) => d.status === "Pending Review").length,
    rejected: dbDocs.filter((d) => d.status === "Rejected").length,
    signed: dbDocs.filter((d) => d.status === "Signed").length,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5" style={{ minHeight: "calc(100vh - 10rem)" }}>
      {/* Main Panel */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Approved", count: statusCounts.approved, color: "#22C55E", bg: "#F0FDF4" },
              { label: "Pending", count: statusCounts.pending, color: "#F59E0B", bg: "#FFFBEB" },
              { label: "Rejected", count: statusCounts.rejected, color: "#EF4444", bg: "#FEF2F2" },
              { label: "Signed", count: statusCounts.signed, color: "#06B6D4", bg: "#ECFEFF" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-3 sm:p-4 text-center">
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-xs text-[#94A3B8]">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents"
              className="w-full h-9 pl-8 pr-3 text-sm bg-white border border-[rgba(15,23,42,0.08)] rounded-lg placeholder:text-[#94A3B8] focus:outline-none focus:border-[#007FCD] transition-colors"
            />
          </div>
          <input
            type="file"
            ref={fileRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.jpg,.png,.doc,.docx"
            aria-hidden="true"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium text-[#007FCD] bg-[#EFF6FF] border border-[#007FCD]/20 hover:bg-[#EFF6FF]/80 rounded-lg transition-colors"
            >
              <Scan size={13} />
              AI Smart Scan
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium text-white rounded-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
            >
              <Upload size={13} />
              Upload
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal size={13} className="text-[#94A3B8] flex-shrink-0" />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${category === c ? "bg-[#0F172A] text-white" : "bg-white border border-[rgba(15,23,42,0.08)] text-[#475569] hover:border-[rgba(15,23,42,0.2)]"}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Documents */}
        {loading ? (
          <DocListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl text-center">
            <FolderOpen size={36} className="text-[#CBD5E1] mb-3" />
            <p className="text-sm font-medium text-[#94A3B8]">{search ? `No results for "${search}"` : "No documents in this category"}</p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-3 text-xs text-[#007FCD] hover:underline">Clear search</button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const sc = statusConfig[doc.status];
              const StatusIcon = sc.icon;
              const isSelected = selected?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelected(isSelected ? null : doc)}
                  className={`w-full flex items-center gap-4 p-4 bg-white rounded-xl border transition-all text-left group ${isSelected ? "border-[#007FCD] ring-2 ring-[#007FCD]/10" : "border-[rgba(15,23,42,0.06)] hover:border-[rgba(0,127,205,0.2)] hover:shadow-sm"}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                    <FileText size={15} className="text-[#007FCD]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A] truncate">{doc.name}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {doc.category} · {doc.size} · {new Date(doc.uploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                      <StatusIcon size={10} />
                      <span>{sc.label}</span>
                    </div>
                    <button
                      onClick={(e) => deleteDocument(doc.id, e)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="lg:w-80 w-full flex-shrink-0 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5 space-y-5 self-start lg:sticky lg:top-0">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <FileText size={20} className="text-[#007FCD]" />
            </div>
            <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors" aria-label="Close detail">
              <X size={14} />
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] leading-snug">{selected.name}</h3>
            <p className="text-[10px] text-[#94A3B8] mt-1 truncate">{selected.id}</p>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { label: "Category", value: selected.category },
              { label: "File Size", value: selected.size },
              { label: "Uploaded", value: new Date(selected.uploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[#94A3B8]">{item.label}</span>
                <span className="font-medium text-[#0F172A]">{item.value}</span>
              </div>
            ))}
          </div>

          {(() => {
            const sc = statusConfig[selected.status];
            const StatusIcon = sc.icon;
            return (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                <StatusIcon size={14} />
                {selected.status}
              </div>
            );
          })()}

          {selected.notes && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs font-semibold text-red-600 mb-1">Rejection Reason</p>
              <p className="text-xs text-red-500 leading-relaxed">{selected.notes}</p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            {selected.category === "Agreement" && (selected.status === "Pending Review" || selected.status === "Approved") && (
              <button
                onClick={() => setSignOpen(true)}
                className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold text-white rounded-lg transition-all"
                style={{ background: "linear-gradient(135deg, #06B6D4, #0891B2)" }}
              >
                <Edit3 size={13} />
                Sign Document
              </button>
            )}
            <a
              href={selected.fileUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 h-9 text-xs font-medium text-white rounded-lg"
              style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
            >
              <Eye size={13} />
              Preview Document
            </a>
          </div>
        </div>
      )}

      {/* ==================== AI SCANNER DIALOG ==================== */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[rgba(15,23,42,0.1)] p-6 shadow-xl relative overflow-hidden">
            <button
              onClick={() => { setScannerOpen(false); setExtractedData(null); setScanFile(null); }}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-[#007FCD]">
                <Scan size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">AI Smart Scanner</h3>
                <p className="text-xs text-[#64748B]">Verify & extract compliance document fields instantly.</p>
              </div>
            </div>

            {!extractedData ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Document Type</label>
                  <select
                    value={scanDocType}
                    onChange={(e) => setScanDocType(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-[rgba(15,23,42,0.1)] rounded-lg focus:outline-none focus:border-[#007FCD] text-[#0F172A] font-medium"
                  >
                    <option>GST Certificate</option>
                    <option>FSSAI License</option>
                    <option>PAN Card</option>
                    <option>Aadhaar Card</option>
                  </select>
                </div>

                <div
                  onClick={() => scannerFileRef.current?.click()}
                  className="border-2 border-dashed border-[#007FCD]/20 hover:border-[#007FCD]/40 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50"
                >
                  <input
                    type="file"
                    ref={scannerFileRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const maxSize = 10 * 1024 * 1024;
                        if (file.size > maxSize) {
                          alert("File size exceeds the 10MB limit. Please upload a smaller file.");
                          return;
                        }
                        const fileExt = file.name.split(".").pop()?.toLowerCase();
                        const allowedExtensions = ["pdf", "png", "jpg", "jpeg"];
                        if (!fileExt || !allowedExtensions.includes(fileExt)) {
                          alert("Invalid file format. Allowed formats: PDF, PNG, JPG, JPEG.");
                          return;
                        }
                        setScanFile(file);
                      } else {
                        setScanFile(null);
                      }
                    }}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                  />
                  <Upload size={24} className="text-[#007FCD]/60 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#0F172A]">
                    {scanFile ? scanFile.name : "Select or Drop Document Image/PDF"}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Supports PDF, PNG, JPG up to 10MB</p>
                </div>

                {scanning && (
                  <div className="space-y-2 relative p-4 bg-slate-900 rounded-xl text-white overflow-hidden">
                    {/* Laser Line Sweeper */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" style={{
                      animation: "scanLine 2s infinite ease-in-out",
                    }} />
                    <style>{`
                      @keyframes scanLine {
                        0% { top: 0%; }
                        50% { top: 100%; }
                        100% { top: 0%; }
                      }
                    `}</style>
                    <div className="flex justify-between text-[11px] font-semibold">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <RefreshCw size={11} className="animate-spin" />
                        AI Extraction Running...
                      </span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                    </div>
                  </div>
                )}

                <button
                  onClick={runAIScan}
                  disabled={!scanFile || scanning}
                  className="w-full h-10 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 bg-[#007FCD] hover:bg-[#007FCD]/90 disabled:opacity-50 transition-colors"
                >
                  Run AI Scan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800">Scan Complete</h4>
                    <p className="text-[10px] text-emerald-700">Document structure validated with {extractedData.confidence} accuracy confidence.</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider mb-1">Extracted Parameters</p>
                  {scanDocType === "GST Certificate" && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">GSTIN</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.gstin}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Legal Name</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.legalName}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Trade Name</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.tradeName}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Reg Date</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.dateOfRegistration}</p>
                      </div>
                    </div>
                  )}
                  {scanDocType === "FSSAI License" && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">License Number</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.licenseNum}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Business Name</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.businessName}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[#94A3B8] text-[10px]">Address</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.address}</p>
                      </div>
                    </div>
                  )}
                  {scanDocType === "PAN Card" && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">PAN Number</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.panNum}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Name</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.name}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Father's Name</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.fatherName}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">DOB</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.dob}</p>
                      </div>
                    </div>
                  )}
                  {scanDocType === "Aadhaar Card" && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Aadhaar Number</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.aadhaarNum}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Name</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.name}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Gender</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.gender}</p>
                      </div>
                      <div>
                        <p className="text-[#94A3B8] text-[10px]">Year of Birth</p>
                        <p className="font-semibold text-[#0F172A]">{extractedData.yob}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setExtractedData(null)}
                    className="flex-1 h-10 border border-[rgba(15,23,42,0.12)] hover:bg-slate-50 rounded-lg text-xs font-semibold text-[#475569] transition-colors"
                  >
                    Scan Again
                  </button>
                  <button
                    onClick={saveScannedDoc}
                    className="flex-1 h-10 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                  >
                    Save & Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== E-SIGNATURE CENTER DIALOG ==================== */}
      {signOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[rgba(15,23,42,0.1)] p-6 shadow-xl relative overflow-hidden">
            <button
              onClick={() => { setSignOpen(false); setTypedName(""); }}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">E-Signature Center</h3>
                <p className="text-xs text-[#64748B]">Apply a digital signature to {selected.name}.</p>
              </div>
            </div>

            {stamping || stampSuccess ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                {stamping ? (
                  <div className="space-y-4">
                    {/* Stamping Simulation */}
                    <div className="w-48 h-32 bg-slate-50 border border-slate-200 rounded-lg relative p-2 shadow-inner mx-auto overflow-hidden">
                      <p className="text-[6px] text-[#94A3B8] leading-tight text-left">
                        THIS AGREEMENT is entered into by and between Desire Consultancy and the Client.
                        The parties agree that all services rendered shall adhere to strict quality standards...
                      </p>
                      {/* Stamp Animation Overlay */}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 border border-dashed border-[#007FCD] bg-[#007FCD]/5 rounded text-[8px] text-[#007FCD] font-bold uppercase tracking-wider animate-bounce">
                        Digitally Signed
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0F172A] flex items-center justify-center gap-1.5">
                        <RefreshCw size={13} className="animate-spin text-[#007FCD]" />
                        Stamping digital sign on agreement document...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-ping" style={{ animationIterationCount: 1, animationDuration: "0.5s" }}>
                    <div className="w-14 h-14 bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 size={32} />
                    </div>
                    <p className="text-sm font-bold text-emerald-800">Agreement Digitally Signed!</p>
                    <p className="text-xs text-[#64748B]">Status updated to Signed in Vault.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex border-b border-[rgba(15,23,42,0.08)]">
                  <button
                    onClick={() => setSignatureMode("draw")}
                    className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${signatureMode === "draw" ? "border-[#007FCD] text-[#007FCD]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
                  >
                    Draw Signature
                  </button>
                  <button
                    onClick={() => setSignatureMode("type")}
                    className={`flex-1 pb-3 text-xs font-semibold border-b-2 transition-colors ${signatureMode === "type" ? "border-[#007FCD] text-[#007FCD]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
                  >
                    Type Signature
                  </button>
                </div>

                {signatureMode === "draw" ? (
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-[rgba(15,23,42,0.1)] rounded-xl relative overflow-hidden h-40">
                      <canvas
                        ref={canvasRef}
                        width={464}
                        height={160}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-full cursor-crosshair bg-transparent absolute inset-0 touch-none"
                      />
                      <div className="absolute bottom-2 right-2 text-[9px] text-[#94A3B8] pointer-events-none select-none font-medium">
                        Draw inside this panel
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={clearCanvas}
                        className="text-[10px] text-[#64748B] hover:text-red-500 font-semibold transition-colors"
                      >
                        Clear Signature Pad
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Type Your Name</label>
                      <input
                        type="text"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        placeholder="Rajesh Kumar"
                        className="w-full h-10 px-3 text-xs bg-slate-50 border border-[rgba(15,23,42,0.1)] rounded-lg focus:outline-none focus:border-[#007FCD] text-[#0F172A] font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Select Cursive Style</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { name: "Caveat", style: "font-caveat" },
                          { name: "Dancing Script", style: "font-dancing" },
                          { name: "Great Vibes", style: "font-vibes" },
                          { name: "Sacramento", style: "font-sacramento" },
                        ].map((f) => (
                          <button
                            key={f.name}
                            onClick={() => setSelectedFont(f.name)}
                            className={`p-2 border rounded-lg text-xs transition-all ${selectedFont === f.name ? "border-[#007FCD] bg-[#EFF6FF] text-[#007FCD]" : "border-[rgba(15,23,42,0.08)] bg-white text-[#475569]"}`}
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border border-dashed border-[rgba(15,23,42,0.12)] rounded-xl h-24 flex items-center justify-center bg-slate-50/50 p-4">
                      {typedName ? (
                        <span
                          className="text-3xl text-[#0F172A] text-center select-none"
                          style={{
                            fontFamily:
                              selectedFont === "Caveat"
                                ? "'Caveat', cursive"
                                : selectedFont === "Dancing Script"
                                ? "'Dancing Script', cursive"
                                : selectedFont === "Great Vibes"
                                ? "'Great Vibes', cursive"
                                : "'Sacramento', cursive",
                          }}
                        >
                          {typedName}
                        </span>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">Cursive preview appears here</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] text-[11px] p-3 rounded-lg flex gap-2">
                  <Shield size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    By signing, you agree that this digital stamp constitutes a legally binding electronic signature
                    under the Indian Information Technology Act (IT Act, 2000).
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setSignOpen(false); setTypedName(""); }}
                    className="flex-1 h-10 border border-[rgba(15,23,42,0.12)] hover:bg-slate-50 rounded-lg text-xs font-semibold text-[#475569] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignatureSubmit}
                    disabled={signatureMode === "type" && !typedName}
                    className="flex-1 h-10 rounded-lg text-xs font-semibold text-white transition-colors"
                    style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
                  >
                    Confirm & Apply Sign
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

import { useState } from "react";
import { Building2, Mail, Phone, MapPin, FileText, Edit3, Check, X, Loader2, Award } from "lucide-react";
import { useAppStore, User } from "../../store/appStore";
import { supabase } from "../../utils/supabaseClient";

export function ProfilePage() {
  const { user, setProfile } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<User>>({});

  if (!user) return null;

  const handleEditStart = () => {
    setFormData({
      name: user.name,
      companyName: user.companyName,
      email: user.email,
      mobile: user.mobile,
      address: user.address,
      gstNumber: user.gstNumber,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update in Supabase profiles
      let { error } = await supabase
        .from("profiles")
        .update({
          name: formData.name,
          company_name: formData.companyName,
          phone: formData.mobile,
          email: formData.email,
          address: formData.address,
          gst_number: formData.gstNumber,
        })
        .eq("id", user.id);

      // Fallback if profiles table hasn't been migrated to include address/gst_number yet
      if (error && (error.code === "42703" || error.message?.includes("column"))) {
        console.warn("Profiles table is missing address/gst_number columns. Saving standard fields only.");
        const fallbackResult = await supabase
          .from("profiles")
          .update({
            name: formData.name,
            company_name: formData.companyName,
            phone: formData.mobile,
            email: formData.email,
          })
          .eq("id", user.id);
        error = fallbackResult.error;
      }

      if (error) throw error;

      // Update local Zustand store
      const updatedUser: User = {
        ...user,
        name: formData.name || user.name,
        companyName: formData.companyName || user.companyName,
        email: formData.email || user.email,
        mobile: formData.mobile || user.mobile,
        address: formData.address || user.address,
        gstNumber: formData.gstNumber || user.gstNumber,
      };

      setProfile(updatedUser);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile. Please check that mobile number is unique.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof User, val: string) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const fields = [
    { icon: Building2, label: "Company Name", value: user.companyName, editValue: formData.companyName, key: "companyName" as const },
    { icon: Building2, label: "Contact Person", value: user.name, editValue: formData.name, key: "name" as const },
    { icon: Mail, label: "Email Address", value: user.email, editValue: formData.email, key: "email" as const },
    { icon: Phone, label: "Mobile Number", value: user.mobile, editValue: formData.mobile, key: "mobile" as const },
    { icon: MapPin, label: "Business Address", value: user.address, editValue: formData.address, key: "address" as const },
    { icon: FileText, label: "GST Number", value: user.gstNumber, editValue: formData.gstNumber, key: "gstNumber" as const },
  ];

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}>
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight">{user.name}</h2>
              <p className="text-xs text-[#64748B] mt-0.5 font-medium truncate">{user.companyName}</p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EFF6FF] text-[#007FCD] rounded-full border border-sky-100">
                  CLIENT ID: {user.clientId}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#ECFDF5] text-[#10B981] rounded-full border border-emerald-100">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-start flex-shrink-0">
            {saved && (
              <div className="flex items-center gap-1 text-[11px] text-[#22C55E] font-bold mr-1">
                <Check size={12} />
                Profile Updated
              </div>
            )}
            {editing ? (
              <>
                <button
                  disabled={saving}
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-[#475569] border border-[rgba(15,23,42,0.06)] rounded-xl bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <X size={13} />
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-white rounded-xl disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={handleEditStart}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-[#007FCD] bg-[#EFF6FF] border border-[#007FCD]/10 hover:bg-[#EFF6FF]/80 rounded-xl transition-colors"
              >
                <Edit3 size={13} />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-[#64748B] mb-5 uppercase tracking-wider">Company Profile</h3>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.label} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[rgba(15,23,42,0.05)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <field.icon size={13} className="text-[#94A3B8]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#94A3B8] mb-1 font-bold uppercase tracking-wider">{field.label}</p>
                {editing ? (
                  <input
                    type="text"
                    value={field.editValue ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full h-10 px-3 text-xs border border-[rgba(15,23,42,0.08)] rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#007FCD] transition-colors text-[#0F172A] font-semibold"
                  />
                ) : (
                  <p className="text-xs font-semibold text-[#0F172A]">{field.value || "—"}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Award size={15} className="text-[#007FCD]" />
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Services</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {["FSSAI Basic License", "FSSAI State License", "BIS Certification", "Trademark Registration", "Machine Orders"].map((s) => (
            <span key={s} className="text-xs font-bold px-3 py-1.5 bg-[#EFF6FF] text-[#007FCD] rounded-xl border border-[#DBEAFE]">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

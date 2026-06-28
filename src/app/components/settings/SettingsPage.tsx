import { useState } from "react";
import { Bell, Shield, Smartphone, Monitor, Check, Eye, EyeOff, LogOut, AlertCircle, Loader2, Link2 } from "lucide-react";
import { auth as firebaseAuth } from "../../utils/firebaseClient";
import { supabase } from "../../utils/supabaseClient";
import { useAppStore } from "../../store/appStore";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007FCD] cursor-pointer"
      style={{ width: 38, height: 20, background: checked ? "#007FCD" : "#CBD5E1" }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ left: 2, width: 16, height: 16, transform: checked ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );
}

interface NotifPrefs {
  projectUpdates: boolean;
  documentApprovals: boolean;
  paymentReminders: boolean;
  certificates: boolean;
  supportReplies: boolean;
  marketing: boolean;
}

export function SettingsPage() {
  const [notif, setNotif] = useState<NotifPrefs>({
    projectUpdates: true,
    documentApprovals: true,
    paymentReminders: true,
    certificates: true,
    supportReplies: false,
    marketing: false,
  });
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [pwError, setPwError] = useState("");

  const save = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2200);
  };

  const authProvider = useAppStore((state) => state.authProvider);
  const user = useAppStore((state) => state.user);
  const setProfile = useAppStore((state) => state.setProfile);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [linkingError, setLinkingError] = useState("");

  const handleLinkGoogle = async () => {
    setLinkingError("");
    setLinkingLoading(true);
    try {
      const { googleProvider } = await import("../../utils/firebaseClient");
      const { signInWithPopup } = await import("firebase/auth");
      
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      if (result.user) {
        const googleUid = result.user.uid;

        // Double check if this Google UID is already linked to another profile in the database using RPC (bypassing select RLS limits)
        const { data: existingLinkData, error: rpcError } = await supabase
          .rpc("check_google_uid_linked", { uid_to_check: googleUid });

        if (rpcError) {
          throw rpcError;
        }

        if (existingLinkData) {
          const res = typeof existingLinkData === "string" ? JSON.parse(existingLinkData) : existingLinkData;
          if (res.exists && res.profile_id !== user?.id) {
            throw new Error(`This Google account is already linked to another profile (${res.email || "another user"}).`);
          }
        }

        // Update the current user's profile with the firebase_uid in Supabase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ firebase_uid: googleUid })
          .eq("id", user?.id);

        if (updateError) throw updateError;

        // Update local state in the app store
        if (user) {
          setProfile({
            ...user,
            firebaseUid: googleUid,
          });
        }
        save("google-link");
      }
    } catch (err: any) {
      console.error("Link Google error:", err);
      setLinkingError(err.message || "Failed to link Google account.");
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    setLinkingError("");
    setLinkingLoading(true);
    try {
      // Clear firebase_uid in Supabase
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ firebase_uid: null })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      // Update local store state
      if (user) {
        const updatedUser = { ...user };
        delete updatedUser.firebaseUid;
        setProfile(updatedUser);
      }
      save("google-unlink");
    } catch (err: any) {
      console.error("Unlink Google error:", err);
      setLinkingError(err.message || "Failed to unlink Google account.");
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters long.");
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error("No authenticated user session found.");
      }

      // Reauthenticate: sign in with the user's email and the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        throw new Error("Incorrect current password.");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      // Clear fields and show success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      save("password");
    } catch (err: any) {
      console.error("Error updating password:", err);
      let msg = err.message || "Failed to update password.";
      if (msg.includes("Invalid login credentials") || msg.includes("Incorrect current password")) {
        msg = "Incorrect current password.";
      }
      setPwError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const notifItems: { key: keyof NotifPrefs; label: string; desc: string }[] = [
    { key: "projectUpdates", label: "Project Updates", desc: "Stage changes and milestone completions" },
    { key: "documentApprovals", label: "Document Status", desc: "Approval, rejection, and review notifications" },
    { key: "paymentReminders", label: "Payment Reminders", desc: "Due dates and overdue invoice alerts" },
    { key: "certificates", label: "Certificate Alerts", desc: "New certificates and expiry warnings" },
    { key: "supportReplies", label: "Support Replies", desc: "Updates on your support tickets" },
    { key: "marketing", label: "Service Announcements", desc: "New services and product updates" },
  ];

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      {/* Notifications */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[rgba(15,23,42,0.05)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
              <Bell size={14} className="text-[#007FCD]" />
            </div>
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Notifications</h3>
          </div>
          <button
            onClick={() => save("notif")}
            className="flex items-center gap-1.5 text-xs font-bold text-[#007FCD] hover:underline transition-colors"
          >
            {saved === "notif" ? <><Check size={12} /> Saved!</> : "Save changes"}
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {notifItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/20 transition-colors">
              <div className="pr-4">
                <p className="text-xs font-bold text-[#0F172A]">{item.label}</p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5 font-medium">{item.desc}</p>
              </div>
              <Toggle
                checked={notif[item.key]}
                onChange={(v) => setNotif((n) => ({ ...n, [item.key]: v }))}
                label={item.label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[rgba(15,23,42,0.05)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#E8F8F0] flex items-center justify-center">
            <Shield size={14} className="text-[#10B981]" />
          </div>
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Security</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Two-Factor Authentication</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5 font-medium">Require OTP verification on every login</p>
            </div>
            <Toggle checked={twoFactor} onChange={setTwoFactor} label="Two-Factor Authentication" />
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-xs font-bold text-[#0F172A]">Session Timeout</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5 font-medium">Automatically sign out after inactivity</p>
            </div>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="text-[11px] font-bold text-[#007FCD] bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Linked Accounts */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[rgba(15,23,42,0.05)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
              <Link2 size={14} className="text-[#64748B]" />
            </div>
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Linked Accounts</h3>
          </div>
          {saved === "google-link" && (
            <span className="text-[11px] font-bold text-[#22C55E] flex items-center gap-1 animate-fade-in">
              <Check size={12} /> Google Linked!
            </span>
          )}
          {saved === "google-unlink" && (
            <span className="text-[11px] font-bold text-[#64748B] flex items-center gap-1 animate-fade-in">
              Unlinked Google
            </span>
          )}
        </div>
        
        <div className="p-6">
          {linkingError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2 border border-red-100 mb-4 animate-fade-in">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span className="font-semibold">{linkingError}</span>
            </div>
          )}

          {authProvider === "firebase" ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Signed in with Google</p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5 font-medium">Primary login authentication provider</p>
              </div>
              <span className="text-[10px] font-bold text-[#007FCD] bg-[#EFF6FF] border border-[#DBEAFE] px-2.5 py-1 rounded-full">
                ACTIVE & SIGNED
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#0F172A]">Google Authentication</p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5 font-medium">
                  {user?.firebaseUid 
                    ? "Link active - you can log in with Google or Email/Password" 
                    : "Connect your Google account to log in instantly"}
                </p>
              </div>

              {user?.firebaseUid ? (
                <button
                  onClick={handleUnlinkGoogle}
                  disabled={linkingLoading}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-[#EF4444] bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-75 cursor-pointer flex-shrink-0"
                >
                  {linkingLoading && <Loader2 size={11} className="animate-spin" />}
                  Unlink
                </button>
              ) : (
                <button
                  onClick={handleLinkGoogle}
                  disabled={linkingLoading}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-[#007FCD] bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl hover:bg-[#E0F2FE] transition-colors disabled:opacity-75 cursor-pointer flex-shrink-0"
                >
                  {linkingLoading && <Loader2 size={11} className="animate-spin" />}
                  Link Account
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[rgba(15,23,42,0.05)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] flex items-center justify-center">
            <Shield size={14} className="text-[#F59E0B]" />
          </div>
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Change Password</h3>
        </div>
        {authProvider === "firebase" ? (
          <div className="px-6 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <Shield size={15} className="text-slate-400" />
            </div>
            <p className="text-xs font-bold text-[#0F172A]">Google Provider Managed</p>
            <p className="text-[10px] text-[#64748B] mt-1 max-w-sm mx-auto leading-relaxed font-medium">
              Your security and credentials are authed by Google. To change your login credentials, please update your settings inside your Google account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="px-6 py-5 space-y-4">
            {pwError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2 border border-red-100 animate-fade-in">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{pwError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 pr-10 text-xs border border-[rgba(15,23,42,0.08)] rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#007FCD] transition-colors text-[#0F172A] font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 text-xs border border-[rgba(15,23,42,0.08)] rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#007FCD] transition-colors text-[#0F172A] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 text-xs border border-[rgba(15,23,42,0.08)] rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-[#007FCD] transition-colors text-[#0F172A] font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="flex items-center gap-2 h-9 px-4 text-xs font-bold text-white rounded-xl mt-1 transition-opacity disabled:opacity-75 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
            >
              {updating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : saved === "password" ? (
                <Check size={12} />
              ) : null}
              {updating ? "Updating..." : saved === "password" ? "Password Updated" : "Update Password"}
            </button>
          </form>
        )}
      </div>

      {/* Session Management */}
      <div className="bg-white border border-[rgba(15,23,42,0.04)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[rgba(15,23,42,0.05)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center border border-slate-100">
            <Monitor size={14} className="text-[#64748B]" />
          </div>
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Sessions</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { device: "Chrome on Windows 11", location: "Gurugram, Haryana", time: "Current session", current: true },
            { device: "Safari on iPhone 14 Pro", location: "Gurugram, Haryana", time: "3 hours ago", current: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/20 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[rgba(15,23,42,0.05)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Monitor size={13} className="text-[#94A3B8]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">{s.device}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5 font-medium">{s.location} · {s.time}</p>
                </div>
              </div>
              {s.current ? (
                <span className="text-[10px] font-bold text-[#10B981] bg-[#ECFDF5] border border-emerald-100 px-2.5 py-1 rounded-full">ACTIVE</span>
              ) : (
                <button className="flex items-center gap-1 text-xs font-bold text-[#EF4444] hover:text-red-700 transition-colors cursor-pointer">
                  <LogOut size={12} />
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

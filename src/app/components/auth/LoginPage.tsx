import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAppStore } from "../../store/appStore";
import { ArrowRight, RefreshCw, Shield, AlertCircle, Check } from "lucide-react";
import { supabase, supabaseHeaders } from "../../utils/supabaseClient";
import { auth as firebaseAuth, googleProvider } from "../../utils/firebaseClient";
import { signInWithPopup } from "firebase/auth";

type Mode = "login" | "signup" | "complete-profile";

export function LoginPage() {
  const location = useLocation();
  const [mode, setMode] = useState<Mode>(() => {
    return location.state?.mode === "complete-profile" ? "complete-profile" : "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [tempUserId, setTempUserId] = useState("");

  const { isAuthenticated, fetchProfile } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.mode === "complete-profile") {
      setMode("complete-profile");
    }
  }, [location]);

  useEffect(() => {
    if (isAuthenticated && mode !== "complete-profile") {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, mode, navigate]);

  // Handle email signup or signin via Supabase Auth
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (sbError) throw sbError;

        if (data.user) {
          const profile = await fetchProfile(data.user.id);
          if (!profile) {
            // Logged in but profile doesn't exist in Supabase
            setTempUserId(data.user.id);
            setMode("complete-profile");
          } else {
            navigate("/", { replace: true });
          }
        }
      } else {
        const { data, error: sbError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (sbError) throw sbError;

        if (data.user) {
          if (data.session) {
            setTempUserId(data.user.id);
            setMode("complete-profile");
          } else {
            setError("");
            setSuccessMessage("Registration successful! Please check your email inbox to confirm your account, then sign in here.");
            setMode("login");
          }
        }
      }
    } catch (err: any) {
      console.error("Supabase auth error:", err);
      // Map friendly error message
      let msg = err.message || "An authentication error occurred.";
      if (msg.includes("Invalid login credentials") || msg.includes("Invalid credentials")) {
        msg = "Incorrect email or password.";
      } else if (msg.includes("User already registered") || msg.includes("already exists")) {
        msg = "An account already exists for this email.";
      } else if (msg.includes("Password should be") || msg.includes("weak")) {
        msg = "Password is too weak. Use at least 6 characters.";
      } else if (msg.includes("valid email")) {
        msg = "Please enter a valid email address.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Google Sign-In via Firebase Auth
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      if (result.user) {
        // Set the x-firebase-auth token header immediately to avoid race condition with fetchProfile
        try {
          const token = await result.user.getIdToken();
          supabaseHeaders['x-firebase-auth'] = token;
        } catch (tokenErr) {
          console.error("Error setting x-firebase-auth token on Google Sign-In:", tokenErr);
        }

        // Check for duplicate account with same email first using RPC (bypassing guest RLS select block)
        const userEmail = result.user.email;
        if (userEmail) {
          const { data: checkData, error: rpcError } = await supabase.rpc("check_google_auth_linking", {
            email_to_check: userEmail,
            google_uid: result.user.uid
          });

          if (!rpcError && checkData) {
            const res = typeof checkData === "string" ? JSON.parse(checkData) : checkData;
            if (res.exists && !res.can_proceed) {
              supabaseHeaders['x-firebase-auth'] = null;
              setError("An account with this email already exists. Please log in using your password, then link your Google account in Settings.");
              setLoading(false);
              return;
            }
          } else if (rpcError) {
            console.error("RPC email check error:", rpcError);
          }
        }

        const profile = await fetchProfile(result.user.uid);
        if (!profile) {
          setTempUserId(result.user.uid);
          // Set defaults from Google
          setFullName(result.user.displayName || "");
          setMode("complete-profile");
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "An error occurred with Google Sign-In.");
      setLoading(false);
    }
  };

  // Complete profile submission in Supabase using Firebase UID / Supabase UID
  const handleCompleteProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!fullName || !companyName || !phone) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    try {
      const supabaseUser = (await supabase.auth.getUser()).data.user;
      const userId = tempUserId || supabaseUser?.id || firebaseAuth.currentUser?.uid;
      if (!userId) {
        throw new Error("No authenticated user found. Please sign in again.");
      }

      const generatedClientId = `DC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const userEmail = email || supabaseUser?.email || firebaseAuth.currentUser?.email || "";


      // Upsert profile in Supabase
      const { error: insertError } = await supabase.from("profiles").upsert([
        {
          id: userId,
          name: fullName,
          company_name: companyName,
          phone: phone,
          client_id: generatedClientId,
          email: userEmail,
        },
      ]);

      if (insertError) throw insertError;

      // Fetch newly created profile
      await fetchProfile(userId);
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Error creating profile in Supabase:", err);
      setError(err.message || "Could not complete profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #007FCD 0%, #00AFCF 60%, #14C6C8 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-16 left-12 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-24 right-8 w-80 h-80 rounded-full bg-white/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-14">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold">DC</span>
              </div>
              <div>
                <p className="text-white font-semibold">Desire Consultancy</p>
                <p className="text-white/70 text-sm">Client Portal</p>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Your compliance<br />journey, simplified.
            </h2>
            <p className="text-white/80 text-lg leading-relaxed max-w-sm">
              Track certifications, manage documents, and monitor progress — all in one place.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: "FSSAI Licensing", detail: "Food safety compliance made easy" },
              { label: "BIS Certification", detail: "Bureau of Indian Standards approvals" },
              { label: "Trademark Registration", detail: "Protect your brand identity" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium text-sm">{item.label}</p>
                  <p className="text-white/60 text-xs">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white lg:bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-[rgba(15,23,42,0.06)] rounded-2xl p-6 sm:p-8 shadow-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}>
              <span className="text-white text-xs font-bold">DC</span>
            </div>
            <span className="font-semibold text-[#0F172A] text-sm">Desire Consultancy</span>
          </div>

          {mode === "complete-profile" ? (
            <div>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-[#0F172A] mb-1">Complete Your Profile</h1>
                <p className="text-[#64748B] text-xs">Set up your details to initialize your consultancy dashboard.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-start gap-2 border border-red-100 animate-shake">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCompleteProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 font-semibold uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-10 px-3 text-xs bg-white border border-[rgba(15,23,42,0.12)] rounded-lg focus:outline-none focus:border-[#007FCD] focus:ring-2 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 font-semibold uppercase tracking-wide">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company legal name"
                    className="w-full h-10 px-3 text-xs bg-white border border-[rgba(15,23,42,0.12)] rounded-lg focus:outline-none focus:border-[#007FCD] focus:ring-2 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 font-semibold uppercase tracking-wide">Mobile Number (Phone)</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3 text-xs bg-white border border-[rgba(15,23,42,0.12)] rounded-lg focus:outline-none focus:border-[#007FCD] focus:ring-2 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all bg-[#007FCD] hover:bg-[#007FCD]/90 disabled:opacity-70 mt-2"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : "Save & Proceed"}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-6 text-center">
                <h1 className="text-xl font-bold text-[#0F172A] mb-1">
                  {mode === "login" ? "Sign In" : "Create Account"}
                </h1>
                <p className="text-[#64748B] text-xs">
                  {mode === "login"
                    ? "Access your Desire Consultancy projects"
                    : "Register to start your brand journey"}
                </p>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-10 rounded-lg text-xs font-semibold text-[#0F172A] border border-[rgba(15,23,42,0.12)] bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 mb-4 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
                  <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/>
                  <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/>
                  <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/>
                  <path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex py-2 items-center mb-4">
                <div className="flex-grow border-t border-[rgba(15,23,42,0.08)]"></div>
                <span className="flex-shrink mx-3 text-[#94A3B8] text-[10px] uppercase font-semibold">Or use email</span>
                <div className="flex-grow border-t border-[rgba(15,23,42,0.08)]"></div>
              </div>

              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-xs rounded-lg flex items-start gap-2 border border-emerald-100 animate-fade-in">
                  <Check size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-start gap-2 border border-red-100 animate-shake">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 font-semibold uppercase tracking-wide">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-10 px-3 text-xs bg-white border border-[rgba(15,23,42,0.12)] rounded-lg focus:outline-none focus:border-[#007FCD] focus:ring-2 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1.5 font-semibold uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-3 text-xs bg-white border border-[rgba(15,23,42,0.12)] rounded-lg focus:outline-none focus:border-[#007FCD] focus:ring-2 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all bg-[#007FCD] hover:bg-[#007FCD]/90 disabled:opacity-70 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>{mode === "login" ? "Sign In" : "Sign Up"}</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center text-xs">
                {mode === "login" ? (
                  <p className="text-[#64748B]">
                    New to the portal?{" "}
                    <button onClick={() => { setMode("signup"); setError(""); }} className="text-[#007FCD] font-bold hover:underline cursor-pointer">
                      Create an account
                    </button>
                  </p>
                ) : (
                  <p className="text-[#64748B]">
                    Already have an account?{" "}
                    <button onClick={() => { setMode("login"); setError(""); }} className="text-[#007FCD] font-bold hover:underline cursor-pointer">
                      Sign In
                    </button>
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#94A3B8]">
                <Shield size={11} />
                <span>Secured with 256-bit encryption</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

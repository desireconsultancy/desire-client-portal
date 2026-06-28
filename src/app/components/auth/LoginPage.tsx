import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAppStore } from "../../store/appStore";
import { ArrowRight, RefreshCw, Shield, AlertCircle, Check, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden shadow-[8px_0_30px_rgba(15,23,42,0.12)] border-r border-white/10 z-20">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover animate-slow-pan"
          style={{ zIndex: 0, filter: "blur(3px)" }}
        >
          <source src="/compliance_bg.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Stronger Blue Gradient Overlay (55-65%) */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: "linear-gradient(135deg, rgba(0, 78, 146, 0.6) 0%, rgba(0, 127, 205, 0.65) 50%, rgba(0, 175, 207, 0.7) 100%)",
            zIndex: 1
          }} 
        />

        {/* Vignette Overlay */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: "radial-gradient(circle, transparent 30%, rgba(15, 23, 42, 0.5) 100%)",
            zIndex: 1
          }} 
        />

        <div className="absolute inset-0 opacity-20" style={{ zIndex: 2 }}>
          <div className="absolute top-16 left-12 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-24 right-8 w-80 h-80 rounded-full bg-white/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between px-20 py-16 w-full h-full">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-16 animate-fade-in-up">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold">DC</span>
              </div>
              <div>
                <p className="text-white font-semibold">Desire Consultancy</p>
                <p className="text-white/80 text-sm font-medium">Client Portal</p>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-5xl xl:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6 animate-fade-in-up animation-delay-100">
              Your compliance<br />journey, simplified.
            </h2>

            {/* Description */}
            <p className="text-white/80 text-lg leading-relaxed max-w-md animate-fade-in-up animation-delay-200">
              Track certifications, manage documents, and monitor progress — all in one place.
            </p>

            {/* Trust Statistics */}
            <div className="grid grid-cols-3 gap-6 my-10 animate-fade-in-up animation-delay-300">
              {[
                { value: "500+", label: "Businesses", sublabel: "Served" },
                { value: "98%", label: "Approval", sublabel: "Success" },
                { value: "10+", label: "Years", sublabel: "Experience" }
              ].map((stat, index) => (
                <div key={index} className="flex flex-col border-l border-white/20 pl-4">
                  <span className="text-3xl font-extrabold text-white tracking-tight leading-none mb-1.5">{stat.value}</span>
                  <span className="text-white/80 text-xs font-semibold leading-tight">{stat.label}</span>
                  <span className="text-white/65 text-[10px] uppercase tracking-wider font-medium mt-0.5">{stat.sublabel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Glassmorphism Cards */}
          <div className="space-y-4 animate-fade-in-up animation-delay-400">
            {[
              { 
                label: "FSSAI Licensing", 
                detail: "Food safety compliance made easy" 
              },
              { 
                label: "BIS Certification", 
                detail: "Bureau of Indian Standards approvals" 
              },
              { 
                label: "Trademark Registration", 
                detail: "Protect your brand identity" 
              },
            ].map((item) => (
              <div 
                key={item.label} 
                className="flex items-start gap-4 p-4 bg-white/8 backdrop-blur-md border border-white/12 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/12 hover:border-white/20 group cursor-pointer shadow-sm"
              >
                <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center mt-0.5 group-hover:bg-white/20 transition-colors">
                  <Check className="text-white w-3.5 h-3.5" strokeWidth={3} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight mb-1">{item.label}</p>
                  <p className="text-white/65 text-xs leading-normal">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div 
        className="flex-1 flex items-center justify-center px-6 bg-gradient-to-b from-[#FFFFFF] via-[#F7FAFD] to-[#EEF6FC] lg:from-transparent lg:to-transparent lg:bg-[#F8FAFC]"
        style={{ 
          paddingTop: "max(80px, env(safe-area-inset-top))",
          paddingBottom: "max(60px, env(safe-area-inset-bottom))"
        }}
      >
        <div className="w-full max-w-md bg-white border border-slate-100/80 rounded-2xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] animate-fade-in-up">
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
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-[52px] px-4 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:border-[#007FCD] focus:ring-4 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company legal name"
                    className="w-full h-[52px] px-4 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:border-[#007FCD] focus:ring-4 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Mobile Number (Phone)</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-[52px] px-4 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:border-[#007FCD] focus:ring-4 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all bg-gradient-to-b from-[#008FCD] to-[#007FCD] hover:from-[#007FCD] hover:to-[#006FB4] disabled:opacity-70 cursor-pointer mt-4 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : "Save & Proceed"}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-8 text-center">
                <h1 className="text-xl font-bold text-[#0F172A] mb-1.5">
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
                className="w-full h-[52px] rounded-xl text-xs font-bold text-[#0F172A] border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 mb-6 cursor-pointer"
              >
                <svg className="w-[18px] h-[18px]" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
                  <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/>
                  <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/>
                  <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/>
                  <path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex py-2 items-center mb-6">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-3 text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Or use email</span>
                <div className="flex-grow border-t border-slate-100"></div>
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
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-[52px] px-4 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:border-[#007FCD] focus:ring-4 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-[52px] pl-4 pr-12 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:border-[#007FCD] focus:ring-4 focus:ring-[#007FCD]/10 transition-all text-[#0F172A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer flex items-center justify-center p-1 rounded-md hover:bg-slate-50"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[52px] rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all bg-gradient-to-b from-[#008FCD] to-[#007FCD] hover:from-[#007FCD] hover:to-[#006FB4] disabled:opacity-70 cursor-pointer mt-4 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] group"
                >
                  {loading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>{mode === "login" ? "Sign In" : "Sign Up"}</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs">
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

              <div className="mt-8 pt-6 border-t border-slate-100/80">
                <div className="grid grid-cols-3 gap-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 text-center">
                  <div className="flex flex-col items-center gap-1.5 p-1">
                    <Shield size={14} className="text-slate-400" />
                    <span>Secure</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 border-x border-slate-100/80 p-1">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Encrypted</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-1">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>Cloud</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

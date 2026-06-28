import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Award,
  Package,
  CreditCard,
  Bell,
  HeadphonesIcon,
  User,
  Settings,
  LogOut,
  X,
  ChevronRight,
  ShoppingBag,
  GanttChart,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { cn } from "../../utils/cn";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/timeline", icon: GanttChart, label: "Timeline" },
  { to: "/documents", icon: FileText, label: "Document Vault" },
  { to: "/certificates", icon: Award, label: "Certificates" },
  { to: "/orders", icon: Package, label: "Machine Orders" },
  { to: "/store", icon: ShoppingBag, label: "Machinery Store" },
  { to: "/payments", icon: CreditCard, label: "Payments" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/support", icon: HeadphonesIcon, label: "Support" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { user, logout, notificationCount } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/login");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[rgba(15,23,42,0.06)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}>
              <span className="text-white text-xs font-bold">DC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0F172A] leading-none">Desire Consultancy</p>
              <p className="text-xs text-[#94A3B8] mt-0.5">Client Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Client Badge */}
        {user && (
          <div className="mx-4 mt-4 px-3 py-2.5 bg-[#EFF6FF] rounded-lg border border-[#DBEAFE]">
            <p className="text-xs font-medium text-[#007FCD] truncate">{user.companyName}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{user.clientId}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto mt-1">
          <div className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-all",
                    isActive
                      ? "bg-[#EFF6FF] text-[#007FCD] font-medium"
                      : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={isActive ? "text-[#007FCD]" : "text-[#94A3B8]"} />
                    <span className="flex-1">{label}</span>
                    {label === "Notifications" && notificationCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#007FCD] text-white text-[10px] flex items-center justify-center font-medium">
                        {notificationCount}
                      </span>
                    )}
                    {isActive && <ChevronRight size={12} className="text-[#007FCD]" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-[rgba(15,23,42,0.06)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-md text-sm text-[#475569] hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={17} className="text-[#94A3B8]" />
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  );
}

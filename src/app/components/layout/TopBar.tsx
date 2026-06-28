import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useAppStore } from "../../store/appStore";

interface TopBarProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/documents": "Document Vault",
  "/certificates": "Certificate Center",
  "/orders": "Machine Orders",
  "/payments": "Payments",
  "/notifications": "Notifications",
  "/support": "Support Center",
  "/profile": "Profile",
  "/settings": "Settings",
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, notificationCount } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const pathKey = "/" + location.pathname.split("/")[1];
  const title = pageTitles[pathKey] ?? "Portal";
  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-[rgba(15,23,42,0.06)] flex items-center px-4 sm:px-6 gap-3">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-8 h-8 rounded-md flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] transition-colors"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <h1 className="text-sm font-semibold text-[#0F172A] flex-shrink-0">{title}</h1>

      <div className="flex-1 max-w-sm ml-2 hidden md:block">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search projects, documents..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#F8FAFC] border border-[rgba(15,23,42,0.08)] rounded-md placeholder:text-[#94A3B8] text-[#0F172A] focus:outline-none focus:border-[#007FCD] focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => navigate("/notifications")}
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#007FCD]" />
          )}
        </button>

        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F8FAFC] transition-colors ml-1"
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
          >
            {initials}
          </div>
          <span className="text-xs font-medium text-[#0F172A] hidden lg:block">{user?.name}</span>
          <ChevronDown size={11} className="text-[#94A3B8] hidden lg:block" />
        </button>
      </div>
    </header>
  );
}

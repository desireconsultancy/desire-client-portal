import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, FolderKanban, FileText, Award, Package,
  CreditCard, Bell, HeadphonesIcon, User, Settings, LogOut, ShoppingBag, GanttChart,
} from "lucide-react";
import { useAppStore } from "../../store/appStore";
import { cn } from "../../utils/cn";

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
];

const bottomItems = [
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  badge?: number;
}

function NavItem({ to, icon: Icon, label, end, badge }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-100 group relative",
          isActive
            ? "bg-[#EFF6FF] text-[#007FCD] font-medium"
            : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[#007FCD]" />
          )}
          <Icon
            size={15}
            className={cn(
              "flex-shrink-0 transition-colors",
              isActive ? "text-[#007FCD]" : "text-[#94A3B8] group-hover:text-[#64748B]"
            )}
          />
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#007FCD] text-white text-[10px] flex items-center justify-center font-semibold flex-shrink-0">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { user, logout, notificationCount } = useAppStore();
  const navigate = useNavigate();

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-[rgba(15,23,42,0.06)] flex flex-col h-full" aria-label="Main navigation">
      {/* Brand */}
      <div className="px-5 h-14 flex items-center border-b border-[rgba(15,23,42,0.06)] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #007FCD, #00AFCF)" }}
          >
            <span className="text-white text-[11px] font-bold tracking-tight">DC</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] leading-none">Desire Consultancy</p>
            <p className="text-[10px] text-[#94A3B8] mt-0.5 leading-none">Client Portal</p>
          </div>
        </div>
      </div>

      {/* Client card */}
      {user && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 bg-[#F8FAFC] rounded-lg border border-[rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0" />
            <p className="text-[11px] font-semibold text-[#007FCD] truncate">{user.companyName}</p>
          </div>
          <p className="text-[10px] text-[#94A3B8] pl-3.5">{user.clientId}</p>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-2.5 py-2 overflow-y-auto space-y-0.5" aria-label="Navigation">
        {navItems.map(({ to, icon, label, end }) => (
          <NavItem
            key={to}
            to={to}
            icon={icon}
            label={label}
            end={end}
            badge={label === "Notifications" ? notificationCount : undefined}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 h-px bg-[rgba(15,23,42,0.05)]" />

      {/* Bottom nav */}
      <div className="px-2.5 py-2 space-y-0.5">
        {bottomItems.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} />
        ))}
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#64748B] hover:bg-red-50 hover:text-red-600 transition-colors group"
        >
          <LogOut size={15} className="text-[#94A3B8] group-hover:text-red-500 transition-colors flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

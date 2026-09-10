import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  UploadCloud,
  FileBarChart,
  Bell,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_LONG_NAME, APP_SHORT_NAME } from "@/lib/branding";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/upload", label: "Upload Report", icon: UploadCloud },
  { to: "/reports", label: "Weekly Reports", icon: FileBarChart },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card/60 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 size={18} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">{APP_SHORT_NAME}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{APP_LONG_NAME}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent"
              )
            }
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[11px] text-muted-foreground">Operations Team</p>
        <p className="text-[11px] text-muted-foreground/70">v1.0 · Local data only</p>
      </div>
    </aside>
  );
}

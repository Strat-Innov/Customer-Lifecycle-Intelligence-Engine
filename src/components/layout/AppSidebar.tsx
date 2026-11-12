import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  UploadCloud,
  FileBarChart,
  Bell,
  Building2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
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
  const { data, setHideCustomerNames } = useAppData();
  const hidden = data.settings.hide_customer_names;

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

      <div className="px-3 pb-3">
        <button
          type="button"
          role="switch"
          aria-checked={hidden}
          onClick={() => setHideCustomerNames(!hidden)}
          className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={hidden ? "Customer names are shown as Customer 1, Customer 2, ..." : "Real customer names are visible"}
        >
          {hidden ? <EyeOff size={14} className="text-primary" /> : <Eye size={14} />}
          <span className="flex-1">{hidden ? "Customer names hidden" : "Customer names visible"}</span>
          <span
            className={cn(
              "relative h-4 w-7 rounded-full transition-colors",
              hidden ? "bg-primary" : "bg-secondary"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
                hidden ? "left-3.5" : "left-0.5"
              )}
            />
          </span>
        </button>
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[11px] text-muted-foreground">Operations Team</p>
        <p className="text-[11px] text-muted-foreground/70">v1.0 · Local data only</p>
      </div>
    </aside>
  );
}

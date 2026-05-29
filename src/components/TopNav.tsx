import { Anchor, CalendarClock, Map, ShipWheel } from "lucide-react";
import type { AppPage } from "../App";

const navItems: Array<{ id: AppPage; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "proforma", label: "Proforma Schedule", icon: Anchor },
  { id: "longTerm", label: "Long Term Schedule", icon: CalendarClock },
  { id: "coastal", label: "Coastal Schedule", icon: ShipWheel },
  { id: "master", label: "Master Data", icon: Map },
];

interface TopNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

export function TopNav({ currentPage, onNavigate }: TopNavProps) {
  return (
    <header className="border-b border-slate-300 bg-white">
      <div className="flex h-12 items-center gap-2 px-4">
        <div className="mr-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-harbor text-white">
            <ShipWheel size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-ink">Schedule Management</div>
            <div className="text-[11px] text-slate-500">Shipping Operations MVP</div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`inline-flex h-9 items-center gap-1.5 rounded px-3 text-sm font-medium transition ${
                  active
                    ? "bg-port text-white shadow-grid"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                }`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

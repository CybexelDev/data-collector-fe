import { BarChart3, ClipboardCheck, LayoutDashboard, LogOut, Settings, Users, Wallet, X } from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "submissions", label: "Submissions", Icon: ClipboardCheck },
  { id: "collectors", label: "Collectors", Icon: Users },
  { id: "payouts", label: "Payouts", Icon: Wallet },
  { id: "reports", label: "Reports", Icon: BarChart3 },
  { id: "settings", label: "Settings", Icon: Settings },
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "A";

/**
 * Props
 *  active           id of the current page (only "dashboard" exists for now)
 *  onNavigate(id)   called when a nav item is clicked
 *  mobileOpen       mobile drawer state
 *  onCloseMobile    closes the mobile drawer
 *  user             { name, role }
 *  onLogout         logout callback
 *  badges           { [id]: number } count pills, e.g. { submissions: 37 }
 */
export default function AdminSidebar({
  active = "dashboard",
  onNavigate,
  mobileOpen = false,
  onCloseMobile,
  user,
  onLogout,
  badges = {},
}) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-zinc-900/40 backdrop-blur-[2px] lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        id="admin-sidebar"
        aria-label="Admin sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-[transform,visibility] duration-300 ease-[cubic-bezier(.22,1,.36,1)] lg:visible lg:translate-x-0 ${
          mobileOpen ? "visible translate-x-0 shadow-2xl" : "invisible -translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-[11px] font-bold tracking-wide text-white shadow-sm">
            NME
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">NME Admin</p>
            <p className="truncate text-xs text-zinc-500">Data collection console</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className={`rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 lg:hidden ${focusRing}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Workspace</p>
          <div className="space-y-0.5">
            {NAV.map(({ id, label, Icon }) => {
              const isActive = active === id;
              const badge = badges[id];
              return (
             <button
  key={id}
  type="button"
  onClick={() => onNavigate?.(id)}
  aria-current={isActive ? "page" : undefined}
  className={`group relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? "bg-zinc-100 text-zinc-900"
      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
  } ${focusRing}`}
>
                  <span
                    className={`absolute -left-3 top-2 h-6 w-[3px] origin-center rounded-r bg-indigo-600 transition-transform duration-300 ${
                      isActive ? "scale-y-100" : "scale-y-0"
                    }`}
                    aria-hidden="true"
                  />
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-700"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-left">{label}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-zinc-900 px-1.5 text-[11px] font-semibold tabular-nums leading-5 text-white">
                      <span className="sr-only">Pending: </span>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Profile */}
        <div className="border-t border-zinc-200 p-3">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {initials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">{user?.name || "Admin"}</p>
              <p className="truncate text-xs text-zinc-500">{user?.role || "Administrator"}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
              className={`rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 ${focusRing}`}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
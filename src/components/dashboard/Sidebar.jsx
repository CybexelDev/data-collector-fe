import { NavLink, useNavigate } from "react-router-dom";
import { ClipboardList, LayoutDashboard, LogOut, PlusCircle, UserRound, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { getStoredUser, logout } from "../../api/authservice";

const NAV = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/add-listing", label: "Add New Listing", Icon: PlusCircle },
  { to: "/submissions", label: "My Submissions", Icon: ClipboardList },
  { to: "/earnings", label: "My Earnings", Icon: Wallet },
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80";

// Layered motion: drifting background blobs + staggered nav entrance.
// Both are disabled for users who prefer reduced motion.
const MOTION_CSS = `
@keyframes nme-drift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(16px,-22px,0) scale(1.1); } }
@keyframes nme-side-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
.nme-drift { animation: nme-drift 16s ease-in-out infinite; }
.nme-side-in { animation: nme-side-in 520ms cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) { .nme-drift, .nme-side-in { animation: none; } }
`;

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    logout();
    toast.success("Signed out.");
    navigate("/login", { replace: true });
  };

  return (
    <>
      <style>{MOTION_CSS}</style>

      {open && (
        <div className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        id="app-sidebar"
        aria-label="Sidebar"
className={`fixed inset-y-0 left-0 z-40 w-64 overflow-hidden bg-[linear-gradient(160deg,#4285F4_0%,#1A73E8_55%,#174EA6_100%)] p-3 transition-[transform,visibility] duration-300 ease-out lg:visible lg:translate-x-0 ${
  open ? "visible translate-x-0" : "invisible -translate-x-full"
}`}
      >
        {/* Ambient color behind the glass */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="nme-drift absolute -left-12 top-8 h-56 w-56 rounded-full bg-indigo-500/80 blur-3xl" />
          <div className="nme-drift absolute -right-16 top-1/2 h-52 w-52 rounded-full bg-violet-500/80 blur-3xl [animation-delay:-5s]" />
          <div className="nme-drift absolute -bottom-12 left-4 h-52 w-52 rounded-full bg-sky-400/30 blur-3xl [animation-delay:-10s]" />
        </div>

        {/* Glass panel */}
        <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl">
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_28%)]" aria-hidden="true" />

          {/* Brand */}
          <div className="relative flex h-16 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-[11px] font-bold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-md">
                NME
              </div>
              <div className="leading-tight">
                <p className="font-serif text-[15px] font-semibold tracking-tight text-white">Data Collection</p>
                <p className="text-[11px] text-indigo-200/80">Internal platform</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className={`rounded-lg p-2 text-indigo-100 transition hover:bg-white/10 hover:text-white lg:hidden ${focusRing}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav aria-label="Main" className="relative flex-1 overflow-y-auto px-3 py-5">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200/60">Menu</p>
            <div className="space-y-1.5">
              {NAV.map(({ to, label, Icon }, i) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={onClose}
                  style={{ animationDelay: `${120 + i * 60}ms` }}
                  className={({ isActive }) =>
                    `nme-side-in group relative flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-all duration-200 ${focusRing} ${
                      isActive
                        ? "border-white/25 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_20px_rgba(0,0,0,0.25)] backdrop-blur-md"
                        : "border-transparent text-indigo-100/80 hover:border-white/10 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 transition duration-200 group-hover:scale-110 ${
                          isActive ? "text-white" : "text-indigo-200 group-hover:text-white"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{label}</span>
                      <span
                        className={`h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_2px_rgba(125,211,252,0.65)] transition duration-300 ${
                          isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
                        }`}
                        aria-hidden="true"
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Account */}
          <div className="relative border-t border-white/10 p-3">
            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-md">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#818cf8,#a78bfa)] text-sm font-semibold uppercase text-white ring-2 ring-white/25">
                {user?.username?.[0] || "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user?.username || "User"}</p>
                <p className="text-xs capitalize text-indigo-200/80">{user?.role || "user"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={`mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-medium text-indigo-100 transition hover:border-red-300/30 hover:bg-red-400/15 hover:text-red-100 ${focusRing}`}
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
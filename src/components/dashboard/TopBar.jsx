import { Menu } from "lucide-react";
import { getStoredUser } from "../../api/authservice";

export default function Topbar({ title, onMenu, menuOpen }) {
  const user = getStoredUser();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        className="-ml-2 rounded-lg p-2.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="hidden text-xs text-slate-400 sm:block">NME / {title}</p>
        <h1 className="truncate text-base font-semibold text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="hidden text-sm font-medium text-slate-700 sm:block">{user?.username}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold uppercase text-indigo-700">
          {user?.username?.[0] || "U"}
        </div>
      </div>
    </header>
  );
}
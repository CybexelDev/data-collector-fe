import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./TopBar";

const TITLES = {
  "/dashboard": "Dashboard",
  "/add-listing": "Add New Listing",
  "/submissions": "My Submissions",
  "/earnings": "My Earnings",
  "/profile": "My Profile",
};

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        Skip to content
      </a>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar title={TITLES[pathname] || "Dashboard"} onMenu={() => setOpen(true)} menuOpen={open} />
        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
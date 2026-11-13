import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getStoredUser, logout } from "../api/authservice";

export default function DashboardPlaceholder({ title }) {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    logout();
    toast.success("Signed out.");
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as <strong>{user?.username}</strong> ({user?.role}). Placeholder page, dashboard coming later.
        </p>
        <button
          onClick={handleLogout}
          className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/30"
        >
          Log out
        </button>
      </div>
    </main>
  );
}
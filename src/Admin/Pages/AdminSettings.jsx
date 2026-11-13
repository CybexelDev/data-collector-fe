
import { useState } from "react";
import {
  Menu,
  Bell,
  CircleUserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Search,
} from "lucide-react";

import AdminSidebar from "../../components/admin/AdminSidebar";
import { getStoredUser, logout } from "../../api/authservice";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import usePendingSubmissionsCount from "../../hooks/usePendingSubmissionCount";
import { changeAdminPassword } from "../../api/adminsettingsservice";

export default function AdminSettings() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const { pendingCount } = usePendingSubmissionsCount();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleNavigate = (id) => {
    const routes = {
      dashboard: "/admin/dashboard",
      submissions: "/admin/submissions",
      collectors: "/admin/collectors",
      payouts: "/admin/payouts",
      reports: "/admin/reports",
      settings: "/admin/settings",
    };

    if (routes[id]) {
      navigate(routes[id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      await changeAdminPassword({ newPassword, confirmPassword });

      toast.success("Admin password changed successfully.");

      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to change password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <AdminSidebar
        user={user}
        onLogout={handleLogout}
        active="settings"
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
                badges={{ submissions: pendingCount }}

      />

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="-ml-2 rounded-lg p-2.5 text-zinc-600 transition hover:bg-zinc-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <p className="text-xs text-zinc-400">
                Admin / Settings
              </p>
              <h2 className="text-sm font-semibold text-zinc-900">
                Settings
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="rounded-xl p-2.5 text-zinc-500 transition hover:bg-zinc-100"
            >
              <Bell className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
              <CircleUserRound className="h-8 w-8 shrink-0 text-zinc-400" />

              <div className="hidden sm:block">
                <p className="max-w-[160px] truncate text-sm font-medium text-zinc-800">
                  {user?.name ||
                    user?.fullName ||
                    user?.email ||
                    "Admin"}
                </p>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-zinc-500 hover:text-zinc-800"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="min-h-screen px-4 pb-10 pt-6 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Page Header */}
          <div className="mb-8">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <LockKeyhole size={24} />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Settings
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Manage your admin account security and password.
            </p>
          </div>

          {/* Security Card */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {/* Card Header */}
            <div className="flex items-center gap-3 border-b border-zinc-100 p-5 sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <KeyRound size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-zinc-900">
                  Change Password
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Update your password to keep your account secure.
                </p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-5 sm:p-6"
            >
              {/* New Password */}
              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  New Password
                </label>

                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Enter your new password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-zinc-400">
                  Minimum 8 characters required.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Confirm New Password
                </label>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Re-enter your new password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className={`w-full rounded-xl border bg-zinc-50 px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-4 ${
                      confirmPassword &&
                      confirmPassword !== newPassword
                        ? "border-rose-300 focus:border-rose-400 focus:ring-rose-50"
                        : "border-zinc-200 focus:border-indigo-400 focus:ring-indigo-50"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {confirmPassword && (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-xs ${
                      newPassword === confirmPassword
                        ? "text-emerald-600"
                        : "text-rose-500"
                    }`}
                  >
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 size={14} />
                        Passwords match
                      </>
                    ) : (
                      "Passwords do not match"
                    )}
                  </p>
                )}
              </div>

              {/* Security Info */}
              <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-indigo-600"
                />

                <div>
                  <p className="text-sm font-medium text-indigo-900">
                    Keep your account secure
                  </p>

                  <p className="mt-1 text-xs leading-5 text-indigo-700">
                    Use a strong, unique password. Avoid sharing
                    your admin credentials with anyone.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword ||
                    newPassword.length < 8
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LockKeyhole size={16} />

                  {submitting
                    ? "Updating Password..."
                    : "Change Password"}
                </button>
              </div>
            </form>
          </section>

          {/* Bottom Info */}
          <p className="mt-5 text-center text-xs text-zinc-400">
            NME Admin Panel · Account Security
          </p>
        </div>
      </main>
    </div>
  );
}

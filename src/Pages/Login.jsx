import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FormField from "../components/FormField";
import { getStoredUser, getToken, login, roleHome } from "../api/authservice";

function getErrorMessage(err) {
  if (!err.response) {
    if (err.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (err.request) return "Cannot reach the server. Check your connection and try again.";
    return err.message || "Something went wrong.";
  }
  const { status, data } = err.response;
  if (status === 400 || status === 401) return data?.message || "Invalid username or password.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "Server error. Please try again later.";
  return data?.message || "Login failed. Please try again.";
}

export default function Login() {
  const navigate = useNavigate();
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Already signed in -> skip the login page
  const existingUser = getStoredUser();
  if (getToken() && existingUser && roleHome(existingUser.role)) {
    return <Navigate to={roleHome(existingUser.role)} replace />;
  }

  const validate = () => {
    const next = {};
    if (!username.trim()) next.username = "Username is required.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    if (next.username) usernameRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // <form> onSubmit also handles Enter key
    if (loading) return;
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      const destination = roleHome(user.role);
      if (!destination) {
        throw new Error("Your account has no valid role. Contact an administrator.");
      }
      toast.success(`Welcome back, ${user.username}!`);
      navigate(destination, { replace: true });
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Text-based brand mark */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-sm font-bold tracking-wide text-white">
            NME
          </div>
          <span className="text-lg font-semibold text-slate-900">NME Data Collection</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Sign in to access the data collection platform.
          </p>

          {formError && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <FormField
              id="username"
              ref={usernameRef}
              label="Username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={errors.username}
              disabled={loading}
            />

            <FormField
              id="password"
              ref={passwordRef}
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={loading}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/30"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              }
            />

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
                </svg>
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Internal use only. Authorized personnel.
        </p>
      </div>
    </main>
  );
}
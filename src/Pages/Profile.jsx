import { getStoredUser } from "../api/authservice";

export default function Profile() {
  const user = getStoredUser();
  const rows = [
    ["Username", user?.username],
    ["Role", user?.role],
    ["User ID", user?.id],
  ];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Your account details.</p>
      </div>
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">{k}</dt>
              <dd className="break-all text-right font-medium capitalize-none text-slate-900">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Accounts are created and managed by an administrator. Contact them to change your details.
        </p>
      </section>
    </div>
  );
}
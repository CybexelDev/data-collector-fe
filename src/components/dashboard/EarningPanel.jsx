import { Link } from "react-router-dom";
import { formatINR } from "../../utils/format";

export default function EarningsPanel({ stats, loading }) {
  return (
    <section aria-labelledby="earn-title" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="earn-title" className="text-base font-semibold text-slate-900">Earnings Summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-500">Approved earnings</dt>
          <dd className="text-lg font-semibold text-emerald-700">{loading ? "…" : formatINR(stats.earnings)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-slate-100 pt-3">
          <dt className="text-slate-500">Pending (not yet earned)</dt>
          <dd className="font-medium text-slate-700">{loading ? "…" : formatINR(stats.pendingEarnings)}</dd>
        </div>
      </dl>
      <Link
        to="/earnings"
        className="mt-5 block rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        View Earnings
      </Link>
    </section>
  );
}
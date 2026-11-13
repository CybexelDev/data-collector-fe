import { ArrowRight, CheckCircle2, Clock, Info, Plus, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import useDashboardData from "../hooks/useDashboardData";
import { formatDate, formatINR } from "../utils/format";
import { useEffect, useState } from "react";
import { getMyPayouts } from "../api/payoutservice";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

// Staggered entrance; disabled for users who prefer reduced motion.
const MOTION_CSS = `
@keyframes nme-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.nme-rise { animation: nme-rise 560ms cubic-bezier(.22,1,.36,1) both; animation-delay: var(--d, 0ms); }
@media (prefers-reduced-motion: reduce) { .nme-rise { animation: none; } }
`;

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";

export default function Earnings() {
  const {
    data,
    loading,
    error,
    reload,
  } = useDashboardData();

  const [payoutData, setPayoutData] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [payoutError, setPayoutError] = useState("");

  const loadPayouts = async () => {
    try {
      setPayoutLoading(true);
      setPayoutError("");

      const response = await getMyPayouts();
      setPayoutData(response);
    } catch (err) {
      setPayoutError(
        err.response?.data?.message || "Failed to load earnings"
      );
    } finally {
      setPayoutLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const stats = payoutData?.summary;
  const payments = payoutData?.payments || [];

  const approved = (data?.submissions || []).filter(
    (s) => s.status === "approved"
  );

  const isLoading = loading || payoutLoading;
  return (
    <div className="space-y-8">
      <style>{MOTION_CSS}</style>

      {/* Header */}
      <header className="nme-rise relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1 bg-indigo-700" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-50" aria-hidden="true" />
        <div className="relative p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Payments</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">My Earnings</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            You earn only on listings approved by an administrator.
          </p>
        </div>
      </header>

      {data?.isMock && (
        <div role="note" className="nme-rise flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Preview mode: these are sample records for UI design only, not your real submissions or earnings.</p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section
          aria-labelledby="approved-title"
          style={{ "--d": "100ms" }}
          className="nme-rise relative overflow-hidden rounded-xl bg-indigo-950 p-6 text-white shadow-md sm:p-8 lg:col-span-2"
        >
          <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-white/[0.03]" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 id="approved-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-200">
                Approved earnings
              </h3>
            </div>
            {loading ? (
              <div className="mt-5 h-12 w-48 animate-pulse rounded bg-white/10" />
            ) : (
<p className="mt-5 font-serif text-5xl font-semibold tabular-nums tracking-tight">
  {formatINR(stats?.totalEarned)}
</p>            )}
            <p className="mt-3 text-sm text-indigo-200">
              {loading
                ? "\u00A0"
                : `From ${stats?.approvedCount ?? 0} approved ${stats?.approved === 1 ? "listing" : "listings"}. Pending and rejected listings are never counted.`}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="pending-title"
          style={{ "--d": "180ms" }}
          className="nme-rise flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="mt-5">
          <h3 id="pending-title">
  Remaining payout
</h3>


            {loading ? (
              <div className="mt-2 h-9 w-28 animate-pulse rounded bg-slate-100" />
            ) : (
              <p className="mt-1 font-serif text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
                {formatINR(stats?.pendingEarnings)}
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-400">
              {loading ? "\u00A0" : `${stats?.pending ?? 0} awaiting review. Becomes earnings only if approved.`}
            </p>
          </div>
        </section>
      </div>

      {/* Breakdown */}
      
<section
  aria-labelledby="transaction-title"
  style={{ "--d": "260ms" }}
  className="nme-rise overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
>
  <div className="px-5 py-4 sm:px-6">
    <h3
      id="transaction-title"
      className="font-serif text-lg font-semibold text-slate-900"
    >
      Transaction History
    </h3>
    <p className="text-xs text-slate-500">
      Your payout records and payment status
    </p>
  </div>

  {loading ? (
    <div className="space-y-3 border-t border-slate-100 p-5" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg bg-slate-100"
        />
      ))}
    </div>
  ) : payments.length === 0 ? (
    <div className="flex flex-col items-center border-t border-slate-100 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
        <Wallet className="h-6 w-6" aria-hidden="true" />
      </div>

      <h4 className="mt-4 font-serif text-base font-semibold text-slate-900">
        No transactions yet
      </h4>

      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Your payout transactions will appear here once a payment is processed.
      </p>
    </div>
  ) : (
    <>
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {payments.map((payment) => (
          <li
            key={payment._id}
            className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-indigo-50/30 sm:px-6"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {payment.paymentMethod || "Payout"}
                </p>

                <p className="text-xs text-slate-500">
                  {formatDate(payment.paidAt || payment.createdAt)}
                </p>

                {payment.transactionReference && (
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    Ref: {payment.transactionReference}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <p className="font-serif text-base font-semibold tabular-nums text-emerald-700">
                {formatINR(payment.amount)}
              </p>

              <span
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  payment.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                    : payment.status === "pending"
                    ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {payment.status
                  ? payment.status.charAt(0).toUpperCase() +
                    payment.status.slice(1)
                  : "Unknown"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Total Paid
        </span>

        <span className="font-serif text-lg font-semibold tabular-nums text-slate-900">
          {formatINR(stats?.totalPaid ?? 0)}
        </span>
      </div>
    </>
  )}
</section>


      <div className="flex justify-end">
        <Link
          to="/submissions"
          className={`group inline-flex items-center gap-1 rounded-md px-1 text-sm font-medium text-indigo-700 hover:text-indigo-800 ${focusRing}`}
        >
          View all submissions
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
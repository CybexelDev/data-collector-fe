import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Camera, CheckCircle2, ChevronRight, ClipboardList, Clock,
  IndianRupee, Info, MapPin, Plus, PlusCircle, Wallet, X, XCircle,
} from "lucide-react";
import useDashboardData from "../hooks/useDashboardData";
import { getStoredUser } from "../api/authservice";
import { formatDate, formatINR, getGreeting } from "../utils/format";

const ZERO = { total: 0, approved: 0, pending: 0, earnings: 0, pendingEarnings: 0 };

const STATUS = {
  pending: { label: "Pending", Icon: Clock, cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  approved: { label: "Approved", Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Rejected", Icon: XCircle, cls: "bg-red-50 text-red-700 ring-red-600/20" },
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

// Staggered entrance + modal pop. Disabled for users who prefer reduced motion.
const MOTION_CSS = `
@keyframes nme-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes nme-pop { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.nme-rise { animation: nme-rise 560ms cubic-bezier(.22,1,.36,1) both; animation-delay: var(--d, 0ms); }
.nme-pop { animation: nme-pop 220ms cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) { .nme-rise, .nme-pop { animation: none; } }
`;

const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";

// ─── Small building blocks (same file) ───────────────────────

function StatusBadge({ status }) {
  const { label, Icon, cls } = STATUS[status] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
    Icon: Info,
    cls: "bg-slate-100 text-slate-700 ring-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, to, hint, loading, valueClass = "text-slate-900", delay = 0 }) {
  return (
    <Link
      to={to}
      style={{ "--d": `${delay}ms` }}
      className={`nme-rise group relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${focusRing}`}
    >
      <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-indigo-700 transition-transform duration-300 group-hover:scale-x-100" aria-hidden="true" />
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-700" aria-hidden="true" />
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-24 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className={`mt-1 font-serif text-3xl font-semibold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
      )}
      <p className="mt-1.5 text-xs text-slate-400 transition group-hover:text-slate-500">{hint}</p>
    </Link>
  );
}

function SampleDataNotice() {
  return (
    <div role="note" className="nme-rise flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>Preview mode: these are sample records for UI design only, not your real submissions or earnings.</p>
    </div>
  );
}

function RecentSubmissions({ submissions, loading, onView }) {
  const recent = [...submissions]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  const viewBtn = `inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 ${focusRing}`;

  return (
    <section aria-labelledby="recent-title" style={{ "--d": "380ms" }} className="nme-rise h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div>
          <h2 id="recent-title" className="font-serif text-lg font-semibold text-slate-900">Recent Submissions</h2>
          <p className="text-xs text-slate-500">Your latest listings and their review status</p>
        </div>
        <Link to="/submissions" className={`group inline-flex items-center gap-1 rounded-md px-1 text-sm font-medium text-indigo-700 hover:text-indigo-800 ${focusRing}`}>
          View all
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 border-t border-slate-100 p-5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center border-t border-slate-100 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <ClipboardList className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-serif text-base font-semibold text-slate-900">No submissions yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Start by adding your first listing. Once submitted, it will appear here with its review status.
          </p>
          <Link to="/add-listing" className={`mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-indigo-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 ${focusRing}`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add New Listing
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop / tablet */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Business / Listing</th>
                  <th scope="col" className="px-4 py-3">Location</th>
                  <th scope="col" className="px-4 py-3">Photos</th>
                  <th scope="col" className="px-4 py-3">Submitted On</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((s) => (
                  <tr key={s.id} className="transition hover:bg-indigo-50/30">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                          {initials(s.name)}
                        </span>
                        <span className="font-medium text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{s.location}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{s.photos}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{formatDate(s.submittedAt)}</td>
                    <td className="px-4 py-3.5"><StatusBadge status={s.status} /></td>
                    <td className="px-6 py-3.5 text-right">
                      <button type="button" onClick={() => onView(s)} className={viewBtn}>
                        View details<ChevronRight className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only"> for {s.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">
            {recent.map((s) => (
              <li key={s.id} className="space-y-3 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                      {initials(s.name)}
                    </span>
                    <p className="truncate font-medium text-slate-900">{s.name}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{s.location}</span>
                  <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" aria-hidden="true" />{s.photos} photos</span>
                  <span>{formatDate(s.submittedAt)}</span>
                </div>
                <button type="button" onClick={() => onView(s)} className={`${viewBtn} -ml-2 min-h-11`}>
                  View details<ChevronRight className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only"> for {s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function EarningsPanel({ stats, loading }) {
  return (
    <section aria-labelledby="earn-title" style={{ "--d": "450ms" }} className="nme-rise relative overflow-hidden rounded-xl bg-indigo-950 p-6 text-white shadow-md">
      <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-white/[0.03]" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          <h2 id="earn-title" className="font-serif text-lg font-semibold">Earnings Summary</h2>
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">Approved earnings</p>
        {loading ? (
          <div className="mt-2 h-10 w-32 animate-pulse rounded bg-white/10" />
        ) : (
          <p className="mt-1 font-serif text-4xl font-semibold tabular-nums tracking-tight">{formatINR(stats.earnings)}</p>
        )}

        <div className="mt-5 flex items-baseline justify-between border-t border-white/10 pt-4 text-sm">
          <span className="text-indigo-200">Pending (not yet earned)</span>
          <span className="font-medium tabular-nums">{loading ? "…" : formatINR(stats.pendingEarnings)}</span>
        </div>

        <Link
          to="/earnings"
          className="group mt-6 flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          View Earnings
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

const ACTIONS = [
  { to: "/add-listing", label: "Add New Listing", desc: "Start a new submission", Icon: PlusCircle },
  { to: "/submissions", label: "View My Submissions", desc: "Track review status", Icon: ClipboardList },
  { to: "/earnings", label: "View My Earnings", desc: "See what you've earned", Icon: Wallet },
];

function QuickActions() {
  return (
    <section aria-labelledby="qa-title" style={{ "--d": "520ms" }} className="nme-rise rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <h2 id="qa-title" className="px-3 pb-1 pt-3 font-serif text-lg font-semibold text-slate-900">Quick Actions</h2>
      <ul>
        {ACTIONS.map(({ to, label, desc, Icon }) => (
          <li key={to}>
            <Link to={to} className={`group flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-slate-50 ${focusRing}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 transition group-hover:bg-indigo-700 group-hover:text-white group-hover:ring-indigo-700">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800">{label}</span>
                <span className="block text-xs text-slate-500">{desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubmissionDetails({ submission: s, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const rows = [
    ["Location", s.location],
    ["Photos", `${s.photos} uploaded`],
    ["Submitted on", formatDate(s.submittedAt)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        onClick={(e) => e.stopPropagation()}
        className="nme-pop w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100">
              {initials(s.name)}
            </span>
            <div className="min-w-0">
              <h2 id="details-title" className="truncate font-serif text-lg font-semibold text-slate-900">{s.name}</h2>
              <div className="mt-1"><StatusBadge status={s.status} /></div>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className={`rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${focusRing}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-5 divide-y divide-slate-100 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium text-slate-900">{v}</dd>
            </div>
          ))}
          {s.status === "approved" && (
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Earned</dt>
              <dd className="font-medium text-emerald-700">{formatINR(s.payout)}</dd>
            </div>
          )}
        </dl>

        {s.status === "rejected" && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">Reviewer feedback</p>
            <p className="mt-1">{s.rejectionReason || "No feedback has been provided for this submission."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, loading, error, reload } = useDashboardData();
  const [selected, setSelected] = useState(null);
  const closeDetails = useCallback(() => setSelected(null), []);
  const username = getStoredUser()?.username || "there";
  const stats = data?.stats || ZERO;
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-8">
      <style>{MOTION_CSS}</style>

      {/* Welcome */}
      <section className="nme-rise relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1 bg-indigo-700" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-indigo-50" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">{today}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">
              {getGreeting()}, {username}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Track your submissions, monitor your progress, and stay updated on your earnings.
            </p>
          </div>
          <Link
            to="/add-listing"
            className={`group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-md ${focusRing}`}
          >
            <Plus className="h-4 w-4 transition group-hover:rotate-90" aria-hidden="true" />
            Add New Listing
          </Link>
        </div>
      </section>

      {data?.isMock && <SampleDataNotice />}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={reload} className="font-medium underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total Submissions" value={stats.total} to="/submissions" hint="View all submissions" loading={loading} delay={100} />
        <StatCard icon={CheckCircle2} label="Approved Listings" value={stats.approved} to="/submissions?status=approved" hint="Confirmed by an administrator" loading={loading} delay={170} />
        <StatCard icon={Clock} label="Pending Review" value={stats.pending} to="/submissions?status=pending" hint="Awaiting review" loading={loading} delay={240} />
        <StatCard icon={IndianRupee} label="Total Earnings" value={formatINR(stats.earnings)} to="/earnings" hint="From approved listings only" loading={loading} valueClass="text-emerald-700" delay={310} />
      </div>

      {/* Content */}
    <div className="grid items-stretch gap-6 xl:grid-cols-3">
  <div className="flex xl:col-span-2">
    <RecentSubmissions
      submissions={data?.submissions || []}
      loading={loading}
      onView={setSelected}
    />
  </div>

  <div className="flex flex-col gap-6">
    <EarningsPanel stats={stats} loading={loading} />
    <div className="flex-1">
      <QuickActions />
    </div>
  </div>
</div>

      {selected && <SubmissionDetails submission={selected} onClose={closeDetails} />}
    </div>
  );
}
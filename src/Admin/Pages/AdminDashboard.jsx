import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getDashboardStats,
  getSubmissionsChart,
  getSubmissionStatus,
  getRecentSubmissions,
  getTopCollectors,
    getRecentActivity,

} from "../../api/admindashboardservice";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Calendar, Camera, CheckCircle2, ChevronDown,
  Clock, Inbox, LogOut, MapPin, Menu, Minus, Search, UserPlus, Users, Wallet, X, XCircle,
} from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { getStoredUser, logout } from "../../api/authservice";
import usePendingSubmissionsCount from "../../hooks/usePendingSubmissionCount";
const DAY = 24 * 60 * 60 * 1000;
const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const sumOf = (arr, key) => arr.reduce((total, item) => total + (Number(item?.[key]) || 0), 0);
const changeOf = (current, previous) => previous ? ((current - previous) / previous) * 100 : 0;
const unwrap = (response) => response?.data ?? response ?? {};
const asArray = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
};
const safeNumber = (value) => Number(value) || 0;
const getSubmissionStatusValue = (submission) => String(submission?.status || "pending").toLowerCase();
const getCollectorName = (submission) => submission?.user?.username || submission?.collector?.username || submission?.collector?.name || submission?.username || "Unknown collector";
const getBusinessName = (submission) => submission?.businessName || submission?.business?.name || submission?.name || "Unnamed business";
const getLocationParts = (submission) => {
  const loc = submission?.location || submission?.place || {};
  const area = submission?.placeName || loc?.placeName || loc?.area || loc?.address || submission?.area || "Location unavailable";
  const region = loc?.city || loc?.district || submission?.city || submission?.district || "";
  return { area, region };
};
const normalizeRecentSubmission = (submission) => {
  const { area, region } = getLocationParts(submission);
  const flags = submission?.duplicateFlags || submission?.duplicates || [];
  const flag = Array.isArray(flags) ? flags[0] : flags;
  const exact = flag?.type === "exact" || flag?.matchType === "exact" || flag?.sha256Match;
  const match = flag?.matchedSubmission || flag?.match || {};
  const submittedAt = submission?.createdAt || submission?.submittedAt || submission?.date || Date.now();
  return {
    id: String(submission?._id || submission?.id || "—"),
    business: getBusinessName(submission),
    collector: getCollectorName(submission),
    area,
    region,
    at: new Date(submittedAt).getTime(),
    status: getSubmissionStatusValue(submission),
    photos: Array.isArray(submission?.photos) ? submission.photos.length : safeNumber(submission?.photoCount),
    dup: flag ? { type: exact ? "exact" : "near", matchId: match?._id || match?.id || "an earlier submission", similarity: safeNumber(flag?.similarity || flag?.similarityPercent), distanceM: safeNumber(flag?.distanceM || flag?.distance) } : null,
    reason: submission?.rejectionReason || submission?.reason || "",
  };
};
const normalizeChart = (response) => asArray(response).map((item) => {
  const date = new Date(item?._id || item?.date || item?.day);
  return {
    date,
    label: Number.isNaN(date.getTime()) ? String(item?._id || item?.date || "") : `${WEEKDAY.format(date)} ${date.getDate()}`,
    total: safeNumber(item?.total),
    approved: safeNumber(item?.approved),
    pending: safeNumber(item?.pending),
    rejected: safeNumber(item?.rejected),
  };
});
const normalizeCollectors = (response) => asArray(response).map((collector) => {
  const approved = safeNumber(collector?.approved);
  const total = safeNumber(collector?.totalSubmissions);
  return {
    name: collector?.username || collector?.name || "Unknown collector",
    region: collector?.region || collector?.city || "—",
    approved,
    rate: total ? Math.round((approved / total) * 100) : 0,
    earned: safeNumber(collector?.earned || collector?.totalPaid),
  };
});

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(n);
const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n || 0);
  const fmtDate = (t) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(t);
const fmtDateTime = (t) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(t);
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function timeAgo(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/* ════════════════════════════════════════════════════════════
   STYLE TOKENS
   ════════════════════════════════════════════════════════════ */
const C = { approved: "#10b981", pending: "#f59e0b", rejected: "#ef4444", total: "#4f46e5", grid: "#e4e4e7", axis: "#a1a1aa" };
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const cardCls = "rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
const th = "px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500";

const TONES = {
  indigo: { icon: "bg-indigo-50 text-indigo-600 ring-indigo-100", color: "#4f46e5" },
  zinc: { icon: "bg-zinc-100 text-zinc-600 ring-zinc-200", color: "#71717a" },
  amber: { icon: "bg-amber-50 text-amber-600 ring-amber-100", color: "#f59e0b" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", color: "#10b981" },
  red: { icon: "bg-red-50 text-red-600 ring-red-100", color: "#ef4444" },
};

const STATUS = {
  pending: { label: "Pending", Icon: Clock, cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  approved: { label: "Approved", Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Rejected", Icon: XCircle, cls: "bg-red-50 text-red-700 ring-red-600/20" },
};

const ACTIVITY_META = {
  submitted: { Icon: Inbox, cls: "bg-indigo-50 text-indigo-600 ring-indigo-100" },
  approved: { Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600 ring-emerald-100" },
  rejected: { Icon: XCircle, cls: "bg-red-50 text-red-600 ring-red-100" },
  collector: { Icon: UserPlus, cls: "bg-sky-50 text-sky-600 ring-sky-100" },
  payout: { Icon: Wallet, cls: "bg-amber-50 text-amber-600 ring-amber-100" },
};

const AVATAR_TONES = [
  "bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-700", "bg-rose-100 text-rose-700", "bg-violet-100 text-violet-700",
];

const MOTION_CSS = `
@keyframes adm-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes adm-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes adm-fade { from { opacity: 0; } to { opacity: 1; } }
.adm-rise { animation: adm-rise 520ms cubic-bezier(.22,1,.36,1) both; animation-delay: var(--d, 0ms); }
.adm-pop { animation: adm-pop 200ms cubic-bezier(.22,1,.36,1) both; }
.adm-fade { animation: adm-fade 180ms ease both; }
@media (prefers-reduced-motion: reduce) { .adm-rise, .adm-pop, .adm-fade { animation: none; } }
`;

/* ════════════════════════════════════════════════════════════
   SMALL REUSABLE PIECES
   ════════════════════════════════════════════════════════════ */
function Card({ className = "", style, children }) {
  return <div style={style} className={`${cardCls} ${className}`}>{children}</div>;
}

function Avatar({ name, size = "h-8 w-8 text-xs" }) {
  const tone = AVATAR_TONES[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${size} ${tone}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function StatusPill({ status }) {
  const { label, Icon, cls } = STATUS[status] || STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function DuplicateBadge({ dup }) {
  if (!dup) return <span className="text-xs text-zinc-400">None</span>;
  const exact = dup.type === "exact";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
        exact ? "bg-red-50 text-red-700 ring-red-600/20" : "bg-amber-50 text-amber-800 ring-amber-600/20"
      }`}
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      {exact ? "Exact duplicate" : "Possible duplicate"}
    </span>
  );
}

// Counts up from 0 on mount; skipped for reduced-motion users
function AnimatedNumber({ value, format = fmtNum, duration = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setN(value);
      return;
    }
    let raf;
    const t0 = performance.now();
   const tick = (t) => {
  const p = Math.min(1, (t - t0) / duration);

  setN(value * (1 - Math.pow(1 - p, 3)));

  if (p < 1) {
    raf = requestAnimationFrame(tick);
  }
};
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(n)}</>;
}

function Sparkline({ data = [], color = "#6366f1" }) {
  const gid = useId().replace(/:/g, "");
  const w = 96;
  const h = 34;
  const pad = 2;

  // Prevent crash when data is undefined or empty
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-9 w-24 shrink-0"
        aria-hidden="true"
      />
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => [
    data.length === 1
      ? w / 2
      : pad + (i / (data.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / range) * (h - pad * 2),
  ]);

  const line = pts
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  const area =
    data.length > 1
      ? `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-9 w-24 shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {area && <path d={area} fill={`url(#${gid})`} />}

      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function StatCard({ stat, delay }) {
  const tone = TONES[stat.tone];
  const v = stat.trend.value;
  const flat = Math.abs(v) < 0.05;
  const good = (v >= 0) === (stat.trend.good === "up");
  const chip = flat
    ? "bg-zinc-100 text-zinc-600"
    : good
    ? "bg-emerald-50 text-emerald-700"
    : "bg-red-50 text-red-700";
  const TrendIcon = flat ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div style={{ "--d": `${delay}ms` }} className={`adm-rise group ${cardCls} p-5 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition group-hover:scale-105 ${tone.icon}`}>
          <stat.Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">
          <AnimatedNumber value={stat.value} format={stat.format} />
        </p>
        <Sparkline data={stat.spark} color={tone.color} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums ${chip}`}>
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          {flat ? "0%" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
          <span className="sr-only"> versus the previous 7 days</span>
        </span>
        <span className="truncate text-zinc-500">{stat.hint}</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-zinc-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-zinc-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium tabular-nums text-zinc-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function ActivityTimeline({ items }) {
  return (
    <ol>
      {items.map((a, i) => {
        const { Icon, cls } = ACTIVITY_META[a.type];
        return (
          <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && <span className="absolute left-4 top-9 h-[calc(100%-1.5rem)] w-px -translate-x-1/2 bg-zinc-200" aria-hidden="true" />}
            <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${cls}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900">{a.title}</p>
                <time className="shrink-0 text-xs text-zinc-400">{timeAgo(a.at)}</time>
              </div>
              <p className="truncate text-xs text-zinc-500">{a.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ════════════════════════════════════════════════════════════
   DETAILS MODAL (read-only: review actions belong to the future Submissions page)
   ════════════════════════════════════════════════════════════ */
function SubmissionModal({ submission: s, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key !== "Tab") return;
      const f = dialogRef.current?.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!f || !f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, []);

  const rows = [
    ["Submission ID", s.id],
    ["Collector", s.collector],
    ["Location", `${s.area}, ${s.region}`],
    ["Submitted", fmtDateTime(s.at)],
    ["Photos", `${s.photos} uploaded`],
  ];

  return (
    <div className="adm-fade fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="adm-pop flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-zinc-900">{s.business}</h2>
            <div className="mt-1.5"><StatusPill status={s.status} /></div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className={`rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 ${focusRing}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {s.dup && (
            <div
              role="alert"
              className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${
                s.dup.type === "exact" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">{s.dup.type === "exact" ? "Exact duplicate" : "Possible duplicate"}</p>
                <p className="mt-0.5">
                  {s.dup.type === "exact"
                    ? `A photo matches ${s.dup.matchId} exactly.`
                    : `Photos look about ${s.dup.similarity}% similar to ${s.dup.matchId}, about ${s.dup.distanceM} m away.`}{" "}
                  Sample warning for the UI preview only.
                </p>
              </div>
            </div>
          )}

          <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-right font-medium text-zinc-900">{v}</dd>
              </div>
            ))}
          </dl>

          {s.status === "rejected" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-900">
              <p className="font-medium">Rejection reason</p>
              <p className="mt-0.5">{s.reason || "No reason recorded."}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/70 px-6 py-3.5">
          <p className="text-xs text-zinc-500">Review actions arrive with the Submissions page.</p>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex min-h-9 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 ${focusRing}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   TOPBAR: search, notifications, profile
   ════════════════════════════════════════════════════════════ */
function Topbar({ onMenu, query, onQuery, onSubmitSearch, searchRef, user, unread, onSeen, onLogout }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!notifOpen && !profileOpen) return;
    const onDown = (e) => {
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false);
      if (!profileRef.current?.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notifOpen, profileOpen]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="admin-sidebar"
        className={`-ml-2 rounded-lg p-2.5 text-zinc-600 transition hover:bg-zinc-100 lg:hidden ${focusRing}`}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Search */}
      <div className="relative min-w-0 max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
        <label htmlFor="admin-search" className="sr-only">Search submissions or collectors</label>
        <input
          id="admin-search"
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitSearch();
            if (e.key === "Escape") onQuery("");
          }}
          placeholder="Search submissions or collectors…"
          autoComplete="off"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus-visible:border-indigo-600 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-600/20"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              onQuery("");
              searchRef.current?.focus();
            }}
            aria-label="Clear search"
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:text-zinc-700 ${focusRing}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 text-[11px] font-medium text-zinc-400 sm:block">/</kbd>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              setNotifOpen((o) => !o);
              onSeen();
            }}
            aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}
            aria-expanded={notifOpen}
            className={`relative rounded-lg p-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 ${focusRing}`}
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />}
          </button>
          {notifOpen && (
            <div className="adm-pop absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white shadow-xl">
              <p className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900">Notifications</p>
              <div className="max-h-80 overflow-y-auto p-4">
                <p className="text-sm text-zinc-500">Activity notifications are not provided by the dashboard APIs yet.</p>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen(false);
              setProfileOpen((o) => !o);
            }}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-label="Account menu"
            className={`flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-zinc-100 ${focusRing}`}
          >
            <Avatar name={user.name} />
            <ChevronDown className="hidden h-4 w-4 text-zinc-400 md:block" aria-hidden="true" />
          </button>
          {profileOpen && (
            <div role="menu" className="adm-pop absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl">
              <div className="border-b border-zinc-100 px-3 py-2.5">
                <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
                <p className="text-xs text-zinc-500">{user.role}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-700 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════ */
const SERIES_META = [
  { key: "total", label: "Total", color: C.total },
  { key: "approved", label: "Approved", color: C.approved },
  { key: "pending", label: "Pending", color: C.pending },
  { key: "rejected", label: "Rejected", color: C.rejected },
];
const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];
const COMING_SOON = { submissions: "Submissions", collectors: "Collectors", payouts: "Payouts", reports: "Reports", settings: "Settings" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const stored = getStoredUser();
  const displayName = stored?.username ? stored.username.charAt(0).toUpperCase() + stored.username.slice(1) : "Admin";
  const user = useMemo(() => ({ name: displayName, role: "Administrator" }), [displayName]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [unread, setUnread] = useState(3);
  const [visible, setVisible] = useState({ total: false, approved: true, pending: true, rejected: true });
  const [hoverSlice, setHoverSlice] = useState(null);
  const searchRef = useRef(null);
  const [dashboardStats, setDashboardStats] = useState(null);
const [chartData, setChartData] = useState([]);
const [recentActivity, setRecentActivity] = useState([]);
const [submissionStatus, setSubmissionStatus] = useState(null);
const [recentSubmissions, setRecentSubmissions] = useState([]);
const [topCollectors, setTopCollectors] = useState([]);
const [loading, setLoading] = useState(true);
const { pendingCount } = usePendingSubmissionsCount();
  const handleLogout = () => {
    logout();
    toast.success("Signed out.");
    navigate("/login", { replace: true });
  };

const handleNavigate = (id) => {
  setMobileOpen(false);

  const routes = {
    dashboard: "/admin/dashboard",
    submissions: "/admin/submissions",
    collectors: "/admin/collectors",
    payouts: "/admin/payouts",
    reports: "/admin/reports",
    settings: "/admin/settings",
  };

  const route = routes[id];

  if (route) {
    navigate(route);
  }
};

useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        stats,
        chart,
        status,
        recent,
        collectors,
        activity,
      ] = await Promise.all([
        getDashboardStats(),
        getSubmissionsChart(),
        getSubmissionStatus(),
        getRecentSubmissions(),
        getTopCollectors(),
        getRecentActivity(10),
      ]);

      setDashboardStats(stats);
      setChartData(chart);
      setSubmissionStatus(status);
      setRecentSubmissions(recent);
      setTopCollectors(collectors);
      setRecentActivity(activity);

    } catch (error) {
      console.error("Dashboard API error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  fetchDashboardData();
}, []);
  const statsData = unwrap(dashboardStats);
  const stats = statsData?.data || statsData || {};
  const collectorStats = stats?.collectors || {};
  const submissionStats = stats?.submissions || {};
  const payoutStats = stats?.payouts || {};
  const chart = useMemo(() => normalizeChart(chartData), [chartData]);
  const recent = useMemo(() => asArray(recentSubmissions).map(normalizeRecentSubmission), [recentSubmissions]);
  const collectors = useMemo(() => normalizeCollectors(topCollectors), [topCollectors]);
  const totalSubmissions = safeNumber(submissionStats?.total);
  const totalApproved = safeNumber(submissionStats?.approved);
  const totalPending = safeNumber(submissionStats?.pending);
  const totalRejected = safeNumber(submissionStats?.rejected);
  const totalCollectors = safeNumber(collectorStats?.total);
  const activeCollectors = safeNumber(collectorStats?.active);
  const totalPaid = safeNumber(payoutStats?.totalPaid);
  const pendingPayoutAmount = safeNumber(payoutStats?.pendingAmount);
  const chartCurrent = sumOf(chart, "total");
  const chartApproved = sumOf(chart, "approved");
  const chartPending = sumOf(chart, "pending");
  const chartRejected = sumOf(chart, "rejected");
  const flaggedPending = recent.filter((item) => item.status === "pending" && item.dup).length;
  const statsCards = [
    { id: "collectors", label: "Total Collectors", value: totalCollectors, Icon: Users, tone: "indigo", trend: { value: 0, good: "up" }, hint: `${activeCollectors} active`, spark: chart.map((d) => d.total) },
    { id: "submissions", label: "Total Submissions", value: totalSubmissions, Icon: Inbox, tone: "zinc", trend: { value: 0, good: "up" }, hint: `${chartCurrent} in chart period`, spark: chart.map((d) => d.total) },
    { id: "pending", label: "Pending Reviews", value: totalPending, Icon: Clock, tone: "amber", trend: { value: 0, good: "down" }, hint: `${flaggedPending} flagged in recent submissions`, spark: chart.map((d) => d.pending) },
    { id: "approved", label: "Approved Submissions", value: totalApproved, Icon: CheckCircle2, tone: "emerald", trend: { value: 0, good: "up" }, hint: `${totalApproved + totalRejected ? Math.round(totalApproved / (totalApproved + totalRejected) * 100) : 0}% approval rate`, spark: chart.map((d) => d.approved) },
    { id: "rejected", label: "Rejected Submissions", value: totalRejected, Icon: XCircle, tone: "red", trend: { value: 0, good: "down" }, hint: "Of reviewed listings", spark: chart.map((d) => d.rejected) },
    { id: "payouts", label: "Total Payouts", value: totalPaid, format: fmtINR, Icon: Wallet, tone: "emerald", trend: { value: 0, good: "up" }, hint: `${fmtINR(pendingPayoutAmount)} pending`, spark: chart.map((d) => d.total) },
  ];
  const donut = [
    { name: "Approved", value: totalApproved, color: C.approved },
    { name: "Pending", value: totalPending, color: C.pending },
    { name: "Rejected", value: totalRejected, color: C.rejected },
  ];
  const weekTotal = chartCurrent;
  const weekChange = 0;
  const maxApproved = Math.max(1, ...collectors.map((c) => c.approved));
  const todayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  // Drawer: Escape closes, body scroll locks
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // "/" focuses the search box (unless you're already typing somewhere)
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const scrollToTable = () =>
    document.getElementById("recent-submissions")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  // Search + status filter drive the recent submissions table
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recent.filter(
      (r) =>
        (statusFilter === "all" || r.status === statusFilter) &&
        (!q || [r.business, r.collector, r.id, r.area, r.region].some((v) => v.toLowerCase().includes(q)))
    );
  }, [query, statusFilter, recent]);

  const filterCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = recent.filter((r) => !q || [r.business, r.collector, r.id, r.area, r.region].some((v) => v.toLowerCase().includes(q)));
    return {
      all: base.length,
      pending: base.filter((r) => r.status === "pending").length,
      approved: base.filter((r) => r.status === "approved").length,
      rejected: base.filter((r) => r.status === "rejected").length,
    };
  }, [query, recent]);


  
const activities = useMemo(() => {
  return asArray(recentActivity).map((activity) => {
    const status = String(activity?.status || "").toLowerCase();

    let type = activity?.type;

    if (type === "submission") {
      type =
        status === "approved"
          ? "approved"
          : status === "rejected"
          ? "rejected"
          : "submitted";
    }

    return {
      id: String(activity?._id || activity?.id),
      type: ACTIVITY_META[type] ? type : "submitted",
      title: activity?.title || "Platform Activity",
      detail: activity?.description || "",
      at: new Date(activity?.createdAt || activity?.at).getTime(),
    };
  }).filter((activity) => Number.isFinite(activity.at));
}, [recentActivity]);

  const toggleSeries = (key) =>
    setVisible((v) => {
      const next = { ...v, [key]: !v[key] };
      return Object.values(next).some(Boolean) ? next : v; // always keep one line on
    });

  const activeSlice = hoverSlice === null ? null : donut[hoverSlice];
  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 antialiased">
      <style>{MOTION_CSS}</style>

      <AdminSidebar
        active="dashboard"
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
        onLogout={handleLogout}
        badges={{ submissions: pendingCount }}
      />

      <div className="lg:pl-64">
        <Topbar
          onMenu={() => setMobileOpen(true)}
          query={query}
          onQuery={setQuery}
          onSubmitSearch={scrollToTable}
          searchRef={searchRef}
          user={user}
          unread={unread}
          onSeen={() => setUnread(0)}
          onLogout={handleLogout}
        />

        <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {loading && <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">Loading dashboard data…</div>}
          {/* Page header */}
          <div className="adm-rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
                {getGreeting()}, {displayName}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Here's what's happening across your collectors and submissions today.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-600 shadow-sm">
                <Calendar className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                {todayLabel}
              </span>
              <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                Live data
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
            {statsCards.map((s, i) => <StatCard key={s.id} stat={s} delay={60 + i * 55} />)}
          </div>

          {/* Analytics */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="adm-rise p-5 xl:col-span-2" style={{ "--d": "380ms" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Submissions Overview</h2>
                  <p className="text-xs text-zinc-500">Last 7 days</p>
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">{weekTotal}</span>
                    <span className="text-xs text-zinc-500">submissions in this week</span>
                    <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums ${weekChange >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {weekChange >= 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> : <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
                      {weekChange >= 0 ? "+" : ""}{weekChange.toFixed(1)}%
                    </span>
                  </p>
                </div>
                <div role="group" aria-label="Chart series" className="flex flex-wrap gap-1.5">
                  {SERIES_META.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={visible[m.key]}
                      onClick={() => toggleSeries(m.key)}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${focusRing} ${
                        visible[m.key] ? "border-zinc-300 bg-white text-zinc-900 shadow-sm" : "border-transparent bg-zinc-100 text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full transition-opacity" style={{ background: m.color, opacity: visible[m.key] ? 1 : 0.35 }} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: C.axis }} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 12, fill: C.axis }} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c7d2fe", strokeWidth: 1 }} />
                    {SERIES_META.filter((m) => visible[m.key]).map((m) => (
                      <Line
                        key={m.key}
                        type="monotone"
                        dataKey={m.key}
                        name={m.label}
                        stroke={m.color}
                        strokeWidth={2.25}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="adm-rise p-5" style={{ "--d": "440ms" }}>
              <h2 className="text-sm font-semibold text-zinc-900">Submission Status</h2>
              <p className="text-xs text-zinc-500">All submissions · hover to inspect</p>
              <div className="relative mt-2 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={86}
                      paddingAngle={3}
                      stroke="none"
                      onMouseEnter={(_, i) => setHoverSlice(i)}
                      onMouseLeave={() => setHoverSlice(null)}
                    >
                      {donut.map((d, i) => (
                        <Cell
                          key={d.name}
                          fill={d.color}
                          fillOpacity={hoverSlice === null || hoverSlice === i ? 1 : 0.3}
                          style={{ transition: "fill-opacity 150ms", outline: "none" }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
                    {fmtNum(activeSlice ? activeSlice.value : totalSubmissions)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {activeSlice ? `${activeSlice.name} · ${Math.round((activeSlice.value / totalSubmissions) * 100)}%` : "total"}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1">
                {donut.map((d, i) => (
                  <li
                    key={d.name}
                    onMouseEnter={() => setHoverSlice(i)}
                    onMouseLeave={() => setHoverSlice(null)}
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition ${hoverSlice === i ? "bg-zinc-100" : ""}`}
                  >
                    <span className="inline-flex items-center gap-2 text-zinc-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium tabular-nums text-zinc-900">
                      {fmtNum(d.value)} <span className="text-xs font-normal text-zinc-400">({Math.round((d.value / totalSubmissions) * 100)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {/* Recent submissions */}
            <Card id="recent-submissions" className="adm-rise scroll-mt-24 overflow-hidden xl:col-span-2" style={{ "--d": "500ms" }}>
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Recent Submissions</h2>
                  <p className="text-xs text-zinc-500" aria-live="polite">
                    {query.trim() ? `${filtered.length} ${filtered.length === 1 ? "result" : "results"} for “${query.trim()}”` : "Latest listings from your collectors"}
                  </p>
                </div>
                <div role="group" aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1">
                  {STATUS_FILTERS.map((f) => {
                    const on = statusFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setStatusFilter(f.id)}
                        className={`inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition ${focusRing} ${
                          on ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        {f.label}
                        <span className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${on ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-600"}`}>
                          {filterCounts[f.id]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center border-t border-zinc-100 px-6 py-14 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
                    <Search className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-zinc-900">No matching submissions</h3>
                  <p className="mt-1 max-w-sm text-sm text-zinc-500">Try a different search or status filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("all");
                    }}
                    className={`mt-4 inline-flex min-h-9 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 ${focusRing}`}
                  >
                    Clear search and filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Table */}
                  <div className="hidden overflow-x-auto border-t border-zinc-200 md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50/70">
                        <tr>
                          <th scope="col" className={th}>Business Name</th>
                          <th scope="col" className={th}>Collector</th>
                          <th scope="col" className={th}>Date</th>
                          <th scope="col" className={th}>Status</th>
                          <th scope="col" className={th}>Duplicate Warning</th>
                          <th scope="col" className={`${th} text-right`}><span className="sr-only">Action</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filtered.map((r) => (
                          <tr key={r.id} className="transition hover:bg-zinc-50/70">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">
                                  {initials(r.business)}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-zinc-900">{r.business}</p>
                                  <p className="text-xs text-zinc-500">{r.id} · {r.area}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="flex items-center gap-2 text-zinc-700">
                                <Avatar name={r.collector} size="h-6 w-6 text-[10px]" />
                                {r.collector}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <p className="text-zinc-700">{fmtDate(r.at)}</p>
                              <p className="text-xs text-zinc-500">{timeAgo(r.at)}</p>
                            </td>
                            <td className="px-5 py-3.5"><StatusPill status={r.status} /></td>
                            <td className="px-5 py-3.5"><DuplicateBadge dup={r.dup} /></td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelected(r)}
                                className={`rounded-md px-2 py-1 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 ${focusRing}`}
                              >
                                View details<span className="sr-only"> for {r.business}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile list */}
                  <ul className="divide-y divide-zinc-100 border-t border-zinc-200 md:hidden">
                    {filtered.map((r) => (
                      <li key={r.id} className="space-y-2.5 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900">{r.business}</p>
                            <p className="text-xs text-zinc-500">{r.id} · {r.collector}</p>
                          </div>
                          <StatusPill status={r.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-zinc-500">
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{r.area}, {r.region}</span>
                          <span>{timeAgo(r.at)}</span>
                          {r.dup && <DuplicateBadge dup={r.dup} />}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelected(r)}
                          className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 ${focusRing}`}
                        >
                          View details<span className="sr-only"> for {r.business}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            {/* Right column */}
            <div className="space-y-4">
              <Card className="adm-rise p-5" style={{ "--d": "560ms" }}>
                <h2 className="text-sm font-semibold text-zinc-900">Top Collectors</h2>
                <p className="text-xs text-zinc-500">Ranked by approved listings</p>
                <ol className="mt-4 space-y-1">
                  {collectors.map((c, i) => (
                    <li key={c.name} className="group rounded-lg px-2 py-2.5 transition hover:bg-zinc-50">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums ${
                            i === 0 ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <Avatar name={c.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">{c.name}</p>
                          <p className="text-xs text-zinc-500"> {c.rate}% approval</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums text-zinc-900">{c.approved} submissions</p>
                          <p className="text-xs tabular-nums text-zinc-500">{fmtINR(c.earned)}</p>
                        </div>
                      </div>
                      <div className="ml-[3.75rem] mt-2 h-1 overflow-hidden rounded-full bg-zinc-100">
                        <div className="h-full rounded-full bg-indigo-500 transition-all duration-500 group-hover:bg-indigo-600" style={{ width: `${(c.approved / maxApproved) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>

<Card className="adm-rise p-5" style={{ "--d": "620ms" }}>
  <h2 className="text-sm font-semibold text-zinc-900">
    Recent Activity
  </h2>

  <p className="mb-4 text-xs text-zinc-500">
    Across the platform
  </p>

  {activities.length > 0 ? (
    <ActivityTimeline items={activities} />
  ) : (
    <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center">
      <Inbox className="mx-auto h-8 w-8 text-zinc-400" />

      <p className="mt-2 text-sm font-medium text-zinc-700">
        No activity available
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        Platform activities will appear here.
      </p>
    </div>
  )}
</Card>
            </div>
          </div>
        </main>
      </div>

      {selected && <SubmissionModal submission={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
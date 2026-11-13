import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock, ExternalLink,
  ImageOff, Info, MapPin, MapPinOff, Search, X, XCircle,
} from "lucide-react";
import api from "../api/api";

// ─── Data source ─────────────────────────────────────────────
// No submissions endpoint exists yet. When the backend has one that returns
// ONLY the logged-in user's submissions, set it here (e.g. "/api/...").
// Until then the page shows a "backend not connected" state, never fake data.
const SUBMISSIONS_ENDPOINT = "/api/submissions/my";
const STATUS = {
  pending: { label: "Pending", Icon: Clock, cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  approved: { label: "Approved", Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Rejected", Icon: XCircle, cls: "bg-red-50 text-red-700 ring-red-600/20" },
};
const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// ─── Helpers (kept in this file) ─────────────────────────────
const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "");

function resolvePhotoUrl(p) {
  const raw = typeof p === "string" ? p : pick(p?.url, p?.path, p?.src, p?.location);
  if (typeof raw !== "string") return null;
  const clean = raw.replace(/\\/g, "/");
  if (/^(https?:|data:|blob:)/i.test(clean)) return clean;
  const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
  return `${base}/${clean.replace(/^\/+/, "")}`;
}

function readCoords(raw) {
  const loc = raw.location && typeof raw.location === "object" ? raw.location : raw.gps || {};
  let lat = pick(raw.latitude, loc.latitude, loc.lat);
  let lng = pick(raw.longitude, loc.longitude, loc.lng, loc.lon);
  // GeoJSON points store [longitude, latitude]
  if ((lat === undefined || lng === undefined) && Array.isArray(loc.coordinates)) {
    [lng, lat] = loc.coordinates;
  }
  const latitude = Number(lat);
  const longitude = Number(lng);
  const valid =
    lat !== undefined && lng !== undefined &&
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
  if (!valid) return null;
  const acc = pick(raw.accuracy, loc.accuracy);
  const accuracy = acc !== undefined && Number.isFinite(Number(acc)) ? Number(acc) : null;
  return { latitude, longitude, accuracy };
}

function normalize(raw, index) {
  const mongoId = pick(raw._id, raw.id);
  const publicId = pick(raw.submissionId, raw.submission_id, raw.referenceId);
  const photoList = Array.isArray(raw.photos) ? raw.photos : Array.isArray(raw.images) ? raw.images : [];
  const photos = photoList.map(resolvePhotoUrl).filter(Boolean);
  const count = Number.isFinite(Number(raw.photoCount)) ? Number(raw.photoCount) : photoList.length;
  const dateRaw = pick(raw.createdAt, raw.submittedAt, raw.created_at);
  const date = dateRaw ? new Date(dateRaw) : null;
  const remarks = typeof raw.remarks === "string" ? raw.remarks.trim() : "";
const feedback = pick(
  raw.reviewFeedback,
  raw.adminFeedback,
  raw.rejectionReason,
  raw.feedback,
  raw.reviewNote
);  return {
    key: String(pick(mongoId, publicId, `row-${index}`)),
    mongoId: mongoId ? String(mongoId) : null,
    searchIds: [publicId, mongoId].filter(Boolean).map(String),
    label: publicId ? String(publicId) : mongoId ? `…${String(mongoId).slice(-6)}` : null,
    photos,
    photoCount: count,
    coords: readCoords(raw),
    status: typeof raw.status === "string" ? raw.status.toLowerCase() : "unknown",
    remarks,
    date: date && !Number.isNaN(date.getTime()) ? date : null,
    feedback: typeof feedback === "string" ? feedback : "",
   businessName: raw.businessName || "",
mobileNumber: raw.mobileNumber || "",
placeName: raw.placeName || "",
  };
}

const formatDateTime = (d) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(d);

const statusInfo = (s) =>
  STATUS[s] || { label: s === "unknown" ? "Unknown" : s.charAt(0).toUpperCase() + s.slice(1), Icon: Info, cls: "bg-slate-100 text-slate-700 ring-slate-500/20" };

// ─── Styling ─────────────────────────────────────────────────
const badgeCls = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const modalTitle = "mb-2.5 font-serif text-base font-semibold text-slate-900";
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20";

// Staggered entrance + modal pop; disabled for users who prefer reduced motion.
const MOTION_CSS = `
@keyframes nme-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes nme-pop { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.nme-rise { animation: nme-rise 560ms cubic-bezier(.22,1,.36,1) both; animation-delay: var(--d, 0ms); }
.nme-pop { animation: nme-pop 220ms cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) { .nme-rise, .nme-pop { animation: none; } }
`;

export default function Submissions() {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({
    status: SUBMISSIONS_ENDPOINT ? "loading" : "not-connected",
    items: [],
    error: "",
  });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedKey, setSelectedKey] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [failedImgs, setFailedImgs] = useState(() => new Set());
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState("");
  const [remarksSaving, setRemarksSaving] = useState(false);
  const [remarksError, setRemarksError] = useState("");
  const [remarksSuccess, setRemarksSuccess] = useState("");

  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const triggerRef = useRef(null);
  const photoCountRef = useRef(0);

  // ── Load ──
  const load = useCallback(async (signal) => {
    if (!SUBMISSIONS_ENDPOINT) return;
    setState((s) => ({ ...s, status: "loading", error: "" }));
    try {
      const { data } = await api.get(SUBMISSIONS_ENDPOINT, { signal });
      const list = Array.isArray(data) ? data : data?.submissions ?? data?.data ?? data?.items;
      if (!Array.isArray(list)) throw new Error("bad-shape");
      setState({ status: "ready", items: list.map(normalize), error: "" });
    } catch (err) {
      if (err.code === "ERR_CANCELED") return;
      setState({
        status: "error",
        items: [],
        error:
          err.message === "bad-shape"
            ? "The server returned data in an unexpected format."
            : err.response
            ? err.response.data?.message || "The server couldn't load your submissions."
            : "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // ── Filters / search / sort ──
  const rawStatus = params.get("status");
  const statusFilter = FILTERS.some((f) => f.value === rawStatus) ? rawStatus : "all";
  const setStatusFilter = (v) => setParams(v === "all" ? {} : { status: v });

  const counts = useMemo(() => {
    const c = { all: state.items.length, pending: 0, approved: 0, rejected: 0 };
    state.items.forEach((s) => {
      if (s.status in c) c[s.status] += 1;
    });
    return c;
  }, [state.items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ts = (s) => (s.date ? s.date.getTime() : null);
    return state.items
      .filter(
        (s) =>
          (statusFilter === "all" || s.status === statusFilter) &&
          (!q ||
            [...s.searchIds, s.businessName, s.placeName]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(q)))
      )
      .sort((a, b) => {
        const ta = ts(a);
        const tb = ts(b);
        if (ta === null && tb === null) return 0;
        if (ta === null) return 1; // undated submissions go last
        if (tb === null) return -1;
        return sort === "newest" ? tb - ta : ta - tb;
      });
  }, [state.items, statusFilter, query, sort]);

  // ── Details modal ──
  const selected = state.items.find((s) => s.key === selectedKey) || null;
  const activeKey = selected ? selected.key : null;
  photoCountRef.current = selected ? selected.photos.length : 0;

  const openDetails = (e, key) => {
    triggerRef.current = e.currentTarget;
    setPhotoIndex(0);
    const item = state.items.find((submission) => submission.key === key);
    setRemarksDraft(item?.remarks || "");
    setEditingRemarks(false);
    setRemarksError("");
    setRemarksSuccess("");
    setSelectedKey(key);
  };
  const closeDetails = useCallback(() => {
    setSelectedKey(null);
    setEditingRemarks(false);
    setRemarksError("");
    setRemarksSuccess("");
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!activeKey) return;
    closeBtnRef.current?.focus();
    const onKey = (e) => {
      const n = photoCountRef.current;
      if (e.key === "Escape") closeDetails();
      else if (e.key === "ArrowRight" && n > 1) setPhotoIndex((i) => (i + 1) % n);
      else if (e.key === "ArrowLeft" && n > 1) setPhotoIndex((i) => (i - 1 + n) % n);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeKey, closeDetails]);

  const trapTab = (e) => {
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

  const saveRemarks = async () => {
    if (!selected?.mongoId) {
      setRemarksError("Unable to update remarks: submission ID is unavailable.");
      return;
    }
    const remarks = remarksDraft.trim();
    if (remarks.length > 500) {
      setRemarksError("Remarks must be 500 characters or fewer.");
      return;
    }

    setRemarksSaving(true);
    setRemarksError("");
    setRemarksSuccess("");
    try {
      const { data } = await api.patch(`/api/submissions/${selected.mongoId}/remarks`, { remarks });
      const savedRemarks = typeof data?.remarks === "string" ? data.remarks : remarks;
      setState((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.key === selected.key ? { ...item, remarks: savedRemarks } : item
        ),
      }));
      setRemarksDraft(savedRemarks);
      setEditingRemarks(false);
      setRemarksSuccess("Remarks updated successfully.");
    } catch (err) {
      setRemarksError(err.response?.data?.message || "Couldn't update remarks. Please try again.");
    } finally {
      setRemarksSaving(false);
    }
  };

  const markFailed = (url) => setFailedImgs((prev) => new Set(prev).add(url));

  const modalPhotos = selected?.photos || [];
  const currentIdx = Math.min(photoIndex, Math.max(modalPhotos.length - 1, 0));
  const currentUrl = modalPhotos[currentIdx];
  const sel = selected ? statusInfo(selected.status) : null;
  const showToolbar = state.status === "ready" && state.items.length > 0;

  return (
    <div className="space-y-8">
      <style>{MOTION_CSS}</style>

      {/* Header */}
      <header className="nme-rise relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1 bg-indigo-700" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-50" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Review status</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">My Submissions</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Every listing you've submitted and its review status.
            </p>
          </div>
          {showToolbar && (
            <p className="shrink-0 font-serif text-sm text-slate-500">
              <span className="text-3xl font-semibold tabular-nums text-slate-900">{counts.all}</span>{" "}
              {counts.all === 1 ? "listing" : "listings"}
            </p>
          )}
        </div>
      </header>

      {/* Toolbar */}
      {showToolbar && (
        <div style={{ "--d": "100ms" }} className="nme-rise flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {FILTERS.map((f) => {
              const active = statusFilter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  aria-pressed={active}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-all duration-200 ${focusRing} ${
                    active ? "bg-white text-indigo-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                      active ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {counts[f.value]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <label htmlFor="sub-search" className="sr-only">Search by submission ID, business name, or place</label>
              <input
                id="sub-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ID, business, or place"
                className={`${inputCls} pl-9 pr-3`}
              />
            </div>
            <div>
              <label htmlFor="sub-sort" className="sr-only">Sort submissions</label>
              <select
                id="sub-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={`${inputCls} px-3`}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* States */}
      {state.status === "not-connected" && (
        <section style={{ "--d": "100ms" }} className="nme-rise flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 ring-1 ring-slate-200">
            <Info className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-slate-900">Submissions aren't available yet</h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Backend integration for submissions is pending, so there is nothing to show here yet.
          </p>
        </section>
      )}

      {state.status === "loading" && (
        <div aria-busy="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="aspect-[4/3] animate-pulse bg-slate-100" />
              <div className="space-y-2.5 p-5">
                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === "error" && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{state.error}</span>
          <button type="button" onClick={() => load()} className="font-medium underline">Retry</button>
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <section style={{ "--d": "100ms" }} className="nme-rise flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <Camera className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-slate-900">No submissions yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Add your first listing and it will appear here with its review status.</p>
          <Link to="/add-listing" className={`mt-5 inline-flex min-h-11 items-center rounded-lg bg-indigo-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 ${focusRing}`}>
            Add New Listing
          </Link>
        </section>
      )}

      {showToolbar && visible.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
          No submissions match your filters.
        </p>
      )}

      {/* Cards */}
      {showToolbar && visible.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s, i) => {
            const info = statusInfo(s.status);
            const thumb = s.photos[0];
            const thumbOk = thumb && !failedImgs.has(thumb);
            return (
              <li
                key={s.key}
                style={{ "--d": `${180 + Math.min(i, 8) * 60}ms` }}
                className="nme-rise group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {thumbOk ? (
                    <img
                      src={thumb}
                      alt={`Main photo for listing ${s.label || ""}`.trim()}
                      loading="lazy"
                      onError={() => markFailed(thumb)}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                      <ImageOff className="h-7 w-7" aria-hidden="true" />
                      <span className="text-xs">Photo not available</span>
                    </div>
                  )}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/50 to-transparent" aria-hidden="true" />
                  <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/15 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.photoCount} {s.photoCount === 1 ? "photo" : "photos"}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate font-serif text-base font-semibold text-slate-900">
                      {s.label ? `Listing #${s.label}` : "Listing"}
                    </h3>
                    <span className={`${badgeCls} ${info.cls} shrink-0`}>
                      <info.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {info.label}
                    </span>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex gap-2">
  <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
    Business
  </dt>
  <dd className="font-medium text-slate-800">
    {s.businessName || "Not provided"}
  </dd>
</div>

<div className="flex gap-2">
  <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
    Place
  </dt>
  <dd className="font-medium text-slate-800">
    {s.placeName || "Not available"}
  </dd>
  {s.mobileNumber && (
  <div className="flex gap-2">
    <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      Mobile
    </dt>
    <dd className="font-medium text-slate-800">
      {s.mobileNumber}
    </dd>
  </div>
)}
</div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Location</dt>
                      <dd className="flex items-center gap-1 font-medium text-slate-800">
                        {s.coords ? (
                          <><MapPin className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />GPS captured</>
                        ) : (
                          <><MapPinOff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />GPS not available</>
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Remarks</dt>
                      <dd className={`line-clamp-2 ${s.remarks ? "text-slate-800" : "text-slate-400"}`}>
                        {s.remarks || "No remarks provided"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Submitted</dt>
                      <dd className="text-slate-800">{s.date ? formatDateTime(s.date) : "Date not available"}</dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={(e) => openDetails(e, s.key)}
                    className={`group/btn mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:border-indigo-700 hover:bg-indigo-700 hover:text-white ${focusRing}`}
                  >
                    View Details<span className="sr-only"> for listing {s.label}</span>
                    <ArrowRight className="h-4 w-4 transition group-hover/btn:translate-x-0.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={closeDetails}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sub-details-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapTab}
            className="nme-pop max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex min-w-0 items-center gap-3">
                <h2 id="sub-details-title" className="truncate font-serif text-lg font-semibold text-slate-900">
                  {selected.label ? `Listing #${selected.label}` : "Listing details"}
                </h2>
                <span className={`${badgeCls} ${sel.cls} shrink-0`}>
                  <sel.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {sel.label}
                </span>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeDetails}
                aria-label="Close details"
                className={`rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${focusRing}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-7 p-6">
              {/* Photos */}
              <section aria-labelledby="d-photos">
                <h3 id="d-photos" className={modalTitle}>Photos</h3>
                {modalPhotos.length > 0 ? (
                  <div className="relative overflow-hidden rounded-xl bg-indigo-950 ring-1 ring-slate-200">
                    {!failedImgs.has(currentUrl) ? (
                      <img
                        src={currentUrl}
                        alt={`Photo ${currentIdx + 1} of ${modalPhotos.length}`}
                        onError={() => markFailed(currentUrl)}
                        className="aspect-[4/3] w-full object-contain"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 text-indigo-200">
                        <ImageOff className="h-8 w-8" aria-hidden="true" />
                        <span className="text-sm">This photo couldn't be loaded</span>
                      </div>
                    )}
                    {modalPhotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPhotoIndex((currentIdx - 1 + modalPhotos.length) % modalPhotos.length)}
                          aria-label="Previous photo"
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white shadow-lg backdrop-blur-md transition hover:bg-white/35 focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoIndex((currentIdx + 1) % modalPhotos.length)}
                          aria-label="Next photo"
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white shadow-lg backdrop-blur-md transition hover:bg-white/35 focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </>
                    )}
                    <p aria-live="polite" className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-slate-900/60 px-3 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
                      {currentIdx + 1} of {modalPhotos.length}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Photos aren't available for this submission{selected.photoCount ? ` (${selected.photoCount} recorded)` : ""}.
                  </p>
                )}
              </section>

              {/* Location */}
              <section>
  <h3 className={modalTitle}>Business Details</h3>
  <dl className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
    <div>
      <dt className="text-slate-500">Business Name</dt>
      <dd className="mt-1 font-medium text-slate-900">
        {selected.businessName || "Not provided"}
      </dd>
    </div>
    <div>
      <dt className="text-slate-500">Place Name</dt>
      <dd className="mt-1 font-medium text-slate-900">
        {selected.placeName || "Not available"}
      </dd>
    </div>
    {selected.mobileNumber && (
  <div>
    <dt className="text-slate-500">Mobile Number</dt>
    <dd className="mt-1 font-medium text-slate-900">
      {selected.mobileNumber}
    </dd>
  </div>
)}
  </dl>
</section>
              <section aria-labelledby="d-loc">
                <h3 id="d-loc" className={modalTitle}>Location</h3>
                {selected.coords ? (
                  <div className="relative overflow-hidden rounded-xl bg-indigo-950 p-5 text-white">
                    <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5" aria-hidden="true" />
                    <dl className="relative grid gap-4 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">Latitude</dt>
                        <dd className="mt-1 font-mono text-base font-medium tabular-nums">{selected.coords.latitude.toFixed(6)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">Longitude</dt>
                        <dd className="mt-1 font-mono text-base font-medium tabular-nums">{selected.coords.longitude.toFixed(6)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">Accuracy</dt>
                        <dd className="mt-1 text-base font-medium tabular-nums">
                          {selected.coords.accuracy !== null ? `${selected.coords.accuracy.toFixed(1)} m` : "Not recorded"}
                        </dd>
                      </div>
                    </dl>
                    <a
                      href={`https://www.google.com/maps?q=${selected.coords.latitude},${selected.coords.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Open in Google Maps
                    </a>
                  </div>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    No valid GPS coordinates are available for this submission.
                  </p>
                )}
              </section>

              {/* Remarks */}
              <section aria-labelledby="d-rem">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h3 id="d-rem" className={`${modalTitle} mb-0`}>Remarks</h3>
                  {!editingRemarks && (
                    <button
                      type="button"
                      onClick={() => { setRemarksDraft(selected.remarks || ""); setRemarksError(""); setRemarksSuccess(""); setEditingRemarks(true); }}
                      className={`rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 ${focusRing}`}
                    >
                      {selected.remarks ? "Edit remarks" : "Add remarks"}
                    </button>
                  )}
                </div>
                {editingRemarks ? (
                  <div className="space-y-3">
                    <textarea
                      value={remarksDraft}
                      onChange={(e) => setRemarksDraft(e.target.value)}
                      maxLength={500}
                      rows={4}
                      placeholder="Add any details about this submission..."
                      className={`${inputCls} resize-y`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">{remarksDraft.length}/500 characters</span>
                      <div className="flex gap-2">
                        <button type="button" disabled={remarksSaving} onClick={() => { setEditingRemarks(false); setRemarksDraft(selected.remarks || ""); setRemarksError(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                        <button type="button" disabled={remarksSaving || remarksDraft.trim() === (selected.remarks || "")} onClick={saveRemarks} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{remarksSaving ? "Saving..." : "Save remarks"}</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={`whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 ${selected.remarks ? "text-slate-800" : "text-slate-400"}`}>
                    {selected.remarks || "No remarks provided"}
                  </p>
                )}
                {remarksError && <p role="alert" className="mt-2 text-sm text-red-600">{remarksError}</p>}
                {remarksSuccess && <p role="status" className="mt-2 text-sm text-emerald-700">{remarksSuccess}</p>}
              </section>

              {/* Submission info */}
              <section aria-labelledby="d-info">
                <h3 id="d-info" className={modalTitle}>Submission information</h3>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-slate-500">Submission ID</dt>
                    <dd className="break-all text-right font-medium text-slate-900">{selected.searchIds[0] || "Not available"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-slate-500">Submitted</dt>
                    <dd className="text-right font-medium text-slate-900">{selected.date ? formatDateTime(selected.date) : "Not available"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <dt className="text-slate-500">Status</dt>
                    <dd>
                      <span className={`${badgeCls} ${sel.cls}`}>
                        <sel.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {sel.label}
                      </span>
                    </dd>
                  </div>
                  {(selected.feedback || selected.status === "rejected") && (
                    <div className="px-4 py-3">
                      <dt className="text-slate-500">Admin feedback</dt>
                      <dd className={`mt-1 leading-6 ${selected.feedback ? "text-slate-900" : "text-slate-400"}`}>
                        {selected.feedback || "No feedback provided"}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Camera,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { createSubmission } from "../api/submissionservice";
import { getSession } from "../api/authservice";
// ─── Config ──────────────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per photo

const MAX_REMARKS = 500;
const GPS_TIMEOUT_MS = 15000;



// ─── Helpers (feature-specific, kept in this file) ───────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const typeOk = file.type ? ALLOWED_TYPES.includes(file.type) : ALLOWED_EXTS.includes(ext);
  if (!typeOk) return "unsupported format. Use JPG, PNG or WebP.";
  if (file.size === 0) return "the file is empty.";
  if (file.size > MAX_FILE_BYTES) return `larger than ${formatBytes(MAX_FILE_BYTES)} (this one is ${formatBytes(file.size)}).`;
  return null;
}

function isValidCoords(c) {
  return (
    !!c &&
    Number.isFinite(c.latitude) && c.latitude >= -90 && c.latitude <= 90 &&
    Number.isFinite(c.longitude) && c.longitude >= -180 && c.longitude <= 180 &&
    Number.isFinite(c.accuracy) && c.accuracy >= 0
  );
}

function gpsErrorMessage(err) {
  switch (err?.code) {
    case 1:
      return "Location permission was denied. Allow location access for this site in your browser settings (usually the icon beside the address bar), make sure location is on for your browser in your device settings, then tap Retry Location.";
    case 2:
      return "Your device couldn't work out its location. Check that location services (GPS) are turned on, move somewhere with a clearer signal, then tap Retry Location.";
    case 3:
      return "Getting your location took too long. Move to an open area with a better signal and tap Retry Location.";
    default:
      return "We couldn't get your location. Tap Retry Location to try again.";
  }
}

// Plain object first, FormData second, so the shape is easy to review.
function toFormData(s) {
  const fd = new FormData();

  s.photos.forEach((file) => fd.append("photos", file));
  fd.append("businessName", s.businessName);
  fd.append("mobileNumber", s.mobileNumber);
  fd.append("latitude", String(s.latitude));
  fd.append("longitude", String(s.longitude));
  fd.append("accuracy", String(s.accuracy));

  if (s.remarks) fd.append("remarks", s.remarks);

  return fd;
}
// ─── Styling ─────────────────────────────────────────────────
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const card = "nme-rise rounded-xl border border-slate-200 bg-white p-6 shadow-sm";
const stepBadge =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-950 font-serif text-sm font-semibold text-white";
const sectionTitle = "font-serif text-lg font-semibold text-slate-900";
const secondaryBtn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

// Staggered entrance; disabled for users who prefer reduced motion.
const MOTION_CSS = `
@keyframes nme-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes nme-tile { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: none; } }
.nme-rise { animation: nme-rise 560ms cubic-bezier(.22,1,.36,1) both; animation-delay: var(--d, 0ms); }
.nme-tile { animation: nme-tile 320ms cubic-bezier(.22,1,.36,1) both; }
@media (prefers-reduced-motion: reduce) { .nme-rise, .nme-tile { animation: none; } }
`;

export default function AddListing() {
  const [photos, setPhotos] = useState([]); // [{ id, file, url }]
  const [photoErrors, setPhotoErrors] = useState([]);
  const [gps, setGps] = useState({ status: "loading", coords: null, error: "" });
  const [remarks, setRemarks] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { type: "info" | "error" | "success", message }

  const addBtnRef = useRef(null);
  const photosRef = useRef([]);
  const nextId = useRef(0);
  const gpsRequest = useRef(0);

  const fileInputRef = useRef(null);
const cameraInputRef = useRef(null);
const user = getSession();
const isCompanyStaff = user?.isCompanyStaff === true;

const MIN_PHOTOS = isCompanyStaff ? 1 : 2;
const MAX_PHOTOS = 3;

const [mobileNumber, setMobileNumber] = useState("");
  // ── Photo preview cleanup on unmount ──
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  // ── GPS ──
  const captureLocation = useCallback(() => {
    const id = ++gpsRequest.current; // ignore results from stale/unmounted requests
    setGps({ status: "loading", coords: null, error: "" });

    if (!("geolocation" in navigator)) {
      setGps({ status: "error", coords: null, error: "This browser doesn't support location access." });
      return;
    }
    if (!window.isSecureContext) {
      setGps({
        status: "error",
        coords: null,
        error: "Location access needs a secure (HTTPS) connection. Open the site over HTTPS and tap Retry Location.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== gpsRequest.current) return;
        const { latitude, longitude, accuracy } = pos.coords;
        const coords = { latitude, longitude, accuracy };
        
        if (isValidCoords(coords)) setGps({ status: "success", coords, error: "" });
        else setGps({ status: "error", coords: null, error: "The device returned an invalid location. Tap Retry Location." });
      },
      (err) => {
        if (id !== gpsRequest.current) return;
        setGps({ status: "error", coords: null, error: gpsErrorMessage(err) });
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    captureLocation();
    return () => {
      gpsRequest.current++;
    };
  }, [captureLocation]);

  // ── Photos ──
  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // lets the same file be picked again later
    if (!picked.length) return;

    const errors = [];
    const accepted = [];
    const room = MAX_PHOTOS - photos.length;

    picked.forEach((file) => {
      const problem = validateFile(file);
      if (problem) errors.push(`${file.name}: ${problem}`);
      else if (accepted.length >= room) errors.push(`${file.name}: not added. Limit is ${MAX_PHOTOS} photos.`);
      else accepted.push({ id: nextId.current++, file, url: URL.createObjectURL(file) });
    });

    setPhotoErrors(errors);
    setResult(null);
    if (accepted.length) setPhotos((prev) => [...prev, ...accepted]); // append, never replace
  };

  const removePhoto = (id) => {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.url);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setResult(null);
    addBtnRef.current?.focus(); // keep keyboard focus somewhere sensible
  };

  // ── Submit ──
const photosReady =
  photos.length >= MIN_PHOTOS &&
  photos.length <= MAX_PHOTOS;

const gpsReady =
  gps.status === "success" && isValidCoords(gps.coords);

const businessNameReady =
  isCompanyStaff || businessName.trim().length > 0;

const mobileNumberReady = isCompanyStaff
  ? !mobileNumber.trim() || /^[6-9]\d{9}$/.test(mobileNumber.trim())
  : /^[6-9]\d{9}$/.test(mobileNumber.trim());

const canSubmit =
  businessNameReady &&
  mobileNumberReady &&
  photosReady &&
  gpsReady &&
  !submitting;

const blockers = [];

if (photos.length < MIN_PHOTOS) {
  blockers.push(`Upload at least ${MIN_PHOTOS} photo(s).`);
}

if (!businessNameReady) {
  blockers.push("Enter the business name.");
}

if (!mobileNumberReady) {
  blockers.push("Enter a valid 10-digit mobile number.");
}

if (gps.status === "loading") {
  blockers.push("Waiting for your location…");
} else if (!gpsReady) {
  blockers.push("Location hasn't been captured. Tap Retry Location.");
}
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setResult(null);

   const submission = {
  businessName: businessName.trim(),
    mobileNumber: mobileNumber.trim(),

  photos: photos.map((p) => p.file),
  latitude: gps.coords.latitude,
  longitude: gps.coords.longitude,
  accuracy: gps.coords.accuracy,
  remarks: remarks.trim(),
};

  

    setSubmitting(true);
    try {
      await createSubmission(toFormData(submission));
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      setPhotoErrors([]);
      setRemarks("");
      setBusinessName("");
      setMobileNumber("");

      setResult({ type: "success", message: "Your listing was submitted." });
      captureLocation(); // fresh location for the next listing
    } catch (err) {
      setResult({
        type: "error",
        message: err.response
          ? err.response.data?.message || "The server couldn't accept this submission. Please try again."
          : "Couldn't reach the server. Your data is still here, so you can try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resultStyles = {
    info: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <div className="space-y-8">
      <style>{MOTION_CSS}</style>

      {/* Header */}
      <header className="nme-rise relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1 bg-indigo-700" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-50" aria-hidden="true" />
        <div className="relative p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">New submission</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Add New Listing</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Add photos, let us capture your location, and submit. Your location is read when this page opens.
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <section className={card}>
  <div className="flex items-start gap-3">
    <span className={stepBadge}>1</span>

    <div className="w-full">
      <h3 className={sectionTitle}>Business Details</h3>

      {/* Business Name */}
      <label
        htmlFor="businessName"
        className="mt-3 block text-sm font-medium text-slate-700"
      >
        Business Name
        {!isCompanyStaff && (
          <span className="text-red-500"> *</span>
        )}
      </label>

      <input
        id="businessName"
        type="text"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        maxLength={120}
        required={!isCompanyStaff}
        placeholder="Enter the business name"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
      />

      {/* Mobile Number */}
      <label
        htmlFor="mobileNumber"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        Mobile Number
        {!isCompanyStaff && (
          <span className="text-red-500"> *</span>
        )}
      </label>

      <input
        id="mobileNumber"
        type="tel"
        value={mobileNumber}
        onChange={(e) => setMobileNumber(e.target.value)}
        maxLength={10}
        required={!isCompanyStaff}
        placeholder="Enter 10-digit mobile number"
        className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
      />

      {isCompanyStaff && (
        <p className="mt-2 text-xs text-slate-500">
          Business name and mobile number are optional for company staff.
        </p>
      )}
    </div>
  </div>
</section>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── A. Photos ── */}
          <section aria-labelledby="photos-title" style={{ "--d": "100ms" }} className={`${card} lg:col-span-2`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={stepBadge} aria-hidden="true">2</span>
                <div>
                  <h3 id="photos-title" className={sectionTitle}>Upload photos</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
Upload at least {MIN_PHOTOS} and up to {MAX_PHOTOS} photos.
JPG, PNG or WebP, up to {formatBytes(MAX_FILE_BYTES)} each.                </p>
                </div>
              </div>
              <p
                aria-live="polite"
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                  photosReady ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-slate-50 text-slate-500 ring-slate-200"
                }`}
              >
                {photos.length} {photos.length === 1 ? "photo" : "photos"} selected
              </p>
            </div>
{isCompanyStaff && (
  <input
    ref={fileInputRef}
    id="photo-input"
    type="file"
    multiple
    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    onChange={handleFiles}
    className="hidden"
    tabIndex={-1}
    aria-hidden="true"
  />
)}
            <input
  ref={cameraInputRef}
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleFiles}
  className="hidden"
/>

           {photos.length === 0 ? (
  <div className="mt-5 flex flex-col gap-3">

    {/* Gallery - company staff only */}
    {isCompanyStaff && (
      <button
        ref={addBtnRef}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`group flex w-full flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-14 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40 ${focusRing}`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200">
          <ImagePlus className="h-6 w-6" />
        </span>

        <span className="mt-4 font-serif text-base font-semibold text-slate-900">
          Choose photos from your device
        </span>

        <span className="mt-1 text-sm text-slate-500">
          You can select several at once.
        </span>
      </button>
    )}

    {/* Camera - both roles */}
    <button
      type="button"
      onClick={() => cameraInputRef.current?.click()}
      disabled={photos.length >= MAX_PHOTOS}
      className={`${secondaryBtn} w-full`}
    >
      <Camera className="h-4 w-4" />
      Take Photo
    </button>

  </div>
) : (
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {photos.map((p) => (
                  <>
                  <li key={p.id} className="nme-tile group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                    <div className="overflow-hidden">
                      <img
                        src={p.url}
                        alt={`Preview of ${p.file.name}`}
                        className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      aria-label={`Remove ${p.file.name}`}
                      className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur-sm transition hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="border-t border-slate-100 px-3 py-2">
                      <p className="truncate text-xs font-medium text-slate-800" title={p.file.name}>{p.file.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(p.file.size)}</p>
                    </div>
                  </li>
                
</>
                ))}
            {/* Take Photo - both roles */}
<li>
  <button
    type="button"
    onClick={() => cameraInputRef.current?.click()}
    disabled={photos.length >= MAX_PHOTOS}
    className={`${secondaryBtn} w-full`}
  >
    <Camera className="h-4 w-4" />
    Take Photo
  </button>
</li>

{/* Add more from gallery - company staff only */}
{isCompanyStaff && (
  <li>
    <button
      ref={addBtnRef}
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={photos.length >= MAX_PHOTOS}
      aria-label="Add more photos"
      className={`flex h-full min-h-[8.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
    >
      <Plus className="h-5 w-5" />
      Add more
    </button>
  </li>
)}
              </ul>
            )}

            {photoErrors.length > 0 && (
              <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Some files weren't added
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                  {photoErrors.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </section>

          <div className="space-y-6">
            {/* ── B. GPS ── */}
            <section aria-labelledby="gps-title" style={{ "--d": "180ms" }} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={stepBadge} aria-hidden="true">2</span>
                  <div>
                    <h3 id="gps-title" className={sectionTitle}>Location</h3>
                    <p className="mt-0.5 text-sm text-slate-500">Captured automatically. Required to submit.</p>
                  </div>
                </div>
              </div>

              <div className="mt-5" aria-live="polite">
                {gps.status === "loading" && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-4 text-sm text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-700" aria-hidden="true" />
                    Getting your location… allow access if your browser asks.
                  </div>
                )}

                {gps.status === "success" && (
                  <div className="relative overflow-hidden rounded-xl bg-indigo-950 p-4 text-white">
                    <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5" aria-hidden="true" />
                    <p className="relative flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Location captured
                    </p>
                    <dl className="relative mt-3 space-y-2 text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-indigo-200">Latitude</dt>
                        <dd className="font-mono text-base font-medium tabular-nums">{gps.coords.latitude.toFixed(6)}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-indigo-200">Longitude</dt>
                        <dd className="font-mono text-base font-medium tabular-nums">{gps.coords.longitude.toFixed(6)}</dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-2">
                        <dt className="text-indigo-200">Accuracy</dt>
                        <dd className="font-medium tabular-nums">{gps.coords.accuracy.toFixed(1)} m</dd>
                      </div>
                    </dl>
                  </div>
                )}

                {gps.status === "error" && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                    <p className="flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      Couldn't get your location
                    </p>
                    <p className="mt-1 leading-6">{gps.error}</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={captureLocation}
                disabled={gps.status === "loading"}
                className={`${secondaryBtn} mt-4 w-full`}
              >
                {gps.status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : gps.status === "error" ? (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                )}
                Retry Location
              </button>
            </section>

            {/* ── C. Remarks ── */}
            <section aria-labelledby="remarks-title" style={{ "--d": "260ms" }} className={card}>
              <div className="flex items-start gap-3">
                <span className={stepBadge} aria-hidden="true">3</span>
                <div>
                  <h3 id="remarks-title" className={sectionTitle}>Remarks</h3>
                  <label htmlFor="remarks" className="mt-0.5 block text-sm text-slate-500">Optional notes for the reviewer.</label>
                </div>
              </div>
              <textarea
                id="remarks"
                rows={5}
                maxLength={MAX_REMARKS}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                aria-describedby="remarks-count"
                placeholder="Anything the reviewer should know…"
                className="mt-4 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:border-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600/20"
              />
              <p
                id="remarks-count"
                className={`mt-1.5 text-right text-xs tabular-nums ${remarks.length >= MAX_REMARKS - 50 ? "text-amber-700" : "text-slate-500"}`}
              >
                {remarks.length} / {MAX_REMARKS}
              </p>
            </section>
          </div>
        </div>

        {/* ── Result message ── */}
        {result && (
          <div
            role={result.type === "error" ? "alert" : "status"}
            className={`nme-rise flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${resultStyles[result.type]}`}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : result.type === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <p>{result.message}</p>
          </div>
        )}

        {/* ── Submit bar ── */}
        <div style={{ "--d": "340ms" }} className="nme-rise flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <ul className="flex flex-wrap gap-2" aria-label="Submission checklist">
              {[
                   {
  ok: businessNameReady,
  label: isCompanyStaff ? "Business name (optional)" : "Business name entered"
},
{
  ok: mobileNumberReady,
  label: isCompanyStaff ? "Mobile number (optional)" : "Mobile number"
},

                { ok: photosReady, label: "Photos added" },
                { ok: gpsReady, label: "Location captured" },
              ].map(({ ok, label }) => (
                <li
                  key={label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                    ok ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-50 text-slate-500 ring-slate-200"
                  }`}
                >
                  {ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <MapPin className="hidden" aria-hidden="true" />}
                  {!ok && <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden="true" />}
                  {label}
                </li>
              ))}
            </ul>
            {blockers.length > 0 && (
              <p id="submit-hint" className="mt-2 text-sm text-slate-500">{blockers.join(" ")}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            aria-describedby={blockers.length ? "submit-hint" : undefined}
            className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-7 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none ${focusRing}`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4 transition group-enabled:group-hover:translate-x-0.5" aria-hidden="true" />
            )}
            {submitting ? "Submitting…" : "Submit listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
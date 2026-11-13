import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatDate, formatINR } from "../../utils/format";

export default function SubmissionDetails({ submission: s, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = [
    ["Location", s.location],
    ["Photos", `${s.photos} uploaded`],
    ["Submitted on", formatDate(s.submittedAt)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="details-title" className="text-base font-semibold text-slate-900">{s.name}</h2>
            <div className="mt-2"><StatusBadge status={s.status} /></div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-5 divide-y divide-slate-100 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900">{v}</dd>
            </div>
          ))}
          {s.status === "approved" && (
            <div className="flex justify-between py-2.5">
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
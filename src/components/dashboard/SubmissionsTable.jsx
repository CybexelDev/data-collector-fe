import { Camera, MapPin } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../utils/format";

const viewBtn =
  "rounded-md px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600";

export default function SubmissionsTable({ submissions, onView }) {
  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3">Business / Listing</th>
              <th scope="col" className="px-5 py-3">Location</th>
              <th scope="col" className="px-5 py-3">Photos</th>
              <th scope="col" className="px-5 py-3">Submitted On</th>
              <th scope="col" className="px-5 py-3">Status</th>
              <th scope="col" className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.map((s) => (
              <tr key={s.id} className="transition hover:bg-slate-50/70">
                <td className="px-5 py-3.5 font-medium text-slate-900">{s.name}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.location}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.photos}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{formatDate(s.submittedAt)}</td>
                <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                <td className="px-5 py-3.5 text-right">
                  <button type="button" onClick={() => onView(s)} className={viewBtn}>
                    View details<span className="sr-only"> for {s.name}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {submissions.map((s) => (
          <li key={s.id} className="space-y-2 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-slate-900">{s.name}</p>
              <StatusBadge status={s.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{s.location}</span>
              <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" aria-hidden="true" />{s.photos} photos</span>
              <span>{formatDate(s.submittedAt)}</span>
            </div>
            <button type="button" onClick={() => onView(s)} className={`${viewBtn} -ml-2 min-h-11`}>
              View details<span className="sr-only"> for {s.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
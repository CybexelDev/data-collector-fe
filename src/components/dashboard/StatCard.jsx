import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function StatCard({ icon: Icon, label, value, to, loading, valueClass = "text-slate-900" }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </div>
        {to && (
          <ArrowUpRight
            className="h-4 w-4 text-slate-300 transition group-hover:text-indigo-600"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass}`}>{value}</p>
      )}
    </>
  );

  const base = "group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
  return to ? (
    <Link
      to={to}
      className={`${base} transition hover:border-slate-300 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
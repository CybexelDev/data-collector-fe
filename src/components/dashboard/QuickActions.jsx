import { Link } from "react-router-dom";
import { ChevronRight, ClipboardList, PlusCircle, Wallet } from "lucide-react";

const ACTIONS = [
  { to: "/add-listing", label: "Add New Listing", Icon: PlusCircle },
  { to: "/submissions", label: "View My Submissions", Icon: ClipboardList },
  { to: "/earnings", label: "View My Earnings", Icon: Wallet },
];

export default function QuickActions() {
  return (
    <section aria-labelledby="qa-title" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <h2 id="qa-title" className="px-3 pb-1 pt-3 text-base font-semibold text-slate-900">Quick Actions</h2>
      <ul>
        {ACTIONS.map(({ to, label, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              <Icon className="h-[18px] w-[18px] text-indigo-600" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
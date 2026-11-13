import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import SubmissionsTable from "./SubmissionsTable";
import EmptyState from "./EmptyState";

export default function RecentSubmissions({ submissions, loading, onView }) {
  const recent = [...submissions]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 5);

  return (
    <section aria-labelledby="recent-title" className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 id="recent-title" className="text-base font-semibold text-slate-900">Recent Submissions</h2>
        <Link to="/submissions" className="rounded-md px-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 border-t border-slate-100 p-5" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}
        </div>
      ) : recent.length === 0 ? (
        <div className="border-t border-slate-100">
          <EmptyState
            icon={ClipboardList}
            title="No submissions yet"
            description="Start by adding your first listing. Once submitted, it will appear here with its review status."
            action={{ label: "Add New Listing", to: "/add-listing" }}
          />
        </div>
      ) : (
        <SubmissionsTable submissions={recent} onView={onView} />
      )}
    </section>
  );
}
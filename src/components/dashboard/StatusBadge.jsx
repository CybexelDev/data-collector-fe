import { CheckCircle2, Clock, XCircle } from "lucide-react";

const STYLES = {
  pending: { label: "Pending", Icon: Clock, cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  approved: { label: "Approved", Icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Rejected", Icon: XCircle, cls: "bg-red-50 text-red-700 ring-red-600/20" },
};

export default function StatusBadge({ status }) {
  const { label, Icon, cls } = STYLES[status] || STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
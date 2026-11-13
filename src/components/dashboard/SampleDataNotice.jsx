import { Info } from "lucide-react";

export default function SampleDataNotice() {
  return (
    <div role="note" className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>Preview mode: these are sample records for UI design only, not your real submissions or earnings.</p>
    </div>
  );
}
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3,
  Mail, MapPin, Menu, Phone, Search, Users, UserRound, X, XCircle,
} from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { getStoredUser, logout } from "../../api/authservice";
import { useEffect, } from "react";
import usePendingSubmissionsCount from "../../hooks/usePendingSubmissionCount";
import {
  getAllCollectors,
  createCollector,
  updateCollectorStatus,
} from "../../api/admincollectorservice";
const MOCK_COLLECTORS = [
  { id: "COL-1048", name: "Priya Lakshmi", email: "priya.lakshmi@example.com", phone: "+91 98765 43210", area: "Anna Nagar", region: "Chennai", joined: "12 Aug 2026", status: "active", submissions: 86, approved: 72, pending: 9, rejected: 5, payout: 4320 },
  { id: "COL-1047", name: "Arun Kumar", email: "arun.kumar@example.com", phone: "+91 98765 43211", area: "T. Nagar", region: "Chennai", joined: "08 Aug 2026", status: "active", submissions: 74, approved: 63, pending: 7, rejected: 4, payout: 3780 },
  { id: "COL-1046", name: "Fathima Shirin", email: "fathima.shirin@example.com", phone: "+91 98765 43212", area: "Palayam", region: "Thiruvananthapuram", joined: "02 Aug 2026", status: "active", submissions: 61, approved: 51, pending: 6, rejected: 4, payout: 3060 },
  { id: "COL-1045", name: "Rahul Menon", email: "rahul.menon@example.com", phone: "+91 98765 43213", area: "Kakkanad", region: "Kochi", joined: "27 Jul 2026", status: "inactive", submissions: 48, approved: 39, pending: 5, rejected: 4, payout: 2340 },
  { id: "COL-1044", name: "Nihal P", email: "nihal.p@example.com", phone: "+91 98765 43214", area: "Thalassery", region: "Kannur", joined: "21 Jul 2026", status: "active", submissions: 43, approved: 37, pending: 4, rejected: 2, payout: 2220 },
  { id: "COL-1043", name: "Sneha Raj", email: "sneha.raj@example.com", phone: "+91 98765 43215", area: "Coimbatore North", region: "Coimbatore", joined: "16 Jul 2026", status: "active", submissions: 39, approved: 32, pending: 4, rejected: 3, payout: 1920 },
  { id: "COL-1042", name: "Muneer K", email: "muneer.k@example.com", phone: "+91 98765 43216", area: "Manjeri", region: "Malappuram", joined: "10 Jul 2026", status: "inactive", submissions: 31, approved: 26, pending: 3, rejected: 2, payout: 1560 },
  { id: "COL-1041", name: "Anjali S", email: "anjali.s@example.com", phone: "+91 98765 43217", area: "Vyttila", region: "Kochi", joined: "04 Jul 2026", status: "active", submissions: 28, approved: 24, pending: 2, rejected: 2, payout: 1440 },
  { id: "COL-1040", name: "Shameer V", email: "shameer.v@example.com", phone: "+91 98765 43218", area: "Kozhikode Beach", region: "Kozhikode", joined: "28 Jun 2026", status: "active", submissions: 22, approved: 18, pending: 2, rejected: 2, payout: 1080 },
  { id: "COL-1039", name: "Akhil Das", email: "akhil.das@example.com", phone: "+91 98765 43219", area: "Palarivattom", region: "Kochi", joined: "19 Jun 2026", status: "active", submissions: 17, approved: 14, pending: 2, rejected: 1, payout: 840 },
  { id: "COL-1038", name: "Rasiya M", email: "rasiya.m@example.com", phone: "+91 98765 43220", area: "Kannur Town", region: "Kannur", joined: "12 Jun 2026", status: "inactive", submissions: 12, approved: 10, pending: 1, rejected: 1, payout: 600 },
  { id: "COL-1037", name: "Vishnu B", email: "vishnu.b@example.com", phone: "+91 98765 43221", area: "Gandhipuram", region: "Coimbatore", joined: "05 Jun 2026", status: "active", submissions: 9, approved: 7, pending: 1, rejected: 1, payout: 420 },
];

const initials = (name) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const avatarTones = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-800", "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-rose-100 text-rose-700"];
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
function StatusPill({ status }) {
  const active = status === "active";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${active ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-zinc-100 text-zinc-600 ring-zinc-500/15"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-zinc-400"}`} />{active ? "Active" : "Inactive"}
  </span>;
}

function StatCard({ label, value, hint, icon: Icon, tone }) {
  const tones = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", zinc: "bg-zinc-100 text-zinc-600" };
  return <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-medium text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{value}</p><p className="mt-1 text-xs text-zinc-500">{hint}</p></div>
      <span className={`rounded-lg p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
    </div>
  </div>;
}

export default function AdminCollectors() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showAddCollector, setShowAddCollector] = useState(false);
const [newCollector, setNewCollector] = useState({
  username: "",
  password: "",
  isCompanyStaff: false,
});
const [collectors, setCollectors] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [submitting, setSubmitting] = useState(false);
const { pendingCount } = usePendingSubmissionsCount();
  const pageSize = 8;
  const user = getStoredUser?.() || {};
  const displayName = user?.name || user?.fullName || user?.username || "Admin";

  const filtered = useMemo(() => collectors.filter((collector) => {
    const matchesStatus = filter === "all" || collector.status === filter;
    const term = query.trim().toLowerCase();
    const matchesSearch = !term || [collector.name, collector.id, collector.email, collector.phone, collector.area, collector.region].some((value) => value.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  }), [collectors, filter, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = collectors.filter((collector) => collector.status === "active").length;
  const totalSubmissions = collectors.reduce((sum, collector) => sum + collector.submissions, 0);
  const totalApproved = collectors.reduce((sum, collector) => sum + collector.approved, 0);

  const handleLogout = () => { logout(); navigate("/login"); };
  const changeFilter = (value) => { setFilter(value); setPage(1); };
  const changeQuery = (value) => { setQuery(value); setPage(1); };
 const toggleStatus = async (id) => {
  const collector = collectors.find((item) => item.id === id);

  if (!collector) return;

  const newStatus = collector.status !== "active";

  try {
    setError("");

    await updateCollectorStatus(id, newStatus);

    await fetchCollectors();

    setSelected((current) =>
      current?.id === id
        ? {
            ...current,
            status: newStatus ? "active" : "inactive",
          }
        : current
    );
  } catch (err) {
    setError(
      err.response?.data?.message || "Failed to update collector status"
    );
  }
};
 const addCollector = async (event) => {
  event.preventDefault();

  const username = newCollector.username.trim().toLowerCase();
  const password = newCollector.password;

  if (!username || !password) return;

  try {
    setSubmitting(true);
    setError("");

  await createCollector({
  username,
  password,
  isCompanyStaff: newCollector.isCompanyStaff,
});
    await fetchCollectors();
setNewCollector({
  username: "",
  password: "",
  isCompanyStaff: false,
});

    setShowAddCollector(false);
    setFilter("all");
    setQuery("");
    setPage(1);
  } catch (err) {
    setError(
      err.response?.data?.message || "Failed to create collector"
    );
  } finally {
    setSubmitting(false);
  }
};
  useEffect(() => {
  fetchCollectors();
}, []);

const fetchCollectors = async () => {
  try {
    setLoading(true);
    setError("");

    const response = await getAllCollectors();

    const collectorData = response.collectors || [];

    const formattedCollectors = collectorData.map((collector) => ({
      ...collector,

      id: collector._id,
      name: collector.username,

      email: collector.email || "—",
      phone: collector.phone || "—",
      area: collector.area || "—",
      region: collector.region || "—",
isCompanyStaff: collector.isCompanyStaff === true,
      joined: collector.createdAt
        ? new Date(collector.createdAt).toLocaleDateString("en-IN")
        : "—",

      status: collector.isActive ? "active" : "inactive",

      submissions: collector.totalSubmissions || 0,
      approved: collector.approved || 0,
      pending: collector.pending || 0,
      rejected: collector.rejected || 0,

      payout: collector.totalPaid || 0,
      totalEarned: collector.totalEarned || 0,
      pendingPayout: collector.pendingPayout || 0,
    }));

    setCollectors(formattedCollectors);
  } catch (err) {
    setError(
      err.response?.data?.message || "Failed to fetch collectors"
    );
  } finally {
    setLoading(false);
  }
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
  return <div className="min-h-screen bg-[#fafafa] text-zinc-900 antialiased">
    <AdminSidebar active="collectors" onNavigate={handleNavigate} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} user={user} onLogout={handleLogout} badges={{ submissions: pendingCount }} />
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
        <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="-ml-2 rounded-lg p-2.5 text-zinc-600 transition hover:bg-zinc-100 lg:hidden"><Menu className="h-5 w-5" /></button>
        <div className="relative min-w-0 max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Search collectors, ID, area…" className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-9 text-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/20" />
          {query && <button type="button" onClick={() => changeQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-200"><X className="h-4 w-4" /></button>}
        </div>
        <div className="hidden text-right sm:block"><p className="text-sm font-medium text-zinc-800">{displayName}</p><p className="text-xs text-zinc-500">Administrator</p></div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials(displayName)}</span>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Management</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">Collectors</h1><p className="mt-1 text-sm text-zinc-500">Manage collector profiles, activity, and submission performance.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowAddCollector(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800"><Users className="h-4 w-4" />Add collector</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Collectors" value={collectors.length} hint="Registered collector profiles" icon={Users} tone="indigo" />
          <StatCard label="Active Collectors" value={activeCount} hint={`${Math.round(activeCount / Math.max(collectors.length, 1) * 100)}% currently active`} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Total Submissions" value={totalSubmissions.toLocaleString("en-IN")} hint="Across all collectors" icon={UserRound} tone="zinc" />
          <StatCard label="Approved Listings" value={totalApproved.toLocaleString("en-IN")} hint="Submissions approved by admin" icon={ArrowUpRight} tone="amber" />
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div><h2 className="text-sm font-semibold text-zinc-900">All collectors <span className="ml-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500">{filtered.length}</span></h2><p className="mt-1 text-xs text-zinc-500">Select a collector to view their profile and stats.</p></div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-zinc-100 p-1">
              {[["all", "All"], ["active", "Active"], ["inactive", "Inactive"]].map(([value, label]) => <button key={value} type="button" onClick={() => changeFilter(value)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}>{label}</button>)}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-zinc-50/80"><tr className="border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-3">Collector</th>
                <th className="px-4 py-3">Type</th>
               <th className="px-4 py-3">Submissions</th><th className="px-4 py-3">Approval rate</th><th className="px-4 py-3">Payout</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {visible.map((collector, index) => <tr key={collector.id} className="transition hover:bg-zinc-50/70">
                  <td className="px-5 py-3.5"><button type="button" onClick={() => setSelected(collector)} className="flex items-center gap-3 text-left">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarTones[index % avatarTones.length]}`}>{initials(collector.name)}</span>
                    <span className="min-w-0"><span className="block truncate text-sm font-medium text-zinc-900">{collector.name}</span><span className="mt-0.5 block text-xs text-zinc-500">{collector.id} · {collector.email}</span></span>
                  </button></td>
                  <td className="px-4 py-3.5">
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
      collector.isCompanyStaff
        ? "bg-indigo-50 text-indigo-700"
        : "bg-zinc-100 text-zinc-600"
    }`}
  >
    {collector.isCompanyStaff ? "Company Staff" : "Normal Collector"}
  </span>
</td>
                  <td className="px-4 py-3.5"><p className="text-sm font-medium text-zinc-800">{collector.submissions}</p><p className="text-xs text-zinc-500">{collector.pending} pending</p></td>
                  <td className="px-4 py-3.5"><div className="flex items-center gap-2"><span className="text-sm font-medium text-zinc-800">{Math.round(collector.approved / Math.max(collector.submissions, 1) * 100)}%</span><div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${collector.approved / Math.max(collector.submissions, 1) * 100}%` }} /></div></div></td>
                  <td className="px-4 py-3.5 text-sm font-medium text-zinc-800">{money(collector.totalEarned)}</td>
                  <td className="px-4 py-3.5"><StatusPill status={collector.status} /></td>
                  <td className="px-5 py-3.5 text-right"><button type="button" onClick={() => setSelected(collector)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">View profile</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {visible.map((collector, index) => <button key={collector.id} type="button" onClick={() => setSelected(collector)} className="w-full rounded-xl border border-zinc-200 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30">
              <div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarTones[index % avatarTones.length]}`}>{initials(collector.name)}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-zinc-900">{collector.name}</span><StatusPill status={collector.status} /></span><span className="mt-0.5 block text-xs text-zinc-500">{collector.id} · {collector.area}, {collector.region}</span><span className="mt-2 flex items-center justify-between text-xs text-zinc-600"><span>{collector.submissions} submissions</span><span className="font-medium">{Math.round(collector.approved / Math.max(collector.submissions, 1) * 100)}% approved</span></span></span></div>
            </button>)}
          </div>

          {visible.length === 0 && <div className="px-5 py-14 text-center"><Users className="mx-auto h-8 w-8 text-zinc-300" /><p className="mt-3 text-sm font-medium text-zinc-700">No collectors found</p><p className="mt-1 text-xs text-zinc-500">Try changing your search or status filter.</p></div>}

          <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-zinc-500">Showing <span className="font-medium text-zinc-700">{filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)}</span> of <span className="font-medium text-zinc-700">{filtered.length}</span> collectors</p>
            <div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" />Previous</button><span className="text-xs tabular-nums text-zinc-500">Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="h-3.5 w-3.5" /></button></div>
          </div>
        </section>
      </main>
    </div>

    {showAddCollector && <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={(event) => { if (event.target === event.currentTarget) setShowAddCollector(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-collector-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 p-5 sm:p-6"><div><h2 id="add-collector-title" className="text-lg font-semibold text-zinc-900">Add collector user</h2><p className="mt-1 text-sm text-zinc-500">Create a user account. In NME, users are collectors.</p></div><button type="button" onClick={() => setShowAddCollector(false)} aria-label="Close add collector form" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><X className="h-5 w-5" /></button></div>
        <form onSubmit={addCollector} className="space-y-4 p-5 sm:p-6">
          <div><label htmlFor="collector-username" className="mb-1.5 block text-xs font-medium text-zinc-700">Username</label><input id="collector-username" required autoFocus minLength={3} value={newCollector.username} onChange={(event) => setNewCollector((current) => ({ ...current, username: event.target.value }))} placeholder="Enter username" autoComplete="off" className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20" /><p className="mt-1 text-xs text-zinc-500">Stored lowercase and must be unique.</p></div>
          <div><label htmlFor="collector-password" className="mb-1.5 block text-xs font-medium text-zinc-700">Password</label><input id="collector-password" type="password" required minLength={8} value={newCollector.password} onChange={(event) => setNewCollector((current) => ({ ...current, password: event.target.value }))} placeholder="Set initial password" autoComplete="new-password" className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20" /><p className="mt-1 text-xs text-zinc-500">Backend should hash the password. Do not store plaintext passwords.</p></div>
          <div className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
  <input
    id="company-staff"
    type="checkbox"
    checked={newCollector.isCompanyStaff}
    onChange={(event) =>
      setNewCollector((current) => ({
        ...current,
        isCompanyStaff: event.target.checked,
      }))
    }
    className="mt-1 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
  />

  <div>
    <label
      htmlFor="company-staff"
      className="text-sm font-medium text-zinc-900"
    >
      Company Staff
    </label>
    <p className="mt-1 text-xs text-zinc-500">
      Enable this if the collector belongs to company staff.
    </p>
  </div>
</div>
          <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600"><p><span className="font-medium text-zinc-800">Role:</span> user (Collector)</p><p className="mt-1"><span className="font-medium text-zinc-800">Account status:</span> Active (isActive: true)</p></div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowAddCollector(false)} className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Cancel</button><button type="submit" className="rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">Create user</button></div>
        </form>
      </section>
    </div>}

    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="collector-dialog-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-zinc-100 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">{initials(selected.name)}</span><div><h2 id="collector-dialog-title" className="text-lg font-semibold text-zinc-900">{selected.name}</h2><p className="mt-0.5 text-xs text-zinc-500">{selected.id} · Joined {selected.joined}</p><div className="mt-2"><StatusPill status={selected.status} /></div>
        <div className="mt-2">
  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
    {selected.isCompanyStaff ? "Company Staff" : "Normal Collector"}
  </span>
</div>
        </div></div><button type="button" onClick={() => setSelected(null)} aria-label="Close profile" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-lg bg-zinc-50 p-3"><p className="text-xs text-zinc-500">Submissions</p><p className="mt-1 text-xl font-semibold">{selected.submissions}</p></div><div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Approved</p><p className="mt-1 text-xl font-semibold text-emerald-800">{selected.approved}</p></div><div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-700">Pending</p><p className="mt-1 text-xl font-semibold text-amber-800">{selected.pending}</p></div><div className="rounded-lg bg-red-50 p-3"><p className="text-xs text-red-700">Rejected</p><p className="mt-1 text-xl font-semibold text-red-800">{selected.rejected}</p></div></div>
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
  {/* Payout Total */}
  <div className="rounded-lg border border-zinc-200 p-3">
    <p className="text-sm font-medium text-zinc-800">
      Payout Total
    </p>
    <p className="mt-0.5 text-xs text-zinc-500">
      Total earned
    </p>
    <p className="mt-2 text-lg font-semibold text-zinc-900">
      {money(selected.totalEarned)}
    </p>
  </div>

  {/* Pending Payout */}
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
    <p className="text-sm font-medium text-amber-800">
      Pending Payout
    </p>
    <p className="mt-0.5 text-xs text-amber-600">
      Remaining amount to be paid
    </p>
    <p className="mt-2 text-lg font-semibold text-amber-900">
      {money(selected.pendingPayout)}
    </p>
  </div>
</div>          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">Close</button><button type="button" onClick={() => toggleStatus(selected.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${selected.status === "active" ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-indigo-700 text-white hover:bg-indigo-800"}`}>{selected.status === "active" ? "Mark inactive" : "Mark active"}</button></div>
        </div>
      </section>
    </div>}
  </div>;
}

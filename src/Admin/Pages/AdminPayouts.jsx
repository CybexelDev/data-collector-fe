import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Wallet, IndianRupee, Clock3, CheckCircle2, Plus, X, Eye,
  CalendarDays, ReceiptText, Pencil, Ban, Check, RefreshCw,Menu,
    Bell,
  CircleUserRound,

} from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { getStoredUser, logout } from "../../api/authservice";
import usePendingSubmissionsCount from "../../hooks/usePendingSubmissionCount";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getAllPayouts,
  getCollectorPayouts,
  createPayout,
  updatePayout,
  markPayoutPaid,
  cancelPayout,
  getAllPayoutHistory
} from "../../api/payoutservice";

const RATE_PER_APPROVED = 2.5;
const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(n) || 0);

const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const initials = (name = "") =>
  name
    .trim()
    .split(/[.\s]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CL";

const normalizeCollector = (item) => {
  const user = item.user || {};
  return {
    id: user._id || item.userId || item._id,
    username: user.name || user.username || user.email || "Unknown collector",
    email: user.email || "",
    approved: Number(item.approvedCount) || 0,
    earned: Number(item.totalEarned) || 0,
    paid: Number(item.totalPaid) || 0,
    pending: Number(item.pendingPayout) || 0,
    pendingDrafts: Number(item.pendingDrafts) || 0,
    availableToSchedule: Number(item.availableToSchedule) || 0,
  };
};

const normalizePayout = (item, collector) => {
  const statusMap = {
    paid: "Paid",
    pending: "Pending",
    cancelled: "Cancelled",
    canceled: "Cancelled",
  };
  const rawStatus = String(item.status || "pending").toLowerCase();
  return {
    id: item._id,
    collector: collector?.username || item.user?.name || "Collector",
    collectorId: collector?.id || item.user?._id || item.user,
    amount: Number(item.amount) || 0,
    method: item.paymentMethod || item.method || "—",
    reference: item.transactionReference || item.reference || "—",
    date: dateLabel(item.paidAt || item.updatedAt || item.createdAt),
    rawDate: item.paidAt || item.updatedAt || item.createdAt,
    status: statusMap[rawStatus] || rawStatus,
    adminNote: item.adminNote || item.notes || "",
  };
};

function StatCard({ label, value, helper, icon: Icon, tone }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{helper}</p>
        </div>
        <div className={`rounded-xl p-3 ${colors[tone]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Paid"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : status === "Cancelled"
      ? "bg-rose-50 text-rose-700 ring-rose-600/20"
      : status === "Draft"
      ? "bg-slate-100 text-slate-600 ring-slate-500/20"
      : "bg-amber-50 text-amber-700 ring-amber-600/20";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status}
    </span>
  );
}

function PayoutsTopbar({ onMenu, search, onSearch, user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="admin-sidebar"
        className="-ml-2 rounded-lg p-2.5 text-zinc-600 transition hover:bg-zinc-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative min-w-0 max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search payouts..."
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
        />
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="rounded-xl p-2.5 text-zinc-500 transition hover:bg-zinc-100"
      >
        <Bell className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2 border-l border-zinc-200 pl-3">
        <CircleUserRound className="h-8 w-8 shrink-0 text-zinc-400" />

        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium text-zinc-800">
            {user?.name || user?.fullName || user?.email || "Admin"}
          </p>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-zinc-500 hover:text-zinc-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
export default function AdminPayouts() {
  const navigate = useNavigate();
  const [collectors, setCollectors] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [modalCollector, setModalCollector] = useState(null);
  const [historyCollector, setHistoryCollector] = useState(null);
  const [detailCollector, setDetailCollector] = useState(null);
  const [collectorHistory, setCollectorHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: "", notes: "" });
const [historyLoading, setHistoryLoading] = useState(false);
const { pendingCount } = usePendingSubmissionsCount();

const [historyPage, setHistoryPage] = useState(1);
const [historyTotalPages, setHistoryTotalPages] = useState(1);

const [historyStatus, setHistoryStatus] = useState("all");
const [historySearch, setHistorySearch] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    method: "UPI",
    reference: "",
    notes: "",
  });
  const [payingPayout, setPayingPayout] = useState(null);
  const [editingPayout, setEditingPayout] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", notes: "" });
const [mobileOpen, setMobileOpen] = useState(false);
  const fetchCollectors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllPayouts();
      const rows = response.collectors || response.data?.collectors || [];
      setCollectors(rows.map(normalizeCollector));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load payout collectors.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (collector) => {
    if (!collector?.id) return [];
    try {
      setHistoryLoading(true);
      const response = await getCollectorPayouts(collector.id);
      const payouts = response.payouts || response.data?.payouts || response.payments || [];
      const mapped = payouts.map((item) => normalizePayout(item, collector));
      setCollectorHistory(mapped);
      return mapped;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load collector payout history.");
      setCollectorHistory([]);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollectors();
  }, [fetchCollectors]);

  const totals = useMemo(
    () => ({
      earned: collectors.reduce((sum, c) => sum + c.earned, 0),
      paid: collectors.reduce((sum, c) => sum + c.paid, 0),
      pending: collectors.reduce((sum, c) => sum + c.pending, 0),
      approved: collectors.reduce((sum, c) => sum + c.approved, 0),
    }),
    [collectors]
  );

  const filtered = collectors.filter((c) => {
    const matchesSearch = `${c.username} ${c.id} ${c.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      (filter === "Pending" && c.pending > 0) ||
      (filter === "Paid" && c.pending === 0);
    return matchesSearch && matchesFilter;
  });

  const openPay = (collector) => {
    setModalCollector(collector);
    setForm({
      amount: Number(collector.availableToSchedule).toFixed(2),
      notes: "",
    });
  };

  

  const fetchPaymentHistory = async () => {
  try {
    setHistoryLoading(true);

    const params = {
      page: historyPage,
      limit: 10,
    };

    if (historyStatus !== "all") {
      params.status = historyStatus;
    }

    if (historySearch.trim()) {
      params.search = historySearch.trim();
    }

    const response = await getAllPayoutHistory(params);

    setHistory(response.payments || []);
    setHistoryTotalPages(response.pagination?.totalPages || 1);
  } catch (error) {
    console.error("Failed to fetch payment history:", error);

    toast.error(
      error.response?.data?.message ||
        "Failed to fetch payment history"
    );
  } finally {
    setHistoryLoading(false);
  }
};

useEffect(() => {
  fetchPaymentHistory();
}, [historyPage, historyStatus, historySearch]);


  const submitPayment = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (
      !modalCollector ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > modalCollector.availableToSchedule
    ) {
      toast.error("Enter an amount greater than ₹0 and not above the available amount to schedule.");
      return;
    }
    try {
      setSubmitting(true);
      await createPayout({
        userId: modalCollector.id,
        amount,
        adminNote: form.notes.trim(),
      });
      toast.success("Payout draft created.");
      setModalCollector(null);
      await fetchCollectors();
      if (detailCollector?.id === modalCollector.id) {
        await fetchHistory(modalCollector);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create payout draft.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = async (collector) => {
    setDetailCollector(collector);
    await fetchHistory(collector);
  };

  const openFullHistory = async (collector) => {
    setHistoryCollector(collector);
    await fetchHistory(collector);
  };

  const openMarkPaid = (payout) => {
    setPayingPayout(payout);
    setPaymentForm({ method: "UPI", reference: "", notes: payout.adminNote || "" });
  };

  const submitMarkPaid = async (e) => {
    e.preventDefault();
    if (!payingPayout) return;
    try {
      setSubmitting(true);
      await markPayoutPaid(payingPayout.id, {
        paymentMethod: paymentForm.method,
        transactionReference: paymentForm.reference.trim(),
        adminNote: paymentForm.notes.trim(),
      });
      toast.success("Payout marked as paid.");
      setPayingPayout(null);
      await fetchCollectors();
      if (detailCollector) await fetchHistory(detailCollector);
      if (historyCollector) await fetchHistory(historyCollector);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to mark payout as paid.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (payout) => {
    setEditingPayout(payout);
    setEditForm({ amount: payout.amount.toFixed(2), notes: payout.adminNote });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingPayout) return;
    const amount = Number(editForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payout amount.");
      return;
    }
    try {
      setSubmitting(true);
      await updatePayout(editingPayout.id, { amount, adminNote: editForm.notes.trim() });
      toast.success("Payout draft updated.");
      setEditingPayout(null);
      await fetchCollectors();
      if (detailCollector) await fetchHistory(detailCollector);
      if (historyCollector) await fetchHistory(historyCollector);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update payout draft.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPayout = async (payout) => {
    if (!window.confirm(`Cancel the pending payout of ${money(payout.amount)}?`)) return;
    try {
      setSubmitting(true);
      await cancelPayout(payout.id);
      toast.success("Payout cancelled.");
      await fetchCollectors();
      if (detailCollector) await fetchHistory(detailCollector);
      if (historyCollector) await fetchHistory(historyCollector);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to cancel payout.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleNavigate = (id) => {

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
  const renderPayoutRows = (rows, showActions = true) =>
    rows.map((p) => (
      <div key={p.id} className="rounded-xl border border-zinc-100 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-800">{p.id}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {p.date} · {p.method} · {p.reference}
            </p>
            {p.adminNote && <p className="mt-1 text-xs text-zinc-500">{p.adminNote}</p>}
            <div className="mt-2"><StatusBadge status={p.status} /></div>
          </div>
          <div className="text-right">
            <b className="text-sm text-zinc-900">{money(p.amount)}</b>
            {showActions && p.status === "Pending" && (
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                <button onClick={() => openMarkPaid(p)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs text-white hover:bg-emerald-700">
                  <Check size={13} /> Mark paid
                </button>
                <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => handleCancelPayout(p)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
                  <Ban size={13} /> Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    ));

  return (
    <div className="min-h-screen bg-zinc-50">
<AdminSidebar
  user={getStoredUser()}
  onLogout={handleLogout}
  active="payouts"
  onNavigate={handleNavigate}
  mobileOpen={mobileOpen}
  onCloseMobile={() => setMobileOpen(false)}
          badges={{ submissions: pendingCount }}

/>      <div className="lg:pl-64">
  <PayoutsTopbar
    onMenu={() => setMobileOpen(true)}
    search={search}
    onSearch={setSearch}
    onLogout={handleLogout}
  />
  </div>

      <main className="min-h-screen px-4 pb-10 pt-6 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-medium text-zinc-400">Admin / Finance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">Collector Payouts</h1>
              <p className="mt-1 text-sm text-zinc-500">Review earnings and manage collector payments.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
              <IndianRupee size={16} />
              <span>Rate per approved submission: <b className="text-zinc-900">{money(RATE_PER_APPROVED)}</b></span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Payout" value={money(totals.earned)} helper={`${totals.approved} approved submissions`} icon={Wallet} tone="indigo" />
            <StatCard label="Total paid" value={money(totals.paid)} helper="Payments recorded" icon={CheckCircle2} tone="emerald" />
            <StatCard label="Pending payout" value={money(totals.pending)} helper="Outstanding collector balance" icon={Clock3} tone="amber" />
            <StatCard label="Approved submissions" value={totals.approved.toLocaleString("en-IN")} helper={`${money(RATE_PER_APPROVED)} per submission`} icon={ReceiptText} tone="slate" />
          </div>

          <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-semibold text-zinc-900">Collector earnings</h2><p className="mt-1 text-xs text-zinc-500">Payout balance by collector</p></div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search collector or ID" className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 sm:w-56" />
                </div>
                <div className="flex rounded-xl bg-zinc-100 p-1">{["All", "Pending", "Paid"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === item ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}>{item}</button>)}</div>
                <button onClick={fetchCollectors} disabled={loading} className="inline-flex items-center justify-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"><RefreshCw size={14} /> Refresh</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-3 font-medium">Collector</th><th className="px-5 py-3 font-medium">Approved</th><th className="px-5 py-3 font-medium">Total earned</th><th className="px-5 py-3 font-medium">Total paid</th><th className="px-5 py-3 font-medium">Pending</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead>
                <tbody className="divide-y divide-zinc-100">
                  {loading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-zinc-400">Loading payout data…</td></tr> : filtered.map((c) => (
                    <tr key={c.id} className="transition hover:bg-zinc-50/70">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{initials(c.username)}</div><div><button onClick={() => openDetails(c)} className="text-left font-medium text-zinc-900 hover:text-indigo-600">{c.username}</button><p className="text-xs text-zinc-400">{c.email || c.id}</p></div></div></td>
                      <td className="px-5 py-4 text-zinc-600">{c.approved}</td><td className="px-5 py-4 font-medium text-zinc-900">{money(c.earned)}</td><td className="px-5 py-4 text-zinc-600">{money(c.paid)}</td><td className="px-5 py-4 font-semibold text-zinc-900">{money(c.pending)}</td><td className="px-5 py-4"><StatusBadge status={c.pending === 0 ? "Paid" : "Pending"} /></td>
                      <td className="px-5 py-4"><div className="flex justify-end"><button onClick={() => openDetails(c)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100"><Eye size={14} /> View details</button></div></td>
                    </tr>
                  ))}
                  {!loading && !filtered.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-zinc-400">No collectors match your search.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500"><span>Showing {filtered.length} of {collectors.length} collectors</span><span>Live payout data</span></div>
          </section>
<section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
  {/* Header */}
  <div className="flex flex-col gap-4 border-b border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="font-semibold text-zinc-900">
        Recent payment history
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        View and track all collector payout transactions.
      </p>
    </div>

    <div className="flex flex-col gap-2 sm:flex-row">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          value={historySearch}
          onChange={(e) => {
            setHistorySearch(e.target.value);
            setHistoryPage(1);
          }}
          placeholder="Search collector..."
          className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 sm:w-52"
        />
      </div>

      {/* Status filter */}
      <select
        value={historyStatus}
        onChange={(e) => {
          setHistoryStatus(e.target.value);
          setHistoryPage(1);
        }}
        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
      >
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Refresh */}
      <button
        onClick={fetchPaymentHistory}
        disabled={historyLoading}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
    </div>
  </div>

  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full min-w-[850px] text-left text-sm">
      <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
        <tr>
          <th className="px-5 py-3 font-medium">Collector</th>
          <th className="px-5 py-3 font-medium">Amount</th>
          <th className="px-5 py-3 font-medium">Payment method</th>
          <th className="px-5 py-3 font-medium">Reference</th>
          <th className="px-5 py-3 font-medium">Date</th>
          <th className="px-5 py-3 font-medium">Status</th>
          <th className="px-5 py-3 font-medium">Admin note</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-zinc-100">
        {historyLoading ? (
          <tr>
            <td
              colSpan={7}
              className="px-5 py-12 text-center text-zinc-400"
            >
              Loading payment history...
            </td>
          </tr>
        ) : history.length > 0 ? (
          history.map((payment) => {
            const collector =
              payment.user?.name ||
              payment.user?.username ||
              payment.user?.email ||
              "Unknown collector";

            const rawStatus = String(
              payment.status || "pending"
            ).toLowerCase();

            const status =
              rawStatus === "paid"
                ? "Paid"
                : rawStatus === "cancelled" ||
                  rawStatus === "canceled"
                ? "Cancelled"
                : "Pending";

            return (
              <tr
                key={payment._id}
                className="transition hover:bg-zinc-50/70"
              >
                {/* Collector */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                      {initials(collector)}
                    </div>

                    <div>
                      <p className="font-medium text-zinc-900">
                        {collector}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {payment.user?.email ||
                          payment.user?._id ||
                          "—"}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Amount */}
                <td className="px-5 py-4 font-semibold text-zinc-900">
                  {money(payment.amount)}
                </td>

                {/* Method */}
                <td className="px-5 py-4 text-zinc-600">
                  {payment.paymentMethod ||
                    payment.method ||
                    "—"}
                </td>

                {/* Reference */}
                <td className="px-5 py-4 text-zinc-500">
                  {payment.transactionReference ||
                    payment.reference ||
                    "—"}
                </td>

                {/* Date */}
                <td className="px-5 py-4 text-zinc-600">
                  {dateLabel(
                    payment.paidAt ||
                      payment.updatedAt ||
                      payment.createdAt
                  )}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <StatusBadge status={status} />
                </td>

                {/* Admin note */}
                <td className="max-w-[200px] px-5 py-4 text-zinc-500">
                  <p className="truncate">
                    {payment.adminNote ||
                      payment.notes ||
                      "—"}
                  </p>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td
              colSpan={7}
              className="px-5 py-12 text-center text-sm text-zinc-400"
            >
              No payment history found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* Pagination */}
  <div className="flex flex-col gap-3 border-t border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-zinc-500">
      Page {historyPage} of {historyTotalPages}
    </p>

    <div className="flex items-center gap-2">
      <button
        disabled={historyPage <= 1 || historyLoading}
        onClick={() =>
          setHistoryPage((prev) => Math.max(1, prev - 1))
        }
        className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      <button
        disabled={
          historyPage >= historyTotalPages ||
          historyLoading
        }
        onClick={() =>
          setHistoryPage((prev) =>
            Math.min(historyTotalPages, prev + 1)
          )
        }
        className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  </div>
</section>
        </div>
      </main>

      {detailCollector && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailCollector(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-zinc-100 p-5"><div><p className="text-xs font-medium text-zinc-400">Admin / Finance / Collector details</p><h3 className="mt-1 text-xl font-semibold text-zinc-900">{detailCollector.username}</h3><p className="mt-1 text-sm text-zinc-500">{detailCollector.email || detailCollector.id}</p></div><button onClick={() => setDetailCollector(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"><X size={18} /></button></div>
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-100 p-4"><p className="text-xs text-zinc-500">Approved submissions</p><p className="mt-2 text-xl font-semibold text-zinc-900">{detailCollector.approved}</p></div>
              <div className="rounded-xl border border-zinc-100 p-4"><p className="text-xs text-zinc-500">Total earned</p><p className="mt-2 text-xl font-semibold text-zinc-900">{money(detailCollector.earned)}</p></div>
              <div className="rounded-xl border border-zinc-100 p-4"><p className="text-xs text-zinc-500">Total paid</p><p className="mt-2 text-xl font-semibold text-emerald-700">{money(detailCollector.paid)}</p></div>
              <div className="rounded-xl border border-zinc-100 p-4"><p className="text-xs text-zinc-500">Pending balance</p><p className="mt-2 text-xl font-semibold text-amber-700">{money(detailCollector.pending)}</p><p className="mt-1 text-xs text-zinc-400">Available to schedule: {money(detailCollector.availableToSchedule)}</p></div>
            </div>
            <div className="px-5 pb-5"><div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-zinc-900">Payment history</h4><StatusBadge status={detailCollector.pending <= 0 ? "Paid" : "Pending"} /></div><div className="max-h-64 space-y-2 overflow-y-auto">{historyLoading ? <p className="py-6 text-center text-sm text-zinc-400">Loading history…</p> : collectorHistory.length ? renderPayoutRows(collectorHistory) : <p className="rounded-xl bg-zinc-50 py-6 text-center text-sm text-zinc-400">No payout transactions yet.</p>}</div></div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 p-5"><button onClick={() => openFullHistory(detailCollector)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600">Full history</button><button onClick={() => openPay(detailCollector)} disabled={detailCollector.availableToSchedule <= 0} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"><Plus size={16} /> Create payout draft</button></div>
          </div>
        </div>
      )}

      {modalCollector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalCollector(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-zinc-100 p-5"><div><h3 className="text-lg font-semibold text-zinc-900">Create payout draft</h3><p className="mt-1 text-sm text-zinc-500">{modalCollector.username} · {modalCollector.email || modalCollector.id}</p></div><button onClick={() => setModalCollector(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"><X size={18} /></button></div>
            <form onSubmit={submitPayment} className="space-y-4 p-5">
              <div className="rounded-xl bg-zinc-50 p-4"><div className="flex justify-between text-sm"><span className="text-zinc-500">Available to schedule</span><b className="text-zinc-900">{money(modalCollector.availableToSchedule)}</b></div><p className="mt-1 text-xs text-zinc-400">This creates a pending draft. It does not record payment as paid.</p></div>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Amount (₹)</span><input type="number" min="0.01" max={modalCollector.availableToSchedule} step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Admin note (optional)</span><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add a note for this payout" className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" /></label>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setModalCollector(null)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600">Cancel</button><button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{submitting ? "Creating…" : "Create payout draft"}</button></div>
            </form>
          </div>
        </div>
      )}

      {payingPayout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setPayingPayout(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-zinc-100 p-5"><div><h3 className="text-lg font-semibold text-zinc-900">Mark payout as paid</h3><p className="mt-1 text-sm text-zinc-500">{money(payingPayout.amount)} · {payingPayout.collector}</p></div><button onClick={() => setPayingPayout(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"><X size={18} /></button></div>
            <form onSubmit={submitMarkPaid} className="space-y-4 p-5">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Payment method</span><select required value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"><option>UPI</option><option>Bank Transfer</option><option>Manual / Cash</option></select></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Transaction reference</span><input  value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="Optional UPI ID / bank transaction ID" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Admin note (optional)</span><textarea rows={2} value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" /></label>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setPayingPayout(null)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm">Cancel</button><button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm text-white disabled:opacity-50">{submitting ? "Saving…" : "Confirm paid"}</button></div>
            </form>
          </div>
        </div>
      )}

      {editingPayout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingPayout(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-zinc-100 p-5"><div><h3 className="text-lg font-semibold text-zinc-900">Edit payout draft</h3><p className="mt-1 text-sm text-zinc-500">{editingPayout.id} · {editingPayout.collector}</p></div><button onClick={() => setEditingPayout(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"><X size={18} /></button></div>
            <form onSubmit={submitEdit} className="space-y-4 p-5">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Amount (₹)</span><input type="number" min="0.01" step="0.01" required value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-zinc-700">Admin note</span><textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" /></label>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingPayout(null)} className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm">Cancel</button><button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm text-white disabled:opacity-50">{submitting ? "Saving…" : "Save changes"}</button></div>
            </form>
          </div>
        </div>
      )}

      {historyCollector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistoryCollector(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 p-5"><div><h3 className="font-semibold text-zinc-900">Payout history</h3><p className="mt-1 text-xs text-zinc-500">{historyCollector.username} · {historyCollector.email || historyCollector.id}</p></div><button onClick={() => setHistoryCollector(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"><X size={18} /></button></div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">{historyLoading ? <p className="py-8 text-center text-sm text-zinc-400">Loading payout history…</p> : collectorHistory.length ? renderPayoutRows(collectorHistory) : <p className="py-8 text-center text-sm text-zinc-400">No payout history yet.</p>}</div>
          </div>
        </div>
      )}
    </div>
  );
}

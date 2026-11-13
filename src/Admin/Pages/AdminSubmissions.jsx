import { useState, useMemo, useEffect, useCallback } from "react";
import AdminSidebar from "../../components/admin/adminsidebar";
import { useNavigate } from "react-router-dom";
import { getStoredUser, logout } from "../../api/authservice";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  getAdminSubmissions,
  getAdminSubmissionStats,
  approveSubmission,
  rejectSubmission,
  dismissDuplicateFlag,
} from "../../api/adminsubmissionservice";
import { toast } from "sonner";
import {
  Search,
  CalendarDays,
  RefreshCw,
  Download,
  ChevronDown,
  Eye,
  MapPin,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Users,
  FileCheck,
  X,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  ShieldCheck,
  LocateFixed,
  Check,
  Ban,
  Menu,
  Bell,
  CircleUserRound,
} from "lucide-react";

const normalizeSubmission = (item) => {
  const user = item.user || item.collector || {};
  const location = item.location || {};
  const photos = Array.isArray(item.photos) ? item.photos : [];
  const activeFlags = (item.duplicateFlags || []).filter(
    (flag) => flag.status === "pending_review"
  );
  const firstFlag = activeFlags[0];

  return {
    ...item,
    id: item._id || item.id,
    businessName: item.businessName || "Unnamed Business",
    mobileNumber: item.mobileNumber || "",
    placeName: item.placeName || "Location not available",
    collector: user.name || user.fullName || user.username || "Unknown Collector",
    collectorEmail: user.email || "",
    date: item.createdAt || item.date,
photos: photos
  .map((photo) =>
    typeof photo === "string"
      ? photo
      : photo?.url
        ? `${import.meta.env.VITE_API_BASE_URL}${photo.url}`
        : null
  )
  .filter(Boolean),    latitude: location.latitude ?? item.latitude ?? "—",
    longitude: location.longitude ?? item.longitude ?? "—",
    accuracy: location.accuracy ?? item.accuracy ?? "—",
    status: (item.status || "pending").toLowerCase().replace(/^./, (char) => char.toUpperCase()),
    remarks: item.remarks || "",
    duplicateFlags: activeFlags,
    duplicateType: firstFlag
      ? firstFlag.type === "perceptual"
        ? "Similar Image (pHash)"
        : firstFlag.type.toUpperCase()
      : "No Duplicate",
    duplicate: firstFlag
      ? {
          flagId: firstFlag._id,
          matchedId: firstFlag.matchedSubmission?._id || firstFlag.matchedSubmission || "Matched submission",
          matchedBusiness: firstFlag.matchedSubmission?.businessName || "Matched business",
          reason: firstFlag.details || "Potential duplicate detected.",
        }
      : null,
  };
};

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.response?.data?.error || error.message || "Something went wrong.";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const StatusBadge = ({ status }) => {
  const styles = {
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
  };

  const icons = {
    Pending: Clock,
    Approved: CheckCircle2,
    Rejected: XCircle,
  };

  const Icon = icons[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <Icon size={13} />
      {status}
    </span>
  );
};

const DuplicateBadge = ({ type }) => {
  if (type === "No Duplicate") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <ShieldCheck size={14} />
        No Duplicate
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
      <AlertTriangle size={13} />
      {type}
    </span>
  );
};

const StatCard = ({
  title,
  value,
  percentage,
  positive,
  icon: Icon,
  iconStyle,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
          {value}
        </h3>
      </div>

      <div className={`rounded-xl p-3 ${iconStyle}`}>
        <Icon size={21} />
      </div>
    </div>

    <div className="mt-4 flex items-center gap-1.5 text-xs">
      {positive ? (
        <ArrowUpRight size={15} className="text-emerald-600" />
      ) : (
        <ArrowDownRight size={15} className="text-red-500" />
      )}

      <span
        className={`font-semibold ${
          positive ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {percentage}
      </span>

      <span className="text-gray-400">vs last week</span>
    </div>
  </div>
);

/* Dashboard-style responsive topbar */
function SubmissionsTopbar({ onMenu, search, onSearch, user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="admin-sidebar"
        className="-ml-2 rounded-lg p-2.5 text-zinc-600 transition hover:bg-zinc-100 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="relative min-w-0 max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search submissions..."
          aria-label="Search submissions"
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
        />
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="rounded-xl p-2.5 text-zinc-500 transition hover:bg-zinc-100"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 items-center gap-2 border-l border-zinc-200 pl-3">
        <CircleUserRound className="h-8 w-8 shrink-0 text-zinc-400" aria-hidden="true" />
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium text-zinc-800">
            {user?.name || user?.fullName || user?.email || "Admin"}
          </p>
          <button type="button" onClick={onLogout} className="text-xs text-zinc-500 hover:text-zinc-800">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [dateFilter, setDateFilter] = useState("All dates");
const handleDownloadAllPhotos = async () => {
  try {
    const zip = new JSZip();

    await Promise.all(
      selectedSubmission.photos.map(async (photo, index) => {
        const response = await fetch(photo);

        if (!response.ok) {
          throw new Error(`Failed to download photo ${index + 1}`);
        }

        const blob = await response.blob();

        zip.file(`photo-${index + 1}.jpg`, blob);
      })
    );

    const content = await zip.generateAsync({ type: "blob" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `${selectedSubmission.businessName}-photos.zip`;
    link.click();

    URL.revokeObjectURL(link.href);
  } catch (error) {
    toast.error("Failed to download photos.");
  }
};
  const fetchSubmissions = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const result = await getAdminSubmissions({ limit: 100 });
      const list = Array.isArray(result)
        ? result
        : result?.submissions || result?.data?.submissions || result?.data || [];
      setSubmissions(list.map(normalizeSubmission));
      const statsResult = await getAdminSubmissionStats();
      setStats(statsResult?.stats || statsResult?.data?.stats || statsResult?.data || statsResult);
      if (showToast) toast.success("Submissions refreshed.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

 const counts = useMemo(
  () => ({
    Pending: Number(
      stats?.pending ??
        submissions.filter((s) => s.status === "Pending").length
    ),

    Approved: Number(
      stats?.approved ??
        submissions.filter((s) => s.status === "Approved").length
    ),

    Rejected: Number(
      stats?.rejected ??
        submissions.filter((s) => s.status === "Rejected").length
    ),

    "Duplicate Pending": submissions.filter(
      (s) => s.status === "Pending" && s.duplicate
    ).length,
  }),
  [stats, submissions]
);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
const matchesStatus =
  activeTab === "Duplicate Pending"
    ? submission.status === "Pending" && !!submission.duplicate
    : submission.status === activeTab;
          const query = search.toLowerCase();
      const matchesSearch =
        submission.businessName.toLowerCase().includes(query) ||
        submission.collector.toLowerCase().includes(query) ||
        String(submission.id).toLowerCase().includes(query) ||
        submission.placeName.toLowerCase().includes(query);
      const submissionDate = submission.date
        ? new Date(submission.date).toISOString().split("T")[0]
        : "";
      const matchesDate =
        dateFilter === "All dates" ||
        (dateFilter === "Today" && submissionDate === new Date().toISOString().split("T")[0]);
      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [submissions, activeTab, search, dateFilter]);

  const updateSubmission = async (id, updates) => {
    try {
      setActionLoading(true);
      if (updates.status === "Approved") {
        await approveSubmission(id, { reviewFeedback: "" });
        toast.success("Submission approved.");
      } else if (updates.status === "Rejected") {
        await rejectSubmission(id, { reviewFeedback: "" });
        toast.success("Submission rejected.");
      }
      setSelectedSubmission(null);
      await fetchSubmissions();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismissDuplicate = async () => {
    const flagId = selectedSubmission?.duplicate?.flagId;
    if (!flagId) return;
    try {
      setActionLoading(true);
      await dismissDuplicateFlag(selectedSubmission.id, flagId);
      toast.success("Duplicate warning dismissed.");
      setSelectedSubmission(null);
      await fetchSubmissions();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

const exportExcel = () => {
  try {
    const rows = filteredSubmissions.map((s) => ({
      "Submission ID": s.id,
      "Business Name": s.businessName,
      "Mobile Number": s.mobileNumber || "",
      "Place Name": s.placeName,
      "Full Address": s.address?.fullAddress || "",
      "Collector": s.collector,
      "Latitude": s.latitude,
      "Longitude": s.longitude,
      "GPS Accuracy": s.accuracy,
      "Photos Count": s.photos.length,
      "Remarks": s.remarks,
      "Submitted Date": s.date
        ? new Date(s.date).toLocaleString("en-IN")
        : "",
      "Status": s.status,
      "Duplicate Warning": s.duplicateType,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 25 },
      { wch: 25 },
      { wch: 16 },
      { wch: 25 },
      { wch: 40 },
      { wch: 22 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 35 },
      { wch: 22 },
      { wch: 15 },
      { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Submissions"
    );

    XLSX.writeFile(workbook, "NME-Submissions.xlsx");

    toast.success("Excel file downloaded successfully.");
  } catch (error) {
    console.error("Excel export error:", error);
    toast.error("Failed to export Excel file.");
  }
};

const tabs = [
  "Pending",
  "Duplicate Pending",
  "Approved",
  "Rejected",
]; const navigate = useNavigate();
  const user = getStoredUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Signed out.");
    navigate("/login", { replace: true });
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

  return (
      <div className="min-h-screen bg-[#fafafa] text-zinc-900 antialiased">
      <AdminSidebar
        active="submissions"
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
        onLogout={handleLogout}
        badges={{ submissions: counts.Pending }}
      />

      <div className="lg:pl-64">
        <SubmissionsTopbar
          onMenu={() => setMobileOpen(true)}
          search={search}
          onSearch={setSearch}
          user={user}
          onLogout={handleLogout}
        />

        <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Admin</span>
              <span>/</span>
              <span className="text-gray-600">Submissions</span>
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
              Submissions
            </h1>

            <p className="mt-1.5 text-sm text-gray-500">
              Review and manage business data collected by your team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchSubmissions(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
onClick={exportExcel}              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700"
            >
              <Download size={15} />
              Export Excel
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Submissions"
            value={Number(stats?.total ?? stats?.totalSubmissions ?? submissions.length)}
            percentage="—"
            positive
            icon={Building2}
            iconStyle="bg-blue-50 text-blue-600"
          />

          <StatCard
            title="Pending Reviews"
            value={counts.Pending}
            percentage="—"
            positive={false}
            icon={Clock}
            iconStyle="bg-amber-50 text-amber-600"
          />

          <StatCard
            title="Approved"
            value={counts.Approved}
            percentage="—"
            positive
            icon={FileCheck}
            iconStyle="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Rejected"
            value={counts.Rejected}
            percentage="—"
            positive={false}
            icon={XCircle}
            iconStyle="bg-red-50 text-red-500"
          />
        </div>

        {/* Main Table Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* Tabs */}
          <div className="flex flex-col justify-between gap-4 border-b border-gray-100 px-5 pt-5 sm:flex-row sm:items-center sm:px-6">
            <div className="flex gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex shrink-0 items-center gap-2 pb-4 text-sm font-medium transition ${
                    activeTab === tab
                      ? "text-gray-900"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {tab}

                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${
                      activeTab === tab
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {counts[tab]}
                  </span>

                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-gray-900" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pb-4 sm:pb-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search submissions..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-gray-400 focus:bg-white sm:w-60"
                />
              </div>

              <div className="relative">
                <CalendarDays
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-8 text-sm text-gray-600 outline-none focus:border-gray-400"
                >
                  <option>All dates</option>
                  <option>Today</option>
                </select>

                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Business
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Collector
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Submitted
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Photos
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Duplicate Check
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Status
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-500">Loading submissions...</td></tr>
                ) : filteredSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="transition hover:bg-gray-50/70"
                  >
                    {/* Business */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                          <Building2 size={18} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {submission.businessName}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {submission.id}
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={12} />
                            {submission.placeName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Collector */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                          {submission.collector
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {submission.collector}
                          </p>

                          <p className="text-xs text-gray-400">
                            {submission.collectorEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {formatDate(submission.date)}
                      </p>
                    </td>

                    {/* Photos */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ImageIcon size={15} className="text-gray-400" />
                        {submission.photos.length} photos
                      </div>
                    </td>

                    {/* Duplicate */}
                    <td className="px-6 py-4">
                      <DuplicateBadge type={submission.duplicateType} />
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusBadge status={submission.status} />
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                      >
                        <Eye size={14} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && filteredSubmissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                        <Search size={20} />
                      </div>

                      <p className="mt-4 text-sm font-medium text-gray-700">
                        No submissions found
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        Try adjusting your search or filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center">
            <p className="text-xs text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-600">
                {filteredSubmissions.length}
              </span>{" "}
              submissions
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-400"
              >
                Previous
              </button>

              <button className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white">
                1
              </button>

              <button
                disabled
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-400"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-medium text-gray-400">
                  {selectedSubmission.id}
                </p>

                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  Review Submission
                </h2>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              {/* Business Details */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedSubmission.businessName}
                    </h3>

                    <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin size={14} />
                      {selectedSubmission.placeName}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
  {selectedSubmission.address?.fullAddress || "Full address not available"}
</p>
                  </div>

                  <StatusBadge status={selectedSubmission.status} />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Collector</p>
                    <p className="mt-1 text-sm font-medium text-gray-800">
                      {selectedSubmission.collector}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {selectedSubmission.collectorEmail}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Submission Date</p>
                    <p className="mt-1 text-sm font-medium text-gray-800">
                      {formatDate(selectedSubmission.date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duplicate Warning */}
              {selectedSubmission.duplicate && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-orange-100 p-2 text-orange-600">
                      <AlertTriangle size={18} />
                    </div>

                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-orange-800">
                        Duplicate Warning Detected
                      </h4>

                      <p className="mt-1 text-sm text-orange-700">
                        {selectedSubmission.duplicate.reason}
                      </p>

                      <div className="mt-3 rounded-lg border border-orange-200 bg-white/70 p-3">
                        <p className="text-xs text-orange-500">
                          Matched Submission
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {selectedSubmission.duplicate.matchedBusiness}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {selectedSubmission.duplicate.matchedId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Gallery */}
              <div>
             <div className="mb-3 flex items-center justify-between">
  <h3 className="text-sm font-semibold text-gray-800">
    Submitted Photos
  </h3>

  <button
    onClick={handleDownloadAllPhotos}
    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
  >
    <Download size={14} />
    Download All
  </button>
</div>
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
  {selectedSubmission.photos.map((photo, index) => (
    <div
      key={index}
      className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
    >
      {/* Image Preview */}
      <img
        src={photo}
        alt={`Submission photo ${index + 1}`}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(e) => {
          console.error("Image failed to load:", photo);
          e.currentTarget.style.display = "none";
        }}
      />

      {/* Download Button */}
      <a
        href={photo}
        download={`photo-${index + 1}.jpg`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 top-2 rounded-lg bg-black/70 p-2 text-white hover:bg-black"
        title="Download photo"
      >
        <Download size={15} />
      </a>

      {/* Photo Label */}
      <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        Photo {index + 1}
      </span>
    </div>
  ))}
</div>
              </div>

              {/* GPS Details */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-800">
                  Location Details
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400">Latitude</p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {selectedSubmission.latitude}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400">Longitude</p>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {selectedSubmission.longitude}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-400">GPS Accuracy</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <LocateFixed size={14} />
                      {selectedSubmission.accuracy} metres
                    </p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">
                  Collector Remarks
                </h3>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm leading-relaxed text-gray-600">
                    {selectedSubmission.remarks || "No remarks provided."}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
              <button
                onClick={handleDismissDuplicate}
                disabled={!selectedSubmission.duplicate || actionLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Ban size={15} />
                Dismiss Warning
              </button>

             <div className="flex flex-wrap gap-2">
  {selectedSubmission.status === "Pending" && (
    <>
      {selectedSubmission.duplicate && (
        <button
          disabled={actionLoading}
          onClick={() =>
            updateSubmission(selectedSubmission.id, {
              status: "Rejected",
            })
          }
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
        >
          <AlertTriangle size={15} />
          Confirm Duplicate
        </button>
      )}

      <button
        disabled={actionLoading}
        onClick={() =>
          updateSubmission(selectedSubmission.id, {
            status: "Rejected",
          })
        }
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        <XCircle size={15} />
        Reject
      </button>

      <button
        disabled={actionLoading}
        onClick={() =>
          updateSubmission(selectedSubmission.id, {
            status: "Approved",
          })
        }
        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
      >
        <Check size={15} />
        Approve
      </button>
    </>
  )}

  {selectedSubmission.status !== "Pending" && (
    <span className="text-sm text-gray-500">
      This submission has already been reviewed.
    </span>
  )}
</div>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
  );
}

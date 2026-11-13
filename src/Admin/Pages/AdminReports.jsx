import { useCallback, useEffect, useMemo, useState } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import {
  Menu, Bell, CircleUserRound, Search, Download, Building2,
  CheckCircle2, Clock3, XCircle, MapPin, FileSpreadsheet,
  Eye, ShieldAlert, RotateCcw, Loader2,
} from "lucide-react";
import {
  getAdminReportsOverview,
  searchAdminReports,
  getAdminSubmissionTrends,
  getAdminStateWiseCollection,
  getAdminCollectorPerformance,
  getAdminDuplicateStats,
  getAdminReportLocations
} from "../../api/adminreportservice";
import usePendingSubmissionsCount from "../../hooks/usePendingSubmissionCount";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

const indianStatesAndUTs = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const numberFormat = (value) => Number(value || 0).toLocaleString("en-IN");
const getInitials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

export default function AdminReports() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [collector, setCollector] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState("30days");
const [statesFromBackend, setStatesFromBackend] = useState([]);
const [districtsByState, setDistrictsByState] = useState({});
  const [overview, setOverview] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [trends, setTrends] = useState([]);
  const [stateData, setStateData] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [duplicateStats, setDuplicateStats] = useState({
    totalDuplicates: 0, exactImageMatches: 0, similarImages: 0, ocrMatches: 0, gpsMatches: 0,
  });
  const [searchResults, setSearchResults] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState("");
const { pendingCount } = usePendingSubmissionsCount();

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleNavigate = (path) => {
    window.location.href = path;
  };

  const loadDashboard = useCallback(async (range = dateRange) => {
    setLoadingDashboard(true);
    setError("");
    try {
      const [overviewRes, trendsRes, stateRes, collectorsRes, duplicatesRes] =
        await Promise.all([
          getAdminReportsOverview({ dateRange: range }),
          getAdminSubmissionTrends({ months: 6 }),
          getAdminStateWiseCollection({ dateRange: range }),
          getAdminCollectorPerformance({ dateRange: range }),
          getAdminDuplicateStats({ dateRange: range }),
        ]);

      setOverview(overviewRes?.data || overviewRes || {});
      setTrends(trendsRes?.data || []);
      setStateData(stateRes?.data || []);
      setCollectors(collectorsRes?.data || []);
      setDuplicateStats(duplicatesRes?.data || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load reports. Please try again.");
    } finally {
      setLoadingDashboard(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadDashboard(dateRange);
  }, [dateRange, loadDashboard]);

  useEffect(() => {
  const fetchLocations = async () => {
    try {
      const response = await getAdminReportLocations();

      const data = response?.data?.data || response?.data;

      setStatesFromBackend(data?.states || []);
      setDistrictsByState(data?.districtsByState || {});
    } catch (error) {
      console.error("Failed to fetch submission locations:", error);
    }
  };

  fetchLocations();
}, []);
  const handleSearch = async (page = 1) => {
    setLoadingSearch(true);
    setError("");
    try {
      const response = await searchAdminReports({
        search: search.trim(),
        state,
        district: district.trim(),
        collector,
        status,
        dateRange,
        page,
        limit: 10,
      });
      setSearchResults(response?.data || []);
      setPagination(response?.pagination || { total: 0, page, limit: 10, totalPages: 0 });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to search submissions.");
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setState("");
    setDistrict("");
    setCollector("");
    setStatus("");
    setDateRange("30days");
    setSearchResults([]);
    setPagination({ total: 0, page: 1, limit: 10, totalPages: 0 });
  };

  const handleExport = () => {
    if (!searchResults.length) {
      window.alert("Run Smart Search first to export the results.");
      return;
    }

    const headers = ["Submission ID", "Business Name", "Collector", "State", "District", "Status", "Created At"];
    const rows = searchResults.map((item) => [
      item._id,
      item.businessName || "",
      item.user?.username || "",
      item.address?.state || "",
      item.address?.district || "",
      item.status || "",
      item.createdAt ? new Date(item.createdAt).toISOString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nme-reports-submissions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxTrend = useMemo(
    () => Math.max(1, ...trends.map((item) => Number(item.total || 0))),
    [trends]
  );
  const maxStateCount = useMemo(
    () => Math.max(1, ...stateData.map((item) => Number(item.count || 0))),
    [stateData]
  );

  const statCards = [
    { title: "Total Submissions", value: overview.total, icon: Building2, color: "indigo", note: "Submissions in selected period" },
    { title: "Approved Listings", value: overview.approved, icon: CheckCircle2, color: "emerald", note: "Approved submissions" },
    { title: "Pending Review", value: overview.pending, icon: Clock3, color: "amber", note: "Awaiting review" },
    { title: "Rejected Listings", value: overview.rejected, icon: XCircle, color: "rose", note: "Rejected submissions" },
  ];

  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminSidebar
        user={getStoredUser()}
        onLogout={handleLogout}
        active="reports"
        onNavigate={handleNavigate}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
                badges={{ submissions: pendingCount }}

      />

      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden">
              <Menu size={21} />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900">Reports & Analytics</h1>
              <p className="hidden text-xs text-zinc-500 sm:block">NME Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50">
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
            </button>
            <div className="flex items-center gap-2 border-l border-zinc-200 pl-3">
              <CircleUserRound size={22} className="text-zinc-500" />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-zinc-800">Admin</p>
                <p className="text-xs text-zinc-500">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">Reports & Analytics</h2>
              <p className="mt-1 text-sm text-zinc-500">Search submissions and monitor collection performance.</p>
            </div>
            <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50">
              <Download size={16} /> Export CSV
            </button>
          </section>

          {error && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{error}</span>
              <button onClick={() => loadDashboard(dateRange)} className="font-medium underline">Retry</button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-zinc-500">{item.title}</p>
                      <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
                        {loadingDashboard ? <Loader2 className="animate-spin" size={22} /> : numberFormat(item.value)}
                      </h3>
                    </div>
                    <div className={`rounded-xl p-3 ${colors[item.color]}`}><Icon size={20} /></div>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">{item.note}</p>
                </div>
              );
            })}
          </section>

          {/* Smart Search */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 p-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><Search size={18} /></div>
                  <h3 className="font-semibold text-zinc-900">Smart Search</h3>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Find business submissions using multiple filters.</p>
              </div>
              <button onClick={resetFilters} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-indigo-600">
                <RotateCcw size={14} /> Reset filters
              </button>
            </div>

            <form
              className="space-y-4 p-5"
              onSubmit={(event) => { event.preventDefault(); handleSearch(1); }}
            >
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">Search Business</label>
                <div className="relative">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Business name, place name, submission ID..." className={`${inputClass} pl-10`} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-600">State</label>
               <select
  value={state}
  onChange={(e) => {
    setState(e.target.value);
    setDistrict("");
  }}
  className={inputClass}
>
  <option value="">All States</option>

  {statesFromBackend.map((stateName) => (
    <option key={stateName} value={stateName}>
      {stateName}
    </option>
  ))}
</select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-600">District</label>
<select
  value={district}
  onChange={(e) => setDistrict(e.target.value)}
  disabled={!state}
  className={inputClass}
>
  <option value="">All Districts</option>

  {(districtsByState[state] || []).map((districtName) => (
    <option key={districtName} value={districtName}>
      {districtName}
    </option>
  ))}
</select>              </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-600">Collector</label>
                  <select value={collector} onChange={(event) => setCollector(event.target.value)} className={inputClass}>
                    <option value="">All Collectors</option>
                    {collectors.map((item) => (
                      <option key={item.collectorId} value={item.collectorId}>
                        {item.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-600">Status</label>
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
                    <option value="">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-600">Date Range</label>
                  <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className={inputClass}>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loadingSearch} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60">
                  {loadingSearch ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {loadingSearch ? "Searching..." : "Search Listings"}
                </button>
              </div>
            </form>
          </section>

          {/* Search results */}
          {searchResults.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5">
                <div>
                  <h3 className="font-semibold text-zinc-900">Search Results</h3>
                  <p className="mt-1 text-xs text-zinc-500">{numberFormat(pagination.total)} submissions found</p>
                </div>
                <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
                  <FileSpreadsheet size={15} /> Export Results
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-zinc-50">
                    <tr className="text-xs font-medium text-zinc-500">
                      <th className="px-5 py-3">Business</th><th className="px-5 py-3">Collector</th>
                      <th className="px-5 py-3">Location</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {searchResults.map((item) => (
                      <tr key={item._id} className="hover:bg-zinc-50/70">
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-zinc-800">{item.businessName || "Unnamed Business"}</p>
                          <p className="text-xs text-zinc-500">{item.placeName || ""}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-700">{item.user?.username || "—"}</td>
                        <td className="px-5 py-4 text-sm text-zinc-700">{[item.address?.district, item.address?.state].filter(Boolean).join(", ") || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            item.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                            item.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                          }`}>{item.status}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-zinc-500">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-5 py-4 text-xs text-zinc-500">{item._id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
                  <p className="text-xs text-zinc-500">Page {pagination.page} of {pagination.totalPages}</p>
                  <div className="flex gap-2">
                    <button disabled={pagination.page <= 1 || loadingSearch} onClick={() => handleSearch(pagination.page - 1)} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
                    <button disabled={pagination.page >= pagination.totalPages || loadingSearch} onClick={() => handleSearch(pagination.page + 1)} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Analytics */}
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div>
                <h3 className="font-semibold text-zinc-900">Submission Trends</h3>
                <p className="mt-1 text-xs text-zinc-500">Monthly submission activity (last 6 months)</p>
              </div>
              <div className="mt-8 flex h-56 items-end justify-between gap-3 border-b border-zinc-100 px-2">
                {trends.map((item) => {
                  const monthLabel = new Date(item.year, item.month - 1, 1).toLocaleDateString("en-IN", { month: "short" });
                  const height = (Number(item.total || 0) / maxTrend) * 100;
                  return (
                    <div key={`${item.year}-${item.month}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-[10px] font-medium text-zinc-500">{numberFormat(item.total)}</span>
                      <div className="w-full max-w-12 rounded-t-lg bg-indigo-500 transition-all hover:bg-indigo-600" style={{ height: `${height}%` }} />
                      <span className="mb-2 text-xs text-zinc-500">{monthLabel}</span>
                    </div>
                  );
                })}
                {!trends.length && <p className="mb-8 w-full text-center text-sm text-zinc-400">No trend data available.</p>}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Total Submissions</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-zinc-900">State-wise Collection</h3>
              <p className="mt-1 text-xs text-zinc-500">Submissions by state / UT</p>
              <div className="mt-6 space-y-5">
                {stateData.map((item) => (
                  <div key={item.state}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-700">{item.state}</span>
                      <span className="text-xs text-zinc-500">{numberFormat(item.count)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(Number(item.count || 0) / maxStateCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {!stateData.length && <p className="text-sm text-zinc-400">No state collection data.</p>}
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-zinc-500"><MapPin size={14} /> Live database aggregation</div>
            </div>
          </section>

          {/* Collector Performance */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-zinc-100 p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-zinc-900">Collector Performance</h3>
                <p className="mt-1 text-xs text-zinc-500">Submission and approval statistics</p>
              </div>
              <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
                <FileSpreadsheet size={15} /> Export Report
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-zinc-50">
                  <tr className="text-xs font-medium text-zinc-500">
                    <th className="px-5 py-3.5">Collector</th><th className="px-5 py-3.5">Total</th><th className="px-5 py-3.5">Approved</th>
                    <th className="px-5 py-3.5">Pending</th><th className="px-5 py-3.5">Rejected</th><th className="px-5 py-3.5">Approval Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {collectors.map((item) => (
                    <tr key={item.collectorId} className="hover:bg-zinc-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">{getInitials(item.username)}</div>
                          <span className="text-sm font-medium text-zinc-800">{item.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-700">{numberFormat(item.total)}</td>
                      <td className="px-5 py-4 text-sm text-emerald-600">{numberFormat(item.approved)}</td>
                      <td className="px-5 py-4 text-sm text-amber-600">{numberFormat(item.pending)}</td>
                      <td className="px-5 py-4 text-sm text-rose-600">{numberFormat(item.rejected)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Number(item.approvalRate || 0)}%` }} />
                          </div>
                          <span className="text-xs font-medium text-zinc-600">{Number(item.approvalRate || 0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!collectors.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-400">No collector performance data.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* Duplicate Detection */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-3 text-amber-600"><ShieldAlert size={20} /></div>
                <div>
                  <h3 className="font-semibold text-zinc-900">Duplicate Detection Overview</h3>
                  <p className="mt-1 text-xs text-zinc-500">Potentially reused images and business information.</p>
                </div>
              </div>
              <button onClick={() => handleSearch(1)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
                <Eye size={15} /> Review Search Results
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-xs font-medium text-zinc-500">Total Duplicates</p>
                <p className="mt-2 text-2xl font-bold text-amber-600">{loadingDashboard ? "…" : numberFormat(duplicateStats.totalDuplicates)}</p>
                <p className="mt-1 text-xs text-zinc-400">Unique submissions flagged</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">Exact Image Matches</p>
                <p className="mt-2 text-xl font-bold text-zinc-900">{loadingDashboard ? "…" : numberFormat(duplicateStats.exactImageMatches)}</p>
                <p className="mt-1 text-xs text-zinc-400">SHA-256</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">Similar Images</p>
                <p className="mt-2 text-xl font-bold text-zinc-900">{loadingDashboard ? "…" : numberFormat(duplicateStats.similarImages)}</p>
                <p className="mt-1 text-xs text-zinc-400">pHash matching</p>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">OCR Matches</p>
                <p className="mt-2 text-xl font-bold text-zinc-900">{loadingDashboard ? "…" : numberFormat(duplicateStats.ocrMatches)}</p>
                <p className="mt-1 text-xs text-zinc-400">Business name / phone</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

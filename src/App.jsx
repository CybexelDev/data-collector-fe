import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./Pages/Login";
import AdminDashboard from "./Admin/Pages/AdminDashboard";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Dashboard from "./Pages/Dashboard";
import AddListing from "./Pages/AddListing";
import Submissions from "./Pages/Submissions";
import Earnings from "./Pages/Earnings";
import Profile from "./Pages/Profile";
import { getSession, roleHome } from "./api/authservice";
import AdminSubmissions from "./Admin/Pages/AdminSubmissions";
import AdminCollectors from "./Admin/Pages/AdminCollectors";
import AdminPayouts from "./Admin/Pages/AdminPayouts";
import AdminSettings from "./Admin/Pages/AdminSettings";
import AdminReports from "./Admin/Pages/AdminReports";
// UX guard only. Real security is enforced by backend middleware.
function RequireRole({ role, children }) {
  const user = getSession();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={roleHome(user.role) || "/login"} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/dashboard"
        element={<AdminDashboard />}
      />
      <Route path="/admin/submissions" element={<AdminSubmissions/>}/>
      <Route path="/admin/collectors" element={<AdminCollectors/>}/>
      <Route path="/admin/payouts" element={<AdminPayouts/>}/>
      <Route
  path="/admin/settings"
  element={<AdminSettings />}
/>

<Route
  path="/admin/reports"
  element={<AdminReports />}
/>
      <Route element={<RequireRole role="user"><DashboardLayout /></RequireRole>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-listing" element={<AddListing />} />
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
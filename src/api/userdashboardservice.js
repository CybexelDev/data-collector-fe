
import api from "./api";

// Collector: Get dashboard stats and recent submissions
export const getUserDashboard = async () => {
  const response = await api.get("/api/user/dashboard");
  return response.data;
};

import api from "../api/api";

export const getDashboardStats = async () => {
  const response = await api.get("/api/admin/dashboard/stats");
  return response.data;
};

export const getSubmissionsChart = async (period = "7days") => {
  const response = await api.get("/api/admin/dashboard/submissions-chart", {
    params: { period },
  });
  return response.data;
};

export const getSubmissionStatus = async () => {
  const response = await api.get("/api/admin/dashboard/submission-status");
  return response.data;
};

export const getRecentSubmissions = async (limit = 10) => {
  const response = await api.get("/api/admin/dashboard/recent-submissions", {
    params: { limit },
  });
  return response.data;
};

export const getTopCollectors = async (limit = 5) => {
  const response = await api.get("/api/admin/dashboard/top-collectors", {
    params: { limit },
  });
  return response.data;
};

export const getRecentActivity = async (limit = 10) => {
  const response = await api.get(
    "/api/admin/dashboard/recent-activity",
    {
      params: { limit },
    }
  );

  return response.data;
};

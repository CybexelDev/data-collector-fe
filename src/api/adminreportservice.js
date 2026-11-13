import api from "./api";

// Admin: Get reports overview statistics
export const getAdminReportsOverview = async (params = {}) => {
  const response = await api.get("/api/admin/reports/overview", {
    params,
  });

  return response.data;
};

// Admin: Smart search submissions
export const searchAdminReports = async (params = {}) => {
  const response = await api.get("/api/admin/reports/search", {
    params,
  });

  return response.data;
};

// Admin: Get submission trends
export const getAdminSubmissionTrends = async (params = {}) => {
  const response = await api.get("/api/admin/reports/trends", {
    params,
  });

  return response.data;
};

// Admin: Get state-wise collection
export const getAdminStateWiseCollection = async (params = {}) => {
  const response = await api.get("/api/admin/reports/state-wise", {
    params,
  });

  return response.data;
};

// Admin: Get collector performance
export const getAdminCollectorPerformance = async (params = {}) => {
  const response = await api.get(
    "/api/admin/reports/collector-performance",
    {
      params,
    }
  );

  return response.data;
};

// Admin: Get duplicate detection statistics
export const getAdminDuplicateStats = async (params = {}) => {
  const response = await api.get("/api/admin/reports/duplicates", {
    params,
  });

  return response.data;
};

export const getAdminReportLocations = () =>
  api.get("/api/admin/reports/locations");
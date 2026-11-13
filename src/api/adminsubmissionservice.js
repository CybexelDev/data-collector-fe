import api from "./api";

// Admin: Get all submissions with filters
export const getAdminSubmissions = async (params = {}) => {
  const response = await api.get("/api/submissions/admin", { params });
  return response.data;
};

// Admin: Get submission statistics
export const getAdminSubmissionStats = async () => {
  const response = await api.get("/api/submissions/admin/stats");
  return response.data;
};

// Admin: Get an individual submission's details
export const getAdminSubmissionById = async (submissionId) => {
  const response = await api.get(`/api/submissions/admin/${submissionId}`);
  return response.data;
};

// Admin: Approve a submission
export const approveSubmission = async (submissionId, payload = {}) => {
  const response = await api.patch(
    `/api/submissions/admin/${submissionId}/approve`,
    payload
  );
  return response.data;
};

// Admin: Reject a submission
export const rejectSubmission = async (submissionId, payload = {}) => {
  const response = await api.patch(
    `/api/submissions/admin/${submissionId}/reject`,
    payload
  );
  return response.data;
};

// Admin: Dismiss a duplicate flag
export const dismissDuplicateFlag = async (submissionId, flagId) => {
  const response = await api.patch(
    `/api/submissions/admin/${submissionId}/duplicates/${flagId}/dismiss`
  );
  return response.data;
};
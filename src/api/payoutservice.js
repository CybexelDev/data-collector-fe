
import api from "./api";

// Collector: Get earnings, balance and payment history
export const getMyPayouts = async () => {
  const response = await api.get("/api/payouts/my");
  return response.data;
};

// Admin: Get all collectors and their payout balances
export const getAllPayouts = async () => {
  const response = await api.get("/api/payouts/admin");
  return response.data;
};

// Admin: Get an individual collector's payout details
export const getCollectorPayouts = async (userId) => {
  const response = await api.get(`/api/payouts/admin/${userId}`);
  return response.data;
};

// Admin: Create a pending payout
export const createPayout = async (payload) => {
  const response = await api.post("/api/payouts/admin", payload);
  return response.data;
};

// Admin: Edit a pending payout
export const updatePayout = async (payoutId, payload) => {
  const response = await api.patch(
    `/api/payouts/admin/${payoutId}`,
    payload
  );
  return response.data;
};

// Admin: Mark payout as paid
export const markPayoutPaid = async (payoutId, payload) => {
  const response = await api.patch(
    `/api/payouts/admin/${payoutId}/paid`,
    payload
  );
  return response.data;
};

// Admin: Cancel a pending payout
export const cancelPayout = async (payoutId) => {
  const response = await api.patch(
    `/api/payouts/admin/${payoutId}/cancel`
  );
  return response.data;
};


export const getAllPayoutHistory = async (params = {}) => {
  const response = await api.get("/api/payouts/admin/history", {
    params,
  });

  return response.data;
};
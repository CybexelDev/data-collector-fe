import api from "./api";

// Get all collectors
export const getAllCollectors = async (params = {}) => {
  const { data } = await api.get("/api/collectors/admin", { params });
  return data;
};

// Create collector
export const createCollector = async (collectorData) => {
  const { data } = await api.post(
    "/api/collectors/admin",
    collectorData
  );
  return data;
};

// Update collector status
export const updateCollectorStatus = async (id, isActive) => {
  const { data } = await api.patch(
    `/api/collectors/admin/${id}/status`,
    { isActive }
  );
  return data;
};
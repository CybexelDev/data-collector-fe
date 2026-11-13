
import api from "./api";

export const createSubmission = async (formData) => {
  const response = await api.post("/api/submissions", formData, {
    timeout: 120000,
  });

  return response.data;
};

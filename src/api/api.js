
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeout: 15000,
});

// Attach bearer token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nme_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

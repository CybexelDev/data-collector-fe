
import { useCallback, useEffect, useState } from "react";
import { getUserDashboard } from "../api/userdashboardservice";

const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getUserDashboard();

      if (response.success) {
        setData(response);
      } else {
        setError(response.message || "Failed to load dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload,
  };
};

export default useDashboardData;

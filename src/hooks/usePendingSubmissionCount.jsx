
import { useState, useEffect } from "react";
import { getAdminSubmissionStats } from "../api/adminsubmissionservice";

export default function usePendingSubmissionsCount() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchPendingCount = async () => {
      try {
        const result = await getAdminSubmissionStats();
console.log("Submission stats API response:", result);

        const stats =
          result?.stats ||
          result?.data?.stats ||
          result?.data ||
          result;

        if (mounted) {
          setPendingCount(Number(stats?.pending ?? 0));
        }
      } catch (error) {
        console.error("Failed to fetch pending submissions count:", error);
      }
    };

    fetchPendingCount();

    // Refresh the count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { pendingCount };
}

import { useState, useEffect } from "react";
import { DashboardData } from "@/types/dashboard";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}

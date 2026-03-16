import React, { useState, useEffect } from "react";
// Icons removed for MVP

interface DashboardStats {
  totalContractors: number;
  totalCustomers: number;
  flaggedCustomers: number;
  activeDisputes: number;
  pendingReviews: number;
  averageClientScore: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContractors: 0,
    totalCustomers: 0,
    flaggedCustomers: 0,
    activeDisputes: 0,
    pendingReviews: 0,
    averageClientScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats from API
    const fetchStats = async () => {
      try {
        // In production, call your API endpoint
        // const response = await fetch('/api/admin/stats');
        // const data = await response.json();
        // setStats(data);

        // Mock data for now
        setStats({
          totalContractors: 1247,
          totalCustomers: 3891,
          flaggedCustomers: 156,
          activeDisputes: 23,
          pendingReviews: 42,
          averageClientScore: 72,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    trend,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    trend?: string;
    color: string;
  }) => (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && <p className="text-xs text-green-400 mt-2">{trend}</p>}
        </div>
        <div className={`${color} p-3 rounded-lg`}>{Icon}</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-slate-400">Platform overview and key metrics</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<div className="text-2xl">👷</div>}
          label="Total Contractors"
          value={stats.totalContractors}
          trend="+12% this month"
          color="bg-blue-600"
        />
        <StatCard
          icon={<div className="text-2xl">👥</div>}
          label="Total Customers"
          value={stats.totalCustomers}
          trend="+8% this month"
          color="bg-green-600"
        />
        <StatCard
          icon={<div className="text-2xl">🚩</div>}
          label="Flagged Customers"
          value={stats.flaggedCustomers}
          trend="4% of total"
          color="bg-red-600"
        />
        <StatCard
          icon={<div className="text-2xl">💬</div>}
          label="Active Disputes"
          value={stats.activeDisputes}
          trend="Avg 5 days to resolve"
          color="bg-yellow-600"
        />
        <StatCard
          icon={<div className="text-2xl">⚠️</div>}
          label="Pending Reviews"
          value={stats.pendingReviews}
          trend="Avg 2 hours to review"
          color="bg-purple-600"
        />
        <StatCard
          icon={<div className="text-2xl">📈</div>}
          label="Avg Client Score"
          value={`${stats.averageClientScore}/100`}
          trend="Healthy platform"
          color="bg-indigo-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/flagged-customers"
            className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-center transition"
          >
            <p className="text-red-400 font-semibold">Review Flagged Customers</p>
            <p className="text-slate-400 text-sm mt-1">{stats.flaggedCustomers} to review</p>
          </a>
          <a
            href="/disputes"
            className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-center transition"
          >
            <p className="text-yellow-400 font-semibold">Manage Disputes</p>
            <p className="text-slate-400 text-sm mt-1">{stats.activeDisputes} active</p>
          </a>
          <a
            href="/review-moderation"
            className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-center transition"
          >
            <p className="text-purple-400 font-semibold">Moderate Reviews</p>
            <p className="text-slate-400 text-sm mt-1">{stats.pendingReviews} pending</p>
          </a>
          <a
            href="/analytics"
            className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg text-center transition"
          >
            <p className="text-blue-400 font-semibold">View Analytics</p>
            <p className="text-slate-400 text-sm mt-1">Platform insights</p>
          </a>
        </div>
      </div>
    </div>
  );
}

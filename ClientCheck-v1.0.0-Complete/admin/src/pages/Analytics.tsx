import React, { useState, useEffect } from "react";

interface AnalyticsData {
  totalReviews: number;
  averageRating: number;
  mostCommonRedFlag: string;
  topContractors: Array<{ name: string; reviews: number }>;
  paymentReliability: { onTime: number; late: number; disputes: number };
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAnalytics({
      totalReviews: 1247,
      averageRating: 3.8,
      mostCommonRedFlag: "Scope Creep",
      topContractors: [
        { name: "Mike's Plumbing", reviews: 156 },
        { name: "Sarah's Electric", reviews: 142 },
        { name: "John's HVAC", reviews: 128 },
      ],
      paymentReliability: {
        onTime: 72,
        late: 18,
        disputes: 10,
      },
    });
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="p-8 text-slate-400">No analytics data available</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Platform Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Total Reviews</p>
          <p className="text-3xl font-bold text-white">{analytics.totalReviews}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Average Rating</p>
          <p className="text-3xl font-bold text-white">{analytics.averageRating}/5</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Most Common Red Flag</p>
          <p className="text-xl font-bold text-red-400">{analytics.mostCommonRedFlag}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm mb-2">Active Contractors</p>
          <p className="text-3xl font-bold text-white">847</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Top Contractors</h2>
          <div className="space-y-3">
            {analytics.topContractors.map((contractor, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-slate-300">{contractor.name}</span>
                <span className="text-white font-semibold">{contractor.reviews} reviews</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Payment Reliability</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-green-400">On Time</span>
              <span className="text-white font-semibold">{analytics.paymentReliability.onTime}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-yellow-400">Late</span>
              <span className="text-white font-semibold">{analytics.paymentReliability.late}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-red-400">Disputes</span>
              <span className="text-white font-semibold">{analytics.paymentReliability.disputes}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

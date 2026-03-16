import React, { useState, useEffect } from "react";

interface Contractor {
  id: number;
  name: string;
  email: string;
  trade: string;
  verified: boolean;
  subscriptionStatus: "active" | "trial" | "expired";
  reviewsSubmitted: number;
  joinedDate: string;
}

export default function UserManagement() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setContractors([
      {
        id: 1,
        name: "Mike Johnson",
        email: "mike@plumbing.com",
        trade: "Plumbing",
        verified: true,
        subscriptionStatus: "active",
        reviewsSubmitted: 24,
        joinedDate: "2026-01-15",
      },
      {
        id: 2,
        name: "Sarah Williams",
        email: "sarah@electric.com",
        trade: "Electrical",
        verified: true,
        subscriptionStatus: "trial",
        reviewsSubmitted: 8,
        joinedDate: "2026-02-20",
      },
    ]);
    setIsLoading(false);
  }, []);

  const getSubscriptionColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-900 text-green-200";
      case "trial":
        return "bg-blue-900 text-blue-200";
      case "expired":
        return "bg-red-900 text-red-200";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>

      {isLoading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-slate-300 font-semibold">Name</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Email</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Trade</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Verified</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Subscription</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Reviews</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((contractor) => (
                <tr key={contractor.id} className="border-b border-slate-700 hover:bg-slate-800">
                  <td className="px-6 py-4 text-white font-medium">{contractor.name}</td>
                  <td className="px-6 py-4 text-slate-300">{contractor.email}</td>
                  <td className="px-6 py-4 text-slate-300">{contractor.trade}</td>
                  <td className="px-6 py-4">
                    <span className={contractor.verified ? "text-green-400" : "text-red-400"}>
                      {contractor.verified ? "✓ Yes" : "✗ No"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSubscriptionColor(contractor.subscriptionStatus)}`}>
                      {contractor.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{contractor.reviewsSubmitted}</td>
                  <td className="px-6 py-4 text-slate-300">{contractor.joinedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

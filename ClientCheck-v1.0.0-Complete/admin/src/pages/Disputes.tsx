import React, { useState, useEffect } from "react";

interface Dispute {
  id: number;
  reviewId: number;
  contractor: string;
  customer: string;
  status: "pending" | "resolved" | "escalated";
  createdAt: string;
  responses: number;
}

export default function Disputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setDisputes([
      {
        id: 1,
        reviewId: 101,
        contractor: "Mike's Plumbing",
        customer: "John Smith",
        status: "pending",
        createdAt: "2026-03-10",
        responses: 1,
      },
      {
        id: 2,
        reviewId: 102,
        contractor: "Sarah's Electric",
        customer: "Jane Doe",
        status: "resolved",
        createdAt: "2026-03-08",
        responses: 2,
      },
    ]);
    setIsLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900 text-yellow-200";
      case "resolved":
        return "bg-green-900 text-green-200";
      case "escalated":
        return "bg-red-900 text-red-200";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Dispute Management</h1>

      {isLoading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-slate-300 font-semibold">Contractor</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Customer</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Status</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Responses</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Created</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="border-b border-slate-700 hover:bg-slate-800">
                  <td className="px-6 py-4 text-white font-medium">{dispute.contractor}</td>
                  <td className="px-6 py-4 text-slate-300">{dispute.customer}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(dispute.status)}`}>
                      {dispute.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{dispute.responses}</td>
                  <td className="px-6 py-4 text-slate-300">{dispute.createdAt}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-400 hover:text-blue-300">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

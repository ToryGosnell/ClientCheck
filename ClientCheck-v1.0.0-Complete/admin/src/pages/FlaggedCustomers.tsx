import React, { useState, useEffect } from "react";

interface FlaggedCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  clientScore: number;
  redFlags: string[];
  reviewCount: number;
  lastReviewDate: string;
}

export default function FlaggedCustomers() {
  const [customers, setCustomers] = useState<FlaggedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch flagged customers
    setCustomers([
      {
        id: 1,
        name: "John Smith",
        email: "john@example.com",
        phone: "555-0101",
        clientScore: 15,
        redFlags: ["Slow Payer", "Scope Creep"],
        reviewCount: 8,
        lastReviewDate: "2026-03-10",
      },
      {
        id: 2,
        name: "Sarah Johnson",
        email: "sarah@example.com",
        phone: "555-0102",
        clientScore: 28,
        redFlags: ["Disputes Invoices", "Micromanages"],
        reviewCount: 5,
        lastReviewDate: "2026-03-09",
      },
    ]);
    setIsLoading(false);
  }, []);

  const getScoreColor = (score: number) => {
    if (score < 20) return "bg-black text-white";
    if (score < 40) return "bg-red-600 text-white";
    if (score < 70) return "bg-yellow-600 text-white";
    return "bg-green-600 text-white";
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Flagged Customers</h1>

      {isLoading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-3 text-slate-300 font-semibold">Name</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Email</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Phone</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Client Score</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Red Flags</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Reviews</th>
                <th className="px-6 py-3 text-slate-300 font-semibold">Last Review</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-700 hover:bg-slate-800">
                  <td className="px-6 py-4 text-white font-medium">{customer.name}</td>
                  <td className="px-6 py-4 text-slate-300">{customer.email}</td>
                  <td className="px-6 py-4 text-slate-300">{customer.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(customer.clientScore)}`}>
                      {customer.clientScore}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {customer.redFlags.map((flag) => (
                        <span key={flag} className="bg-red-900 text-red-200 px-2 py-1 rounded text-xs">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{customer.reviewCount}</td>
                  <td className="px-6 py-4 text-slate-300">{customer.lastReviewDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

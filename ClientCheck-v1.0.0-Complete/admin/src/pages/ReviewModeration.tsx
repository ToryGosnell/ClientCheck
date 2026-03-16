import React, { useState, useEffect } from "react";

interface PendingReview {
  id: number;
  contractor: string;
  customer: string;
  rating: number;
  text: string;
  redFlags: string[];
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export default function ReviewModeration() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setReviews([
      {
        id: 1,
        contractor: "Mike's Plumbing",
        customer: "John Smith",
        rating: 2,
        text: "Customer was very difficult to work with. Changed scope multiple times.",
        redFlags: ["Scope Creep", "Micromanages"],
        status: "pending",
        submittedAt: "2026-03-12",
      },
      {
        id: 2,
        contractor: "Sarah's Electric",
        customer: "Jane Doe",
        rating: 5,
        text: "Great customer! Knew exactly what she wanted and paid on time.",
        redFlags: [],
        status: "pending",
        submittedAt: "2026-03-11",
      },
    ]);
    setIsLoading(false);
  }, []);

  const handleApprove = (id: number) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
  };

  const handleReject = (id: number) => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)));
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Review Moderation</h1>

      {isLoading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-6">
          {reviews.filter((r) => r.status === "pending").map((review) => (
            <div key={review.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-slate-400 text-sm">{review.contractor} → {review.customer}</p>
                  <p className="text-white font-semibold text-lg">Rating: {review.rating}/5</p>
                </div>
                <span className="bg-yellow-900 text-yellow-200 px-3 py-1 rounded-full text-sm">
                  Pending
                </span>
              </div>

              <p className="text-slate-300 mb-4">{review.text}</p>

              {review.redFlags.length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-400 text-sm mb-2">Red Flags:</p>
                  <div className="flex gap-2 flex-wrap">
                    {review.redFlags.map((flag) => (
                      <span key={flag} className="bg-red-900 text-red-200 px-2 py-1 rounded text-xs">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(review.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(review.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Reject
                </button>
                <button className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition">
                  Request Changes
                </button>
              </div>
            </div>
          ))}

          {reviews.filter((r) => r.status === "pending").length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No pending reviews to moderate
            </div>
          )}
        </div>
      )}
    </div>
  );
}

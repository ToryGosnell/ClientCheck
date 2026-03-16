import React, { useState } from "react";
import AdminLogin from "./pages/AdminLogin";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="text-white text-center">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-slate-400">Admin features coming soon in next iteration</p>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

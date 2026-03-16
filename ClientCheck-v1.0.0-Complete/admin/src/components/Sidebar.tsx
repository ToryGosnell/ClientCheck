import React from "react";

export default function Sidebar() {
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.reload();
  };

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 p-6">
      <h2 className="text-xl font-bold text-white mb-8">ClientCheck Admin</h2>
      <nav className="space-y-2">
        <div className="p-3 bg-slate-700 rounded text-white">Dashboard</div>
      </nav>
      <button
        onClick={handleLogout}
        className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
      >
        Logout
      </button>
    </aside>
  );
}

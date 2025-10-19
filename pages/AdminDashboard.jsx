// frontend/src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";

const BASE = process.env.REACT_APP_BACKEND_URL;

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BASE}/api/init_data`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setItems(Array.isArray(data.products) ? data.products : []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">جارِ التحميل…</div>;
  if (err) return <div className="p-6 text-red-600">خطأ: {err}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>
      <div className="rounded-xl border p-4">
        <div className="mb-2 font-semibold">المنتجات (تجريبية)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((p) => (
            <div key={p.id} className="border rounded-lg p-3">
              <div className="font-medium">{p.name}</div>
              <div className="opacity-70">${p.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId: any) => {
    const [s, p, pr, c] = await Promise.all([
      supabase.from('sales').select('*').eq('user_id', userId),
      supabase.from('purchases').select('*').eq('user_id', userId),
      supabase.from('Products').select('*').eq('user_id', userId),
      supabase.from('Customers').select('*').eq('user_id', userId),
    ]);
    if (s.data) setSales(s.data);
    if (p.data) setPurchases(p.data);
    if (pr.data) setProducts(pr.data);
    if (c.data) setCustomers(c.data);
    setLoading(false);
  };

  // Υπολογισμοί
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const warehouseValue = products.reduce((sum, p) => sum + (p.stock * p.cost_price || 0), 0);
  const lowStock = products.filter(p => p.stock <= p.min_stock);

  // Τζίρος ανά μήνα
  const monthlyData = () => {
    const months = {};
    sales.forEach(s => {
      const month = s.date?.slice(0, 7);
      if (!month) return;
      if (!months[month]) months[month] = { month, revenue: 0, profit: 0, cost: 0 };
      months[month].revenue += s.total || 0;
      months[month].profit += s.profit || 0;
    });
    purchases.forEach(p => {
      const month = p.date?.slice(0, 7);
      if (!month) return;
      if (!months[month]) months[month] = { month, revenue: 0, profit: 0, cost: 0 };
      months[month].cost += p.total || 0;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  };

  // Top 5 προϊόντα
  const topProducts = () => {
    const prod = {};
    sales.forEach(s => {
      if (!s.product_id) return;
      if (!prod[s.product_id]) prod[s.product_id] = { id: s.product_id, revenue: 0, qty: 0 };
      prod[s.product_id].revenue += s.total || 0;
      prod[s.product_id].qty += s.quantity || 0;
    });
    return Object.values(prod)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({ ...p, name: products.find(pr => pr.id === p.id)?.name || '-' }));
  };

  // Top 5 πελάτες
  const topCustomers = () => {
    const custs = {};
    sales.forEach(s => {
      if (!s.customer_id) return;
      if (!custs[s.customer_id]) custs[s.customer_id] = { id: s.customer_id, revenue: 0 };
      custs[s.customer_id].revenue += s.total || 0;
    });
    return Object.values(custs)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({ ...c, name: customers.find(cu => cu.id === c.id)?.name || '-' }));
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Φόρτωση...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Dashboard</h1>
          <span className="text-gray-400 text-sm">{user?.email}</span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Συνολικός Τζίρος</p>
            <p className="text-2xl font-medium">€{totalRevenue.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Συνολικό Κέρδος</p>
            <p className="text-2xl font-medium text-green-400">€{totalProfit.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Αξία Αποθήκης</p>
            <p className="text-2xl font-medium">€{warehouseValue.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Πελατών</p>
            <p className="text-2xl font-medium">{customers.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Πωλήσεων</p>
            <p className="text-2xl font-medium">{sales.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Συνολικές Αγορές</p>
            <p className="text-2xl font-medium text-red-400">€{totalCost.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Προϊόντων</p>
            <p className="text-2xl font-medium">{products.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Χαμηλό Απόθεμα</p>
            <p className="text-2xl font-medium text-yellow-400">{lowStock.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4 col-span-2">
            <p className="text-gray-400 text-sm mb-4">Τζίρος & Κέρδος ανά Μήνα</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#534AB7" radius={4} name="Τζίρος" />
                <Bar dataKey="profit" fill="#1D9E75" radius={4} name="Κέρδος" />
                <Bar dataKey="cost" fill="#E24B4A" radius={4} name="Κόστος Αγορών" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products & Customers */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-4">Top 5 Προϊόντα</p>
            {topProducts().length === 0 ? (
              <p className="text-gray-500 text-sm">Δεν υπάρχουν πωλήσεις ακόμα</p>
            ) : topProducts().map((p, i) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs w-4">{i+1}</span>
                  <span className="text-sm">{p.name}</span>
                </div>
                <span className="text-green-400 text-sm font-medium">€{p.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-4">Top 5 Πελάτες</p>
            {topCustomers().length === 0 ? (
              <p className="text-gray-500 text-sm">Δεν υπάρχουν πωλήσεις ακόμα</p>
            ) : topCustomers().map((c, i) => (
              <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs w-4">{i+1}</span>
                  <span className="text-sm">{c.name}</span>
                </div>
                <span className="text-purple-400 text-sm font-medium">€{c.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Χαμηλό Απόθεμα */}
        {lowStock.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-yellow-400 text-sm mb-4">⚠️ Χαμηλό Απόθεμα</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Προϊόν</th>
                  <th className="text-left py-2">Απόθεμα</th>
                  <th className="text-left py-2">Ελάχιστο</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id} className="border-b border-gray-800">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-red-400">{p.stock}</td>
                    <td className="py-2 text-gray-400">{p.min_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
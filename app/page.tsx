'use client';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId: any) => {
    const [s, p, pr, c] = await Promise.all([
      supabase.from('orders').select('*').eq('user_id', userId),
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

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const todayRevenue = sales.filter(s => s.date === today).reduce((sum, s) => sum + (s.total || 0), 0);
  const monthRevenue = sales.filter(s => s.date?.startsWith(thisMonth)).reduce((sum, s) => sum + (s.total || 0), 0);
  const monthProfit = sales.filter(s => s.date?.startsWith(thisMonth)).reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const warehouseValue = products.reduce((sum, p) => sum + (p.stock * p.cost_price || 0), 0);
  const lowStock = products.filter(p => p.stock <= p.min_stock);
  const todaySales = sales.filter(s => s.date === today).length;
  const monthSales = sales.filter(s => s.date?.startsWith(thisMonth)).length;

  const monthlyData = () => {
    const months: any = {};
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
    return Object.values(months).sort((a: any, b: any) => a.month.localeCompare(b.month));
  };

  const topProducts = () => {
    const prod: any = {};
    sales.forEach(s => {
      if (!s.product_id) return;
      if (!prod[s.product_id]) prod[s.product_id] = { id: s.product_id, revenue: 0, qty: 0 };
      prod[s.product_id].revenue += s.total || 0;
      prod[s.product_id].qty += s.quantity || 0;
    });
    return Object.values(prod)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p: any) => ({ ...p, name: products.find(pr => pr.id === p.id)?.name || '-' }));
  };

  const topCustomers = () => {
    const custs: any = {};
    sales.forEach(s => {
      if (!s.customer_id) return;
      if (!custs[s.customer_id]) custs[s.customer_id] = { id: s.customer_id, revenue: 0 };
      custs[s.customer_id].revenue += s.total || 0;
    });
    return Object.values(custs)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((c: any) => ({ ...c, name: customers.find(cu => cu.id === c.id)?.name || '-' }));
  };

  const recentSales = sales
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Φόρτωση...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Dashboard</h1>
          <span className="text-gray-400 text-sm">{user?.email}</span>
        </div>

        {/* KPIs Row 1 — Σήμερα & Μήνας */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-900 rounded-xl p-4 border border-purple-800">
            <p className="text-gray-400 text-xs mb-1">Τζίρος Σήμερα</p>
            <p className="text-2xl font-medium text-purple-400">€{todayRevenue.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
            <p className="text-gray-500 text-xs mt-1">{todaySales} πωλήσεις</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-blue-800">
            <p className="text-gray-400 text-xs mb-1">Τζίρος Μήνα</p>
            <p className="text-2xl font-medium text-blue-400">€{monthRevenue.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
            <p className="text-gray-500 text-xs mt-1">{monthSales} πωλήσεις</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-green-800">
            <p className="text-gray-400 text-xs mb-1">Κέρδος Μήνα</p>
            <p className="text-2xl font-medium text-green-400">€{monthProfit.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-red-800">
            <p className="text-gray-400 text-xs mb-1">Αγορές Μήνα</p>
            <p className="text-2xl font-medium text-red-400">€{purchases.filter(p => p.date?.startsWith(thisMonth)).reduce((sum, p) => sum + (p.total || 0), 0).toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
        </div>

        {/* KPIs Row 2 — Σύνολα */}
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
            <p className="text-gray-400 text-xs mb-1">Συνολικές Πωλήσεις</p>
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

        {/* Chart */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <p className="text-gray-400 text-sm mb-4">Τζίρος & Κέρδος ανά Μήνα</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} />
              <Bar dataKey="revenue" fill="#534AB7" radius={4} name="Τζίρος" />
              <Bar dataKey="profit" fill="#1D9E75" radius={4} name="Κέρδος" />
              <Bar dataKey="cost" fill="#E24B4A" radius={4} name="Αγορές" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products & Customers */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-4">Top 5 Προϊόντα</p>
            {topProducts().length === 0 ? (
              <p className="text-gray-500 text-sm">Δεν υπάρχουν πωλήσεις ακόμα</p>
            ) : topProducts().map((p: any, i) => (
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
            ) : topCustomers().map((c: any, i) => (
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

        {/* Πρόσφατες Πωλήσεις */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <p className="text-gray-400 text-sm mb-4">Πρόσφατες Πωλήσεις</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-2">Ημερομηνία</th>
                <th className="text-left py-2">Πελάτης</th>
                <th className="text-left py-2">Προϊόν</th>
                <th className="text-left py-2">Σύνολο</th>
                <th className="text-left py-2">Κέρδος</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Δεν υπάρχουν πωλήσεις ακόμα</td></tr>
              ) : recentSales.map(s => (
                <tr key={s.id} className="border-b border-gray-800">
                  <td className="py-2">{s.date}</td>
                  <td className="py-2">{customers.find(c => c.id === s.customer_id)?.name || '-'}</td>
                  <td className="py-2">{products.find(p => p.id === s.product_id)?.name || '-'}</td>
                  <td className="py-2 font-medium">€{s.total}</td>
                  <td className="py-2 text-green-400">€{s.profit}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
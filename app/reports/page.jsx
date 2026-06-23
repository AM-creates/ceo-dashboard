'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#534AB7', '#1D9E75', '#EF9F27', '#D85A30', '#E24B4A', '#8B5CF6', '#06B6D4', '#F59E0B', '#10B981', '#EF4444'];

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId) => {
    const [s, p, pr] = await Promise.all([
      supabase.from('orders').select('*').eq('user_id', userId),
      supabase.from('purchases').select('*').eq('user_id', userId),
      supabase.from('Products').select('*').eq('user_id', userId),
    ]);
    if (s.data) setSales(s.data);
    if (p.data) setPurchases(p.data);
    if (pr.data) setProducts(pr.data);
    setLoading(false);
  };

  // Τζίρος & Κέρδος ανά Μήνα
  const monthlyData = () => {
    const months = {};
    sales.forEach(s => {
      const month = s.date?.slice(0, 7);
      if (!month) return;
      if (!months[month]) months[month] = { month, revenue: 0, profit: 0, purchases: 0 };
      months[month].revenue += s.total || 0;
      months[month].profit += s.profit || 0;
    });
    purchases.forEach(p => {
      const month = p.date?.slice(0, 7);
      if (!month) return;
      if (!months[month]) months[month] = { month, revenue: 0, profit: 0, purchases: 0 };
      months[month].purchases += p.total || 0;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  };

  // Top 10 Προϊόντα
  const topProducts = () => {
    const prod = {};
    sales.forEach(s => {
      if (!s.product_id) return;
      if (!prod[s.product_id]) prod[s.product_id] = { id: s.product_id, revenue: 0, qty: 0, profit: 0 };
      prod[s.product_id].revenue += s.total || 0;
      prod[s.product_id].qty += s.quantity || 0;
      prod[s.product_id].profit += s.profit || 0;
    });
    return Object.values(prod)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({ ...p, name: products.find(pr => pr.id === p.id)?.name || '-' }));
  };

  // Πωλήσεις ανά Κατηγορία
  const categoryData = () => {
    const cats = {};
    sales.forEach(s => {
      const product = products.find(p => p.id === s.product_id);
      const cat = product?.category || 'Άλλο';
      if (!cats[cat]) cats[cat] = { name: cat, value: 0 };
      cats[cat].value += s.total || 0;
    });
    return Object.values(cats).sort((a, b) => b.value - a.value);
  };

  // Αποθήκη ανά Κατηγορία
  const warehouseByCategory = () => {
    const cats = {};
    products.forEach(p => {
      const cat = p.category || 'Άλλο';
      if (!cats[cat]) cats[cat] = { name: cat, value: 0, stock: 0 };
      cats[cat].value += (p.stock * p.cost_price) || 0;
      cats[cat].stock += p.stock || 0;
    });
    return Object.values(cats).sort((a, b) => b.value - a.value);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Φόρτωση...</p>
    </div>
  );

  const tabs = [
    { id: 'overview', label: '📊 Επισκόπηση' },
    { id: 'products', label: '📦 Προϊόντα' },
    { id: 'warehouse', label: '🏭 Αποθήκη' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Reports</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm transition-colors ${activeTab === tab.id ? 'text-white border-b-2 border-purple-500 font-medium' : 'text-gray-400 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ΕΠΙΣΚΟΠΗΣΗ */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Τζίρος & Κέρδος ανά Μήνα (€)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#534AB7" radius={4} name="Τζίρος" />
                  <Bar dataKey="profit" fill="#1D9E75" radius={4} name="Κέρδος" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Αγορές vs Πωλήσεις ανά Μήνα (€)</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#534AB7" strokeWidth={2} name="Πωλήσεις" dot={{ fill: '#534AB7' }} />
                  <Line type="monotone" dataKey="purchases" stroke="#E24B4A" strokeWidth={2} name="Αγορές" dot={{ fill: '#E24B4A' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Πωλήσεις ανά Κατηγορία (€)</p>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width={250} height={250}>
                  <PieChart>
                    <Pie data={categoryData()} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                      {categoryData().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} formatter={(v) => `€${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {categoryData().map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }}></div>
                      <span className="text-gray-300">{cat.name}</span>
                      <span className="font-medium ml-2">€{cat.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ΠΡΟΪΟΝΤΑ */}
        {activeTab === 'products' && (
          <div className="flex flex-col gap-6">
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Top 10 Προϊόντα — Τζίρος (€)</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topProducts()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={11} width={120} />
                  <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} formatter={(v) => `€${v.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#534AB7" radius={4} name="Τζίρος" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Top 10 Προϊόντα — Κέρδος (€)</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topProducts()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={11} width={120} />
                  <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} formatter={(v) => `€${v.toFixed(2)}`} />
                  <Bar dataKey="profit" fill="#1D9E75" radius={4} name="Κέρδος" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ΑΠΟΘΗΚΗ */}
        {activeTab === 'warehouse' && (
          <div className="flex flex-col gap-6">
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Αξία Αποθήκης ανά Κατηγορία (€)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={warehouseByCategory()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} formatter={(v) => `€${v.toFixed(2)}`} />
                  <Bar dataKey="value" fill="#EF9F27" radius={4} name="Αξία (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Απόθεμα ανά Κατηγορία (τεμάχια)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={warehouseByCategory()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} />
                  <Bar dataKey="stock" fill="#534AB7" radius={4} name="Τεμάχια" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
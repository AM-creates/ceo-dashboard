'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: '', type: 'in', quantity: 1, notes: '', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId) => {
    const [p, m] = await Promise.all([
      supabase.from('Products').select('*').eq('user_id', userId).order('name'),
      supabase.from('inventory_movements').select('*').eq('user_id', userId).order('date', { ascending: false }),
    ]);
    if (p.data) setProducts(p.data);
    if (m.data) setMovements(m.data);
  };

  const handleSave = async () => {
    setLoading(true);
    await supabase.from('inventory_movements').insert({ ...form, user_id: user.id });
    // Ενημέρωση αποθέματος
    const product = products.find(p => p.id === form.product_id);
    if (product) {
      const newStock = form.type === 'in' 
        ? product.stock + parseInt(form.quantity)
        : product.stock - parseInt(form.quantity);
      await supabase.from('Products').update({ stock: newStock }).eq('id', form.product_id);
    }
    setShowForm(false);
    setForm({ product_id: '', type: 'in', quantity: 1, notes: '', date: new Date().toISOString().split('T')[0] });
    loadAll(user.id);
    setLoading(false);
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || '-';
  const lowStock = products.filter(p => p.stock <= p.min_stock && p.stock > 0);
  const outOfStock = products.filter(p => p.stock === 0);
  const deadStock = products.filter(p => p.stock > (p.min_stock * 3));
  const warehouseValue = products.reduce((sum, p) => sum + (p.stock * p.cost_price || 0), 0);

  const filteredProducts = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const stockByCategory = () => {
    const cats = {};
    products.forEach(p => {
      const cat = p.category || 'Άλλο';
      if (!cats[cat]) cats[cat] = { name: cat, value: 0, stock: 0 };
      cats[cat].value += (p.stock * p.cost_price) || 0;
      cats[cat].stock += p.stock || 0;
    });
    return Object.values(cats);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Αποθήκη</h1>
          <button onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Κίνηση Αποθήκης
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Νέα Κίνηση Αποθήκης</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Προϊόν</label>
                <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Επίλεξε προϊόν...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Απόθεμα: {p.stock})</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Τύπος</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="in">📥 Εισερχόμενο</option>
                  <option value="out">📤 Εξερχόμενο</option>
                  <option value="adjustment">🔧 Διόρθωση</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ποσότητα</label>
                <input type="number" min="1" value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ημερομηνία</label>
                <input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">Σημειώσεις</label>
                <input type="text" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={loading}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-xl text-sm font-medium transition-colors">
                {loading ? 'Αποθήκευση...' : '✅ Αποθήκευση'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-xl text-sm font-medium transition-colors">
                Ακύρωση
              </button>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Προϊόντων</p>
            <p className="text-2xl font-medium">{products.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Αξία Αποθήκης</p>
            <p className="text-2xl font-medium">€{warehouseValue.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Χαμηλό Απόθεμα</p>
            <p className="text-2xl font-medium text-yellow-400">{lowStock.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Εξαντλημένα</p>
            <p className="text-2xl font-medium text-red-400">{outOfStock.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-800 mb-6">
          {[
            { id: 'overview', label: '📦 Απόθεμα' },
            { id: 'movements', label: '🔄 Κινήσεις' },
            { id: 'alerts', label: '⚠️ Ειδοποιήσεις' },
            { id: 'charts', label: '📊 Γραφήματα' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm transition-colors ${activeTab === tab.id ? 'text-white border-b-2 border-purple-500 font-medium' : 'text-gray-400 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ΑΠΟΘΕΜΑ */}
        {activeTab === 'overview' && (
          <div>
            <div className="mb-4">
              <input type="text" placeholder="🔍 Αναζήτηση προϊόντος..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <p className="text-gray-500 text-xs mb-3">{filteredProducts.length} προϊόντα</p>
            <div className="bg-gray-900 rounded-2xl p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-3 px-2">Προϊόν</th>
                    <th className="text-left py-3 px-2">Κατηγορία</th>
                    <th className="text-left py-3 px-2">SKU</th>
                    <th className="text-left py-3 px-2">Απόθεμα</th>
                    <th className="text-left py-3 px-2">Ελάχιστο</th>
                    <th className="text-left py-3 px-2">Αξία</th>
                    <th className="text-left py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => {
                    const status = p.stock === 0 ? { label: 'Εξαντλημένο', color: 'bg-red-900 text-red-400' }
                      : p.stock <= p.min_stock ? { label: 'Χαμηλό', color: 'bg-yellow-900 text-yellow-400' }
                      : p.stock > p.min_stock * 3 ? { label: 'Υπερβολικό', color: 'bg-blue-900 text-blue-400' }
                      : { label: 'OK', color: 'bg-green-900 text-green-400' };
                    return (
                      <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-2 font-medium">{p.name}</td>
                        <td className="py-3 px-2 text-gray-400">{p.category}</td>
                        <td className="py-3 px-2 text-gray-400">{p.sku}</td>
                        <td className={`py-3 px-2 font-medium ${p.stock === 0 ? 'text-red-400' : p.stock <= p.min_stock ? 'text-yellow-400' : 'text-white'}`}>{p.stock}</td>
                        <td className="py-3 px-2 text-gray-400">{p.min_stock}</td>
                        <td className="py-3 px-2">€{(p.stock * p.cost_price).toFixed(2)}</td>
                        <td className="py-3 px-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ΚΙΝΗΣΕΙΣ */}
        {activeTab === 'movements' && (
          <div className="bg-gray-900 rounded-2xl p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-3 px-2">Ημερομηνία</th>
                  <th className="text-left py-3 px-2">Προϊόν</th>
                  <th className="text-left py-3 px-2">Τύπος</th>
                  <th className="text-left py-3 px-2">Ποσότητα</th>
                  <th className="text-left py-3 px-2">Σημειώσεις</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-500">Δεν υπάρχουν κινήσεις ακόμα</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-2">{m.date}</td>
                    <td className="py-3 px-2 font-medium">{getProductName(m.product_id)}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${m.type === 'in' ? 'bg-green-900 text-green-400' : m.type === 'out' ? 'bg-red-900 text-red-400' : 'bg-blue-900 text-blue-400'}`}>
                        {m.type === 'in' ? '📥 Εισερχόμενο' : m.type === 'out' ? '📤 Εξερχόμενο' : '🔧 Διόρθωση'}
                      </span>
                    </td>
                    <td className={`py-3 px-2 font-medium ${m.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                      {m.type === 'in' ? '+' : '-'}{m.quantity}
                    </td>
                    <td className="py-3 px-2 text-gray-400">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ΕΙΔΟΠΟΙΗΣΕΙΣ */}
        {activeTab === 'alerts' && (
          <div className="flex flex-col gap-4">
            {lowStock.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-medium mb-3">⚠️ Χαμηλό Απόθεμα ({lowStock.length})</p>
                {lowStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-yellow-400 text-sm font-medium">{p.stock} / {p.min_stock} min</span>
                  </div>
                ))}
              </div>
            )}
            {outOfStock.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-red-400 text-sm font-medium mb-3">🚨 Εξαντλημένα ({outOfStock.length})</p>
                {outOfStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-red-400 text-sm font-medium">0 τεμ.</span>
                  </div>
                ))}
              </div>
            )}
            {deadStock.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-blue-400 text-sm font-medium mb-3">📦 Υπερβολικό Απόθεμα ({deadStock.length})</p>
                {deadStock.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-blue-400 text-sm font-medium">{p.stock} τεμ.</span>
                  </div>
                ))}
              </div>
            )}
            {lowStock.length === 0 && outOfStock.length === 0 && deadStock.length === 0 && (
              <div className="bg-gray-900 rounded-xl p-8 text-center">
                <p className="text-green-400 text-lg">✅ Όλα καλά!</p>
                <p className="text-gray-400 text-sm mt-2">Δεν υπάρχουν ειδοποιήσεις αποθήκης</p>
              </div>
            )}
          </div>
        )}

        {/* ΓΡΑΦΗΜΑΤΑ */}
        {activeTab === 'charts' && (
          <div className="flex flex-col gap-6">
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Αξία Αποθήκης ανά Κατηγορία (€)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stockByCategory()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8 }} formatter={(v) => `€${Number(v).toFixed(2)}`} />
                  <Bar dataKey="value" fill="#EF9F27" radius={4} name="Αξία (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-4">Απόθεμα ανά Κατηγορία (τεμάχια)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stockByCategory()}>
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
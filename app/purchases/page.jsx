'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const emptyPurchase = {
  supplier: '', product_id: '', quantity: 1,
  cost_price: 0, total: 0,
  date: new Date().toISOString().split('T')[0], notes: ''
};

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyPurchase);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId) => {
    const [p, pr] = await Promise.all([
      supabase.from('purchases').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('Products').select('*').eq('user_id', userId).order('name'),
    ]);
    if (p.data) setPurchases(p.data);
    if (pr.data) setProducts(pr.data);
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const total = product.cost_price * form.quantity;
      setForm({ ...form, product_id: productId, cost_price: product.cost_price, total });
    }
  };

  const handleQuantityChange = (qty) => {
    setForm({ ...form, quantity: qty, total: form.cost_price * qty });
  };

  const handleSave = async () => {
    setLoading(true);
    if (editing) {
      await supabase.from('purchases').update({ ...form }).eq('id', editing);
    } else {
      await supabase.from('purchases').insert({ ...form, user_id: user.id });
      const product = products.find(p => p.id === form.product_id);
      if (product) {
        await supabase.from('Products').update({ stock: product.stock + form.quantity }).eq('id', form.product_id);
      }
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyPurchase);
    loadAll(user.id);
    setLoading(false);
  };

  const handleEdit = (purchase) => {
    setForm(purchase);
    setEditing(purchase.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή αγοράς;')) return;
    await supabase.from('purchases').delete().eq('id', id);
    loadAll(user.id);
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || '-';

  const filtered = purchases.filter(p => {
    const matchSearch = !search ||
      p.supplier?.toLowerCase().includes(search.toLowerCase()) ||
      getProductName(p.product_id).toLowerCase().includes(search.toLowerCase()) ||
      p.notes?.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !filterFrom || p.date >= filterFrom;
    const matchTo = !filterTo || p.date <= filterTo;
    const matchProduct = !filterProduct || p.product_id === filterProduct;
    return matchSearch && matchFrom && matchTo && matchProduct;
  });

  const totalCost = filtered.reduce((sum, p) => sum + (p.total || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Αγορές</h1>
          <button onClick={() => { setForm(emptyPurchase); setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Νέα Αγορά
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">{editing ? 'Επεξεργασία Αγοράς' : 'Νέα Αγορά'}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Προμηθευτής</label>
                <input type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Προϊόν</label>
                <select value={form.product_id} onChange={e => handleProductChange(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Επίλεξε προϊόν...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ποσότητα</label>
                <input type="number" min="1" value={form.quantity}
                  onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Τιμή Κόστους (€)</label>
                <input type="number" value={form.cost_price}
                  onChange={e => {
                    const cp = parseFloat(e.target.value) || 0;
                    setForm({ ...form, cost_price: cp, total: cp * form.quantity });
                  }}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Σύνολο (€)</label>
                <input type="number" value={form.total} readOnly
                  className="w-full bg-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ημερομηνία</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="col-span-3">
                <label className="text-gray-400 text-xs mb-1 block">Σημειώσεις</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Αγορές (φίλτρο)</p>
            <p className="text-2xl font-medium">{filtered.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Συνολικό Κόστος (φίλτρο)</p>
            <p className="text-2xl font-medium text-red-400">€{totalCost.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Μέση Αξία Αγοράς</p>
            <p className="text-2xl font-medium">€{filtered.length > 0 ? (totalCost / filtered.length).toFixed(2) : '0.00'}</p>
          </div>
        </div>

        {/* Φίλτρα */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <input type="text" placeholder="🔍 Αναζήτηση..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Όλα τα Προϊόντα</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <p className="text-gray-500 text-xs mb-3">{filtered.length} αποτελέσματα</p>

        {/* Table */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 px-2">Ημερομηνία</th>
                <th className="text-left py-3 px-2">Προμηθευτής</th>
                <th className="text-left py-3 px-2">Προϊόν</th>
                <th className="text-left py-3 px-2">Ποσότητα</th>
                <th className="text-left py-3 px-2">Κόστος</th>
                <th className="text-left py-3 px-2">Σύνολο</th>
                <th className="text-left py-3 px-2">Σημειώσεις</th>
                <th className="text-left py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Δεν βρέθηκαν αποτελέσματα</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-2">{p.date}</td>
                  <td className="py-3 px-2 font-medium">{p.supplier}</td>
                  <td className="py-3 px-2">{getProductName(p.product_id)}</td>
                  <td className="py-3 px-2">{p.quantity}</td>
                  <td className="py-3 px-2">€{p.cost_price}</td>
                  <td className="py-3 px-2 font-medium text-red-400">€{p.total}</td>
                  <td className="py-3 px-2 text-gray-400">{p.notes}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-white transition-colors">✏️</button>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-400 transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
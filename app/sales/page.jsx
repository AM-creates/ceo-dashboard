'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const emptySale = {
  customer_id: '', product_id: '', quantity: 1,
  sale_price: 0, cost_price: 0, total: 0, profit: 0,
  date: new Date().toISOString().split('T')[0], notes: ''
};

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySale);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId) => {
    const [s, c, p] = await Promise.all([
      supabase.from('sales').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('Customers').select('*').eq('user_id', userId).order('name'),
      supabase.from('Products').select('*').eq('user_id', userId).order('name'),
    ]);
    if (s.data) setSales(s.data);
    if (c.data) setCustomers(c.data);
    if (p.data) setProducts(p.data);
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const total = product.sale_price * form.quantity;
      const profit = (product.sale_price - product.cost_price) * form.quantity;
      setForm({ ...form, product_id: productId, sale_price: product.sale_price, cost_price: product.cost_price, total, profit });
    }
  };

  const handleQuantityChange = (qty) => {
    const total = form.sale_price * qty;
    const profit = (form.sale_price - form.cost_price) * qty;
    setForm({ ...form, quantity: qty, total, profit });
  };

  const handleSave = async () => {
    setLoading(true);
    if (editing) {
      await supabase.from('sales').update({ ...form }).eq('id', editing);
    } else {
      await supabase.from('sales').insert({ ...form, user_id: user.id });
      const product = products.find(p => p.id === form.product_id);
      if (product) {
        await supabase.from('Products').update({ stock: product.stock - form.quantity }).eq('id', form.product_id);
      }
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptySale);
    loadAll(user.id);
    setLoading(false);
  };

  const handleEdit = (sale) => {
    setForm(sale);
    setEditing(sale.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή πώλησης;')) return;
    await supabase.from('sales').delete().eq('id', id);
    loadAll(user.id);
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-';
  const getProductName = (id) => products.find(p => p.id === id)?.name || '-';

  const filtered = sales.filter(s => {
    const matchSearch = !search ||
      getCustomerName(s.customer_id).toLowerCase().includes(search.toLowerCase()) ||
      getProductName(s.product_id).toLowerCase().includes(search.toLowerCase()) ||
      s.notes?.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !filterFrom || s.date >= filterFrom;
    const matchTo = !filterTo || s.date <= filterTo;
    const matchCustomer = !filterCustomer || s.customer_id === filterCustomer;
    return matchSearch && matchFrom && matchTo && matchCustomer;
  });

  const totalRevenue = filtered.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = filtered.reduce((sum, s) => sum + (s.profit || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Πωλήσεις</h1>
          <button onClick={() => { setForm(emptySale); setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Νέα Πώληση
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">{editing ? 'Επεξεργασία Πώλησης' : 'Νέα Πώληση'}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Πελάτης</label>
                <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Επίλεξε πελάτη...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Προϊόν</label>
                <select value={form.product_id} onChange={e => handleProductChange(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Επίλεξε προϊόν...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (€{p.sale_price})</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ποσότητα</label>
                <input type="number" min="1" value={form.quantity}
                  onChange={e => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Τιμή Πώλησης (€)</label>
                <input type="number" value={form.sale_price}
                  onChange={e => {
                    const sp = parseFloat(e.target.value) || 0;
                    setForm({ ...form, sale_price: sp, total: sp * form.quantity, profit: (sp - form.cost_price) * form.quantity });
                  }}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Σύνολο (€)</label>
                <input type="number" value={form.total} readOnly
                  className="w-full bg-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Κέρδος (€)</label>
                <input type="number" value={form.profit} readOnly
                  className="w-full bg-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ημερομηνία</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="col-span-2">
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Πωλήσεις (φίλτρο)</p>
            <p className="text-2xl font-medium">{filtered.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Τζίρος (φίλτρο)</p>
            <p className="text-2xl font-medium">€{totalRevenue.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Κέρδος (φίλτρο)</p>
            <p className="text-2xl font-medium text-green-400">€{totalProfit.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Μέση Αξία</p>
            <p className="text-2xl font-medium">€{filtered.length > 0 ? (totalRevenue / filtered.length).toFixed(2) : '0.00'}</p>
          </div>
        </div>

        {/* Φίλτρα */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <input type="text" placeholder="🔍 Αναζήτηση..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Όλοι οι Πελάτες</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                <th className="text-left py-3 px-2">Πελάτης</th>
                <th className="text-left py-3 px-2">Προϊόν</th>
                <th className="text-left py-3 px-2">Ποσότητα</th>
                <th className="text-left py-3 px-2">Τιμή</th>
                <th className="text-left py-3 px-2">Σύνολο</th>
                <th className="text-left py-3 px-2">Κέρδος</th>
                <th className="text-left py-3 px-2">Σημειώσεις</th>
                <th className="text-left py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">Δεν βρέθηκαν αποτελέσματα</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-2">{s.date}</td>
                  <td className="py-3 px-2 font-medium">{getCustomerName(s.customer_id)}</td>
                  <td className="py-3 px-2">{getProductName(s.product_id)}</td>
                  <td className="py-3 px-2">{s.quantity}</td>
                  <td className="py-3 px-2">€{s.sale_price}</td>
                  <td className="py-3 px-2 font-medium">€{s.total}</td>
                  <td className="py-3 px-2 text-green-400">€{s.profit}</td>
                  <td className="py-3 px-2 text-gray-400">{s.notes}</td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(s)} className="text-gray-400 hover:text-white transition-colors">✏️</button>
                      <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-400 transition-colors">🗑️</button>
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
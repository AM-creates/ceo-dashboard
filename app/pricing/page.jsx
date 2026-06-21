'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: '', sale_price: 0, notes: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId) => {
    const [c, p, pr] = await Promise.all([
      supabase.from('Customers').select('*').eq('user_id', userId).order('name'),
      supabase.from('Products').select('*').eq('user_id', userId).order('name'),
      supabase.from('customer_pricing').select('*').eq('user_id', userId),
    ]);
    if (c.data) setCustomers(c.data);
    if (p.data) setProducts(p.data);
    if (pr.data) setPricing(pr.data);
  };

  const handleSave = async () => {
    setLoading(true);
    if (editing) {
      await supabase.from('customer_pricing').update({ ...form }).eq('id', editing);
    } else {
      await supabase.from('customer_pricing').insert({ ...form, user_id: user.id, customer_id: selectedCustomer });
    }
    setShowForm(false);
    setEditing(null);
    setForm({ product_id: '', sale_price: 0, notes: '' });
    loadAll(user.id);
    setLoading(false);
  };

  const handleEdit = (p) => {
    setForm({ product_id: p.product_id, sale_price: p.sale_price, notes: p.notes || '' });
    setEditing(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή τιμής;')) return;
    await supabase.from('customer_pricing').delete().eq('id', id);
    loadAll(user.id);
  };

  const customerPricing = pricing.filter(p => p.customer_id === selectedCustomer);
  const getProductName = (id) => products.find(p => p.id === id)?.name || '-';
  const getDefaultPrice = (id) => products.find(p => p.id === id)?.sale_price || 0;
  const selectedCustomerName = customers.find(c => c.id === selectedCustomer)?.name || '';

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Τιμοκατάλογος Πελατών</h1>
          {selectedCustomer && (
            <button onClick={() => { setForm({ product_id: '', sale_price: 0, notes: '' }); setEditing(null); setShowForm(true); }}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              + Νέα Τιμή
            </button>
          )}
        </div>

        {/* Επιλογή Πελάτη */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-6">
          <label className="text-gray-400 text-xs mb-2 block">Επίλεξε Πελάτη</label>
          <select value={selectedCustomer} onChange={e => { setSelectedCustomer(e.target.value); setShowForm(false); }}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">-- Επίλεξε πελάτη --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Form */}
        {showForm && selectedCustomer && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-1">{editing ? 'Επεξεργασία Τιμής' : 'Νέα Ειδική Τιμή'}</h2>
            <p className="text-gray-400 text-sm mb-4">Πελάτης: <span className="text-purple-400">{selectedCustomerName}</span></p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Προϊόν</label>
                <select value={form.product_id} onChange={e => {
                  const prod = products.find(p => p.id === e.target.value);
                  setForm({ ...form, product_id: e.target.value, sale_price: prod?.sale_price || 0 });
                }}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Επίλεξε προϊόν...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Κανονική: €{p.sale_price})</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ειδική Τιμή (€)</label>
                <input type="number" value={form.sale_price}
                  onChange={e => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Σημειώσεις</label>
                <input type="text" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="π.χ. Χονδρική τιμή"
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

        {/* Τιμές Πελάτη */}
        {selectedCustomer && (
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-gray-400 text-sm mb-4">
              Ειδικές τιμές για <span className="text-white font-medium">{selectedCustomerName}</span>
              <span className="text-gray-500 ml-2">({customerPricing.length} προϊόντα)</span>
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-3 px-2">Προϊόν</th>
                  <th className="text-left py-3 px-2">Κανονική Τιμή</th>
                  <th className="text-left py-3 px-2">Ειδική Τιμή</th>
                  <th className="text-left py-3 px-2">Έκπτωση</th>
                  <th className="text-left py-3 px-2">Σημειώσεις</th>
                  <th className="text-left py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {customerPricing.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">
                    Δεν υπάρχουν ειδικές τιμές — πρόσθεσε την πρώτη!
                  </td></tr>
                ) : customerPricing.map(p => {
                  const defaultPrice = getDefaultPrice(p.product_id);
                  const discount = defaultPrice > 0 ? (((defaultPrice - p.sale_price) / defaultPrice) * 100).toFixed(1) : 0;
                  return (
                    <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-2 font-medium">{getProductName(p.product_id)}</td>
                      <td className="py-3 px-2 text-gray-400">€{defaultPrice}</td>
                      <td className="py-3 px-2 text-green-400 font-medium">€{p.sale_price}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${Number(discount) > 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                          {Number(discount) > 0 ? '-' : '+'}{Math.abs(Number(discount))}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-400">{p.notes}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-white transition-colors">✏️</button>
                          <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-400 transition-colors">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!selectedCustomer && (
          <div className="bg-gray-900 rounded-2xl p-12 text-center">
            <p className="text-gray-400">Επίλεξε έναν πελάτη για να δεις ή να ορίσεις ειδικές τιμές</p>
          </div>
        )}

      </div>
    </div>
  );
}
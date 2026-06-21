'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const emptySupplier = {
  name: '', email: '', phone: '', address: '', notes: ''
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySupplier);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadSuppliers(data.user.id); }
    });
  }, []);

  const loadSuppliers = async (userId) => {
    const { data } = await supabase.from('suppliers').select('*').eq('user_id', userId).order('name');
    if (data) setSuppliers(data);
  };

  const handleSave = async () => {
    setLoading(true);
    if (editing) {
      await supabase.from('suppliers').update({ ...form }).eq('id', editing);
    } else {
      await supabase.from('suppliers').insert({ ...form, user_id: user.id });
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptySupplier);
    loadSuppliers(user.id);
    setLoading(false);
  };

  const handleEdit = (supplier) => {
    setForm(supplier);
    setEditing(supplier.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή προμηθευτή;')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    loadSuppliers(user.id);
  };

  const filtered = suppliers.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Προμηθευτές</h1>
          <button onClick={() => { setForm(emptySupplier); setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Νέος Προμηθευτής
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">{editing ? 'Επεξεργασία Προμηθευτή' : 'Νέος Προμηθευτής'}</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Όνομα', key: 'name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Τηλέφωνο', key: 'phone', type: 'text' },
                { label: 'Διεύθυνση', key: 'address', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-gray-400 text-xs mb-1 block">{field.label}</label>
                  <input type={field.type} value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <div className="col-span-3">
                <label className="text-gray-400 text-xs mb-1 block">Σημειώσεις</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Προμηθευτών</p>
            <p className="text-2xl font-medium">{suppliers.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Αποτελέσματα Αναζήτησης</p>
            <p className="text-2xl font-medium">{filtered.length}</p>
          </div>
        </div>

        {/* Αναζήτηση */}
        <div className="mb-4">
          <input type="text" placeholder="🔍 Αναζήτηση με όνομα, email, τηλέφωνο..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <p className="text-gray-500 text-xs mb-3">{filtered.length} αποτελέσματα</p>

        {/* Table */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 px-2">Όνομα</th>
                <th className="text-left py-3 px-2">Email</th>
                <th className="text-left py-3 px-2">Τηλέφωνο</th>
                <th className="text-left py-3 px-2">Διεύθυνση</th>
                <th className="text-left py-3 px-2">Σημειώσεις</th>
                <th className="text-left py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Δεν υπάρχουν προμηθευτές — πρόσθεσε τον πρώτο!</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-2 font-medium">{s.name}</td>
                  <td className="py-3 px-2 text-gray-400">{s.email}</td>
                  <td className="py-3 px-2 text-gray-400">{s.phone}</td>
                  <td className="py-3 px-2 text-gray-400">{s.address}</td>
                  <td className="py-3 px-2 text-gray-400 max-w-xs truncate">{s.notes}</td>
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
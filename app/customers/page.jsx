'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const emptyCustomer = {
  name: '', email: '', phone: '', address: '', notes: '', total_purchases: 0
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCustomer);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [allCustomValues, setAllCustomValues] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId) => {
    const [c, cf, cv] = await Promise.all([
      supabase.from('Customers').select('*').eq('user_id', userId).order('name'),
      supabase.from('custom_fields').select('*').eq('user_id', userId).eq('entity', 'customers'),
      supabase.from('custom_field_values').select('*').eq('user_id', userId).eq('entity', 'customers'),
    ]);
    if (c.data) setCustomers(c.data);
    if (cf.data) setCustomFields(cf.data);
    if (cv.data) setAllCustomValues(cv.data);
  };

  const loadCustomValues = async (entityId) => {
    const { data } = await supabase.from('custom_field_values').select('*').eq('entity_id', entityId);
    if (data) {
      const vals = {};
      data.forEach(v => vals[v.field_name] = v.value);
      setCustomValues(vals);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let entityId = editing;
    if (editing) {
      await supabase.from('Customers').update({ ...form }).eq('id', editing);
    } else {
      const { data } = await supabase.from('Customers').insert({ ...form, user_id: user.id }).select();
      if (data) entityId = data[0].id;
    }

    for (const field of customFields) {
      const val = customValues[field.field_name] || '';
      const existing = await supabase.from('custom_field_values').select('*').eq('entity_id', entityId).eq('field_name', field.field_name).single();
      if (existing.data) {
        await supabase.from('custom_field_values').update({ value: val }).eq('id', existing.data.id);
      } else {
        await supabase.from('custom_field_values').insert({ user_id: user.id, entity: 'customers', entity_id: entityId, field_name: field.field_name, value: val });
      }
    }

    setShowForm(false);
    setEditing(null);
    setForm(emptyCustomer);
    setCustomValues({});
    loadAll(user.id);
    setLoading(false);
  };

  const handleEdit = async (customer) => {
    setForm(customer);
    setEditing(customer.id);
    await loadCustomValues(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή πελάτη;')) return;
    await supabase.from('Customers').delete().eq('id', id);
    loadAll(user.id);
  };

  const filtered = customers
    .filter(c =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.address?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'total_purchases') return (b.total_purchases || 0) - (a.total_purchases || 0);
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Πελάτες</h1>
          <button onClick={() => { setForm(emptyCustomer); setEditing(null); setCustomValues({}); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Νέος Πελάτης
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">{editing ? 'Επεξεργασία Πελάτη' : 'Νέος Πελάτης'}</h2>
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

              {customFields.length > 0 && (
                <>
                  <div className="col-span-3 border-t border-gray-700 pt-4 mt-2">
                    <p className="text-purple-400 text-xs mb-3 font-medium">Custom Πεδία</p>
                  </div>
                  {customFields.map(field => (
                    <div key={field.id}>
                      <label className="text-purple-400 text-xs mb-1 block">{field.field_name}</label>
                      {field.field_type === 'boolean' ? (
                        <select value={customValues[field.field_name] || ''}
                          onChange={e => setCustomValues({ ...customValues, [field.field_name]: e.target.value })}
                          className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">-</option>
                          <option value="Ναι">Ναι</option>
                          <option value="Όχι">Όχι</option>
                        </select>
                      ) : (
                        <input type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                          value={customValues[field.field_name] || ''}
                          onChange={e => setCustomValues({ ...customValues, [field.field_name]: e.target.value })}
                          className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                      )}
                    </div>
                  ))}
                </>
              )}
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

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Πελατών</p>
            <p className="text-2xl font-medium">{customers.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Αγορών</p>
            <p className="text-2xl font-medium">€{customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0).toLocaleString('el-GR')}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Μέση Αξία Πελάτη</p>
            <p className="text-2xl font-medium">€{customers.length > 0 ? (customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0) / customers.length).toFixed(0) : 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <input type="text" placeholder="🔍 Αναζήτηση με όνομα, email, τηλέφωνο..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="name">Ταξινόμηση: Όνομα</option>
            <option value="total_purchases">Ταξινόμηση: Σύνολο Αγορών</option>
          </select>
        </div>

        <p className="text-gray-500 text-xs mb-3">{filtered.length} αποτελέσματα</p>

        <div className="bg-gray-900 rounded-2xl p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 px-2">Όνομα</th>
                <th className="text-left py-3 px-2">Email</th>
                <th className="text-left py-3 px-2">Τηλέφωνο</th>
                <th className="text-left py-3 px-2">Διεύθυνση</th>
                <th className="text-left py-3 px-2">Σημειώσεις</th>
                {customFields.map(f => (
                  <th key={f.id} className="text-left py-3 px-2 text-purple-400">{f.field_name}</th>
                ))}
                <th className="text-left py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6 + customFields.length} className="text-center py-12 text-gray-500">Δεν βρέθηκαν αποτελέσματα</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-2 font-medium">{c.name}</td>
                  <td className="py-3 px-2 text-gray-400">{c.email}</td>
                  <td className="py-3 px-2 text-gray-400">{c.phone}</td>
                  <td className="py-3 px-2 text-gray-400">{c.address}</td>
                  <td className="py-3 px-2 text-gray-400 max-w-xs truncate">{c.notes}</td>
                  {customFields.map(f => {
                    const val = allCustomValues.find(v => v.entity_id === c.id && v.field_name === f.field_name);
                    return <td key={f.id} className="py-3 px-2 text-purple-300">{val?.value || '-'}</td>;
                  })}
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(c)} className="text-gray-400 hover:text-white transition-colors">✏️</button>
                      <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-400 transition-colors">🗑️</button>
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
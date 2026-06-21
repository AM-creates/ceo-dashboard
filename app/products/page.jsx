'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const emptyProduct = {
  name: '', sku: '', category: '', cost_price: 0,
  sale_price: 0, stock: 0, min_stock: 0, status: 'Ενεργό'
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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
    const [p, cf, cv] = await Promise.all([
      supabase.from('Products').select('*').eq('user_id', userId).order('name'),
      supabase.from('custom_fields').select('*').eq('user_id', userId).eq('entity', 'products'),
      supabase.from('custom_field_values').select('*').eq('user_id', userId).eq('entity', 'products'),
    ]);
    if (p.data) setProducts(p.data);
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
      await supabase.from('Products').update({ ...form }).eq('id', editing);
    } else {
      const { data } = await supabase.from('Products').insert({ ...form, user_id: user.id }).select();
      if (data) entityId = data[0].id;
    }

    for (const field of customFields) {
      const val = customValues[field.field_name] || '';
      const existing = await supabase.from('custom_field_values').select('*').eq('entity_id', entityId).eq('field_name', field.field_name).single();
      if (existing.data) {
        await supabase.from('custom_field_values').update({ value: val }).eq('id', existing.data.id);
      } else {
        await supabase.from('custom_field_values').insert({ user_id: user.id, entity: 'products', entity_id: entityId, field_name: field.field_name, value: val });
      }
    }

    setShowForm(false);
    setEditing(null);
    setForm(emptyProduct);
    setCustomValues({});
    loadAll(user.id);
    setLoading(false);
  };

  const handleEdit = async (product) => {
    setForm(product);
    setEditing(product.id);
    await loadCustomValues(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή προϊόντος;')) return;
    await supabase.from('Products').delete().eq('id', id);
    loadAll(user.id);
  };

  const margin = (p) => p.sale_price > 0 ? (((p.sale_price - p.cost_price) / p.sale_price) * 100).toFixed(1) : 0;
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || p.category === filterCategory;
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Προϊόντα</h1>
          <button onClick={() => { setForm(emptyProduct); setEditing(null); setCustomValues({}); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Νέο Προϊόν
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">{editing ? 'Επεξεργασία' : 'Νέο Προϊόν'}</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Όνομα', key: 'name', type: 'text' },
                { label: 'SKU', key: 'sku', type: 'text' },
                { label: 'Κατηγορία', key: 'category', type: 'text' },
                { label: 'Τιμή Κόστους (€)', key: 'cost_price', type: 'number' },
                { label: 'Τιμή Πώλησης (€)', key: 'sale_price', type: 'number' },
                { label: 'Απόθεμα', key: 'stock', type: 'number' },
                { label: 'Ελάχιστο Απόθεμα', key: 'min_stock', type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-gray-400 text-xs mb-1 block">{field.label}</label>
                  <input type={field.type} value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Κατάσταση</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Ενεργό</option>
                  <option>Ανενεργό</option>
                  <option>Εξαντλημένο</option>
                </select>
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

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Σύνολο Προϊόντων</p>
            <p className="text-2xl font-medium">{products.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Ενεργά</p>
            <p className="text-2xl font-medium">{products.filter(p => p.status === 'Ενεργό').length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Χαμηλό Απόθεμα</p>
            <p className="text-2xl font-medium text-yellow-400">{products.filter(p => p.stock <= p.min_stock).length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Αξία Αποθήκης</p>
            <p className="text-2xl font-medium">€{products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0).toLocaleString('el-GR', {minimumFractionDigits: 0})}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <input type="text" placeholder="🔍 Αναζήτηση..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Όλες οι Κατηγορίες</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Όλες οι Καταστάσεις</option>
            <option>Ενεργό</option>
            <option>Ανενεργό</option>
            <option>Εξαντλημένο</option>
          </select>
        </div>

        <p className="text-gray-500 text-xs mb-3">{filtered.length} αποτελέσματα</p>

        <div className="bg-gray-900 rounded-2xl p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3 px-2">Προϊόν</th>
                <th className="text-left py-3 px-2">SKU</th>
                <th className="text-left py-3 px-2">Κατηγορία</th>
                <th className="text-left py-3 px-2">Κόστος</th>
                <th className="text-left py-3 px-2">Τιμή</th>
                <th className="text-left py-3 px-2">Margin</th>
                <th className="text-left py-3 px-2">Απόθεμα</th>
                <th className="text-left py-3 px-2">Status</th>
                {customFields.map(f => (
                  <th key={f.id} className="text-left py-3 px-2 text-purple-400">{f.field_name}</th>
                ))}
                <th className="text-left py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9 + customFields.length} className="text-center py-12 text-gray-500">Δεν βρέθηκαν αποτελέσματα</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-2 font-medium">{p.name}</td>
                  <td className="py-3 px-2 text-gray-400">{p.sku}</td>
                  <td className="py-3 px-2 text-gray-400">{p.category}</td>
                  <td className="py-3 px-2">€{p.cost_price}</td>
                  <td className="py-3 px-2">€{p.sale_price}</td>
                  <td className="py-3 px-2 text-green-400">{margin(p)}%</td>
                  <td className={`py-3 px-2 font-medium ${p.stock <= p.min_stock ? 'text-yellow-400' : 'text-white'}`}>{p.stock}</td>
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      p.status === 'Ενεργό' ? 'bg-green-900 text-green-400' :
                      p.status === 'Εξαντλημένο' ? 'bg-red-900 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  {customFields.map(f => {
                    const val = allCustomValues.find(v => v.entity_id === p.id && v.field_name === f.field_name);
                    return <td key={f.id} className="py-3 px-2 text-purple-300">{val?.value || '-'}</td>;
                  })}
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
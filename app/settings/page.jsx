'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const entities = [
  { value: 'products', label: 'Προϊόντα' },
  { value: 'customers', label: 'Πελάτες' },
  { value: 'sales', label: 'Πωλήσεις' },
  { value: 'suppliers', label: 'Προμηθευτές' },
];

const fieldTypes = [
  { value: 'text', label: 'Κείμενο' },
  { value: 'number', label: 'Αριθμός' },
  { value: 'date', label: 'Ημερομηνία' },
  { value: 'boolean', label: 'Ναι/Όχι' },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ entity: 'products', field_name: '', field_type: 'text' });
  const [activeEntity, setActiveEntity] = useState('products');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadFields(data.user.id); }
    });
  }, []);

  const loadFields = async (userId) => {
    const { data } = await supabase.from('custom_fields').select('*').eq('user_id', userId).order('created_at');
    if (data) setFields(data);
  };

  const handleAdd = async () => {
    if (!form.field_name.trim()) return;
    setLoading(true);
    await supabase.from('custom_fields').insert({ ...form, user_id: user.id });
    setForm({ ...form, field_name: '' });
    loadFields(user.id);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή πεδίου;')) return;
    await supabase.from('custom_fields').delete().eq('id', id);
    loadFields(user.id);
  };

  const filteredFields = fields.filter(f => f.entity === activeEntity);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-medium">Ρυθμίσεις</h1>
          <p className="text-gray-400 text-sm mt-1">Διαχείριση custom πεδίων για κάθε ενότητα</p>
        </div>

        {/* Custom Fields Section */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Custom Πεδία</h2>

          {/* Νέο πεδίο */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Ενότητα</label>
              <select value={form.entity} onChange={e => setForm({ ...form, entity: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                {entities.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Όνομα Πεδίου</label>
              <input type="text" placeholder="π.χ. Χρώμα, ΑΦΜ..." value={form.field_name}
                onChange={e => setForm({ ...form, field_name: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Τύπος</label>
              <select value={form.field_type} onChange={e => setForm({ ...form, field_type: e.target.value })}
                className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={handleAdd} disabled={loading || !form.field_name.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                + Προσθήκη
              </button>
            </div>
          </div>

          {/* Tabs ανά ενότητα */}
          <div className="flex gap-1 border-b border-gray-800 mb-4">
            {entities.map(e => (
              <button key={e.value} onClick={() => setActiveEntity(e.value)}
                className={`px-4 py-2 text-sm transition-colors ${activeEntity === e.value ? 'text-white border-b-2 border-purple-500 font-medium' : 'text-gray-400 hover:text-white'}`}>
                {e.label}
                <span className="ml-2 text-xs bg-gray-800 px-1.5 py-0.5 rounded-full">
                  {fields.filter(f => f.entity === e.value).length}
                </span>
              </button>
            ))}
          </div>

          {/* Λίστα πεδίων */}
          {filteredFields.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">Δεν υπάρχουν custom πεδία για αυτή την ενότητα</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 px-2">Όνομα Πεδίου</th>
                  <th className="text-left py-2 px-2">Τύπος</th>
                  <th className="text-left py-2 px-2">Ενότητα</th>
                  <th className="text-left py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFields.map(f => (
                  <tr key={f.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-2 font-medium">{f.field_name}</td>
                    <td className="py-3 px-2 text-gray-400">{fieldTypes.find(t => t.value === f.field_type)?.label}</td>
                    <td className="py-3 px-2 text-gray-400">{entities.find(e => e.value === f.entity)?.label}</td>
                    <td className="py-3 px-2">
                      <button onClick={() => handleDelete(f.id)} className="text-gray-400 hover:text-red-400 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Info */}
        <div className="bg-gray-900 rounded-2xl p-6">
          <h2 className="text-lg font-medium mb-3">Πώς λειτουργούν τα Custom Πεδία</h2>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <p>1. Πρόσθεσε ένα custom πεδίο επιλέγοντας ενότητα, όνομα και τύπο</p>
            <p>2. Πήγαινε στην αντίστοιχη ενότητα (π.χ. Προϊόντα)</p>
            <p>3. Όταν προσθέτεις ή επεξεργάζεσαι, θα εμφανίζεται το νέο πεδίο αυτόματα</p>
            <p>4. Τα δεδομένα αποθηκεύονται ξεχωριστά για κάθε εγγραφή</p>
          </div>
        </div>

      </div>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const emptyOrder = {
  customer_id: '',
  date: new Date().toISOString().split('T')[0],
  status: 'Ολοκληρωμένη',
  notes: '',
};

export default function Orders() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyOrder);
  const [items, setItems] = useState([{ product_id: '', quantity: 1, sale_price: 0, cost_price: 0, total: 0, profit: 0 }]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadAll(data.user.id); }
    });
  }, []);

  const loadAll = async (userId) => {
    const [o, oi, c, p, pr] = await Promise.all([
      supabase.from('orders').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('order_items').select('*').eq('user_id', userId),
      supabase.from('Customers').select('*').eq('user_id', userId).order('name'),
      supabase.from('Products').select('*').eq('user_id', userId).order('name'),
      supabase.from('customer_pricing').select('*').eq('user_id', userId),
    ]);
    if (o.data) setOrders(o.data);
    if (oi.data) setOrderItems(oi.data);
    if (c.data) setCustomers(c.data);
    if (p.data) setProducts(p.data);
    if (pr.data) setPricing(pr.data);
  };

  const getCustomerPrice = (customerId, productId) => {
    const special = pricing.find(p => p.customer_id === customerId && p.product_id === productId);
    if (special) return special.sale_price;
    const product = products.find(p => p.id === productId);
    return product?.sale_price || 0;
  };

  const handleCustomerChange = (customerId) => {
    setForm({ ...form, customer_id: customerId });
    setItems(items.map(item => {
      if (!item.product_id) return item;
      const salePrice = getCustomerPrice(customerId, item.product_id);
      const product = products.find(p => p.id === item.product_id);
      const total = salePrice * item.quantity;
      const profit = (salePrice - (product?.cost_price || 0)) * item.quantity;
      return { ...item, sale_price: salePrice, total, profit };
    }));
  };

  const handleItemProductChange = (index, productId) => {
    const product = products.find(p => p.id === productId);
    const salePrice = getCustomerPrice(form.customer_id, productId);
    const total = salePrice * items[index].quantity;
    const profit = (salePrice - (product?.cost_price || 0)) * items[index].quantity;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], product_id: productId, sale_price: salePrice, cost_price: product?.cost_price || 0, total, profit };
    setItems(newItems);
  };

  const handleItemQuantityChange = (index, qty) => {
    const newItems = [...items];
    const item = newItems[index];
    const total = item.sale_price * qty;
    const profit = (item.sale_price - item.cost_price) * qty;
    newItems[index] = { ...item, quantity: qty, total, profit };
    setItems(newItems);
  };

  const handleItemPriceChange = (index, price) => {
    const newItems = [...items];
    const item = newItems[index];
    const total = price * item.quantity;
    const profit = (price - item.cost_price) * item.quantity;
    newItems[index] = { ...item, sale_price: price, total, profit };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, sale_price: 0, cost_price: 0, total: 0, profit: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const orderTotal = items.reduce((sum, i) => sum + (i.total || 0), 0);
  const orderProfit = items.reduce((sum, i) => sum + (i.profit || 0), 0);

  const handleSave = async () => {
    if (!form.customer_id) return alert('Επίλεξε πελάτη!');
    if (items.some(i => !i.product_id)) return alert('Επίλεξε προϊόν σε όλες τις γραμμές!');
    setLoading(true);

    let orderId = editing;
    if (editing) {
      await supabase.from('orders').update({ ...form, total: orderTotal, profit: orderProfit }).eq('id', editing);
      await supabase.from('order_items').delete().eq('order_id', editing);
    } else {
      const { data } = await supabase.from('orders').insert({ ...form, user_id: user.id, total: orderTotal, profit: orderProfit }).select();
      if (data) orderId = data[0].id;
    }

    // Αποθήκευση items
    for (const item of items) {
      await supabase.from('order_items').insert({ ...item, order_id: orderId, user_id: user.id });
      // Μείωση αποθέματος
      if (!editing) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase.from('Products').update({ stock: product.stock - item.quantity }).eq('id', item.product_id);
        }
      }
    }

    setShowForm(false);
    setEditing(null);
    setForm(emptyOrder);
    setItems([{ product_id: '', quantity: 1, sale_price: 0, cost_price: 0, total: 0, profit: 0 }]);
    loadAll(user.id);
    setLoading(false);
  };

  const handleEdit = async (order) => {
    setForm({ customer_id: order.customer_id, date: order.date, status: order.status, notes: order.notes || '' });
    setEditing(order.id);
    const orderItemsData = orderItems.filter(i => i.order_id === order.id);
    setItems(orderItemsData.length > 0 ? orderItemsData : [{ product_id: '', quantity: 1, sale_price: 0, cost_price: 0, total: 0, profit: 0 }]);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή παραγγελίας;')) return;
    await supabase.from('order_items').delete().eq('order_id', id);
    await supabase.from('orders').delete().eq('id', id);
    loadAll(user.id);
  };

  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || '-';
  const getProductName = (id) => products.find(p => p.id === id)?.name || '-';

  const filtered = orders.filter(o => {
    const matchSearch = !search || getCustomerName(o.customer_id).toLowerCase().includes(search.toLowerCase()) || o.notes?.toLowerCase().includes(search.toLowerCase());
    const matchCustomer = !filterCustomer || o.customer_id === filterCustomer;
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchFrom = !filterFrom || o.date >= filterFrom;
    const matchTo = !filterTo || o.date <= filterTo;
    return matchSearch && matchCustomer && matchStatus && matchFrom && matchTo;
  });

  const filteredTotal = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
  const filteredProfit = filtered.reduce((sum, o) => sum + (o.profit || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Παραγγελίες</h1>
          <button onClick={() => { setForm(emptyOrder); setEditing(null); setItems([{ product_id: '', quantity: 1, sale_price: 0, cost_price: 0, total: 0, profit: 0 }]); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Νέα Παραγγελία
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">{editing ? 'Επεξεργασία Παραγγελίας' : 'Νέα Παραγγελία'}</h2>

            {/* Βασικά στοιχεία */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Πελάτης</label>
                <select value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Επίλεξε πελάτη...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ημερομηνία</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Ολοκληρωμένη</option>
                  <option>Εκκρεμής</option>
                  <option>Ακυρωμένη</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-gray-400 text-xs mb-1 block">Σημειώσεις</label>
                <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>

            {/* Προϊόντα */}
            <div className="border border-gray-800 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-gray-400">
                    <th className="text-left py-2 px-3">Προϊόν</th>
                    <th className="text-left py-2 px-3">Ποσότητα</th>
                    <th className="text-left py-2 px-3">Τιμή (€)</th>
                    <th className="text-left py-2 px-3">Σύνολο</th>
                    <th className="text-left py-2 px-3">Κέρδος</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t border-gray-800">
                      <td className="py-2 px-3">
                        <select value={item.product_id} onChange={e => handleItemProductChange(index, e.target.value)}
                          className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">Επίλεξε...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" min="1" value={item.quantity}
                          onChange={e => handleItemQuantityChange(index, parseFloat(e.target.value) || 1)}
                          className="w-24 bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={item.sale_price}
                          onChange={e => handleItemPriceChange(index, parseFloat(e.target.value) || 0)}
                          className="w-24 bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                      </td>
                      <td className="py-2 px-3 font-medium">€{(item.total || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-green-400">€{(item.profit || 0).toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <button onClick={() => removeItem(index)} className="text-gray-500 hover:text-red-400 transition-colors">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mb-4">
              <button onClick={addItem} className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
                + Προσθήκη Προϊόντος
              </button>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-400">Σύνολο: <span className="text-white font-medium">€{orderTotal.toFixed(2)}</span></span>
                <span className="text-gray-400">Κέρδος: <span className="text-green-400 font-medium">€{orderProfit.toFixed(2)}</span></span>
              </div>
            </div>

            <div className="flex gap-3">
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
            <p className="text-gray-400 text-xs mb-1">Παραγγελίες (φίλτρο)</p>
            <p className="text-2xl font-medium">{filtered.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Τζίρος (φίλτρο)</p>
            <p className="text-2xl font-medium">€{filteredTotal.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Κέρδος (φίλτρο)</p>
            <p className="text-2xl font-medium text-green-400">€{filteredProfit.toLocaleString('el-GR', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">Μέση Αξία</p>
            <p className="text-2xl font-medium">€{filtered.length > 0 ? (filteredTotal / filtered.length).toFixed(2) : '0.00'}</p>
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
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Όλα τα Status</option>
            <option>Ολοκληρωμένη</option>
            <option>Εκκρεμής</option>
            <option>Ακυρωμένη</option>
          </select>
          <div className="flex gap-2">
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="w-full bg-gray-900 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
              className="w-full bg-gray-900 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>

        <p className="text-gray-500 text-xs mb-3">{filtered.length} αποτελέσματα</p>

        {/* Λίστα Παραγγελιών */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-12 text-center">
              <p className="text-gray-500">Δεν βρέθηκαν παραγγελίες</p>
            </div>
          ) : filtered.map(order => {
            const items = orderItems.filter(i => i.order_id === order.id);
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="bg-gray-900 rounded-2xl overflow-hidden">
                {/* Order Header */}
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
                    <div>
                      <p className="font-medium">{getCustomerName(order.customer_id)}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{order.date} • {items.length} προϊόντα</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-medium">€{(order.total || 0).toFixed(2)}</p>
                      <p className="text-green-400 text-xs">+€{(order.profit || 0).toFixed(2)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      order.status === 'Ολοκληρωμένη' ? 'bg-green-900 text-green-400' :
                      order.status === 'Εκκρεμής' ? 'bg-yellow-900 text-yellow-400' :
                      'bg-red-900 text-red-400'}`}>
                      {order.status}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={e => { e.stopPropagation(); handleEdit(order); }} className="text-gray-400 hover:text-white transition-colors">✏️</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(order.id); }} className="text-gray-400 hover:text-red-400 transition-colors">🗑️</button>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {isExpanded && (
                  <div className="border-t border-gray-800 px-4 pb-4">
                    {order.notes && <p className="text-gray-400 text-xs py-2">📝 {order.notes}</p>}
                    <table className="w-full text-sm mt-2">
                      <thead>
                        <tr className="text-gray-500 text-xs">
                          <th className="text-left py-1">Προϊόν</th>
                          <th className="text-left py-1">Ποσότητα</th>
                          <th className="text-left py-1">Τιμή</th>
                          <th className="text-left py-1">Σύνολο</th>
                          <th className="text-left py-1">Κέρδος</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id} className="border-t border-gray-800/50">
                            <td className="py-2">{getProductName(item.product_id)}</td>
                            <td className="py-2">{item.quantity}</td>
                            <td className="py-2">€{item.sale_price}</td>
                            <td className="py-2 font-medium">€{(item.total || 0).toFixed(2)}</td>
                            <td className="py-2 text-green-400">€{(item.profit || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const categories = [
  { value: 'meeting', label: 'Συνάντηση', color: '#534AB7' },
  { value: 'deadline', label: 'Deadline', color: '#E24B4A' },
  { value: 'personal', label: 'Προσωπικό', color: '#1D9E75' },
  { value: 'other', label: 'Άλλο', color: '#EF9F27' },
];

const emptyEvent = {
  title: '', description: '', date: '', time: '', category: 'meeting', color: '#534AB7'
};

export default function Calendar() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyEvent);
  const [editing, setEditing] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login';
      else { setUser(data.user); loadEvents(data.user.id); }
    });
  }, []);

  const loadEvents = async (userId) => {
    const { data } = await supabase.from('calendar_events').select('*').eq('user_id', userId);
    if (data) setEvents(data);
  };

  const handleSave = async () => {
    setLoading(true);
    const cat = categories.find(c => c.value === form.category);
    const eventData = { ...form, color: cat?.color || '#534AB7' };
    if (editing) {
      await supabase.from('calendar_events').update(eventData).eq('id', editing);
    } else {
      await supabase.from('calendar_events').insert({ ...eventData, user_id: user.id });
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyEvent);
    loadEvents(user.id);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Διαγραφή event;')) return;
    await supabase.from('calendar_events').delete().eq('id', id);
    loadEvents(user.id);
  };

  const handleEdit = (event) => {
    setForm(event);
    setEditing(event.id);
    setShowForm(true);
  };

  const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const monthNames = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
  const dayNames = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-medium">Ημερολόγιο</h1>
          <button onClick={() => { setForm(emptyEvent); setEditing(null); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            + Νέο Event
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">{editing ? 'Επεξεργασία Event' : 'Νέο Event'}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">Τίτλος</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Κατηγορία</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ημερομηνία</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Ώρα</label>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Περιγραφή</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
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

        <div className="grid grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="col-span-2 bg-gray-900 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <button onClick={prevMonth} className="text-gray-400 hover:text-white transition-colors px-3 py-1">←</button>
              <h2 className="text-lg font-medium">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
              <button onClick={nextMonth} className="text-gray-400 hover:text-white transition-colors px-3 py-1">→</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(d => (
                <div key={d} className="text-center text-gray-400 text-xs py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth(currentDate) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth(currentDate) }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                const isSelected = selectedDate === day;

                return (
                  <div key={day} onClick={() => setSelectedDate(day)}
                    className={`min-h-16 p-1 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-purple-900' : 'hover:bg-gray-800'}`}>
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-purple-600 text-white' : 'text-gray-300'}`}>
                      {day}
                    </div>
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className="text-xs px-1 py-0.5 rounded mb-0.5 truncate"
                        style={{ backgroundColor: e.color + '33', color: e.color }}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-xs text-gray-500">+{dayEvents.length - 2}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events panel */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              {selectedDate ? `${selectedDate} ${monthNames[currentDate.getMonth()]}` : 'Επίλεξε ημέρα'}
            </h3>
            {selectedDate && selectedDateEvents.length === 0 && (
              <p className="text-gray-500 text-sm">Δεν υπάρχουν events</p>
            )}
            {selectedDateEvents.map(e => (
              <div key={e.id} className="mb-3 p-3 rounded-xl" style={{ backgroundColor: e.color + '22', borderLeft: `3px solid ${e.color}` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{e.title}</p>
                    {e.time && <p className="text-gray-400 text-xs mt-0.5">🕐 {e.time}</p>}
                    {e.description && <p className="text-gray-400 text-xs mt-0.5">{e.description}</p>}
                    <p className="text-xs mt-1" style={{ color: e.color }}>{categories.find(c => c.value === e.category)?.label}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(e)} className="text-gray-400 hover:text-white text-xs">✏️</button>
                    <button onClick={() => handleDelete(e.id)} className="text-gray-400 hover:text-red-400 text-xs">🗑️</button>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-6 border-t border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Επερχόμενα</h3>
              {events
                .filter(e => e.date >= new Date().toISOString().split('T')[0])
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} className="mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: e.color }}></div>
                    <div>
                      <p className="text-xs font-medium">{e.title}</p>
                      <p className="text-xs text-gray-500">{e.date} {e.time}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else window.location.href = '/';
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setError('Έλεγξε το email σου για επιβεβαίωση!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md">
        <h1 className="text-2xl font-medium text-white mb-2">CEO Dashboard</h1>
        <p className="text-gray-400 text-sm mb-8">Συνδέσου για να δεις τα δεδομένα σου</p>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="Κωδικός"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-3 font-medium transition-colors"
          >
            {loading ? 'Φόρτωση...' : 'Σύνδεση'}
          </button>

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-4 py-3 font-medium transition-colors"
          >
            Δημιουργία λογαριασμού
          </button>
        </div>
      </div>
    </div>
  );
}
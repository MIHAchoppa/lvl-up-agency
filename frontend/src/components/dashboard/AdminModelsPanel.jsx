import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminModelsPanel() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    axios.get(`${API}/ai/models`).then(res => {
      if (!mounted) return;
      setModels(res.data || []);
    }).catch(err => {
      setError(err?.response?.data?.detail || 'Failed to load models');
    }).finally(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="text-gray-300">Loading models…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-yellow-400">Groq Models</div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((m) => (
          <div key={m.id} className="p-4 rounded-lg bg-[#0b0b0b] border border-yellow-500/20">
            <div className="font-semibold text-white">{m.id}</div>
            <div className="text-sm text-gray-400 mt-1">Owned by: {m.owned_by}</div>
            {m.context_window && (
              <div className="text-sm text-gray-400">Context: {m.context_window}</div>
            )}
            <div className="text-xs text-gray-500 mt-2">Active: {String(m.active)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

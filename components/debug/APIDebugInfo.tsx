'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function APIDebugInfo() {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/auth/me');
      console.log('Direct API call response:', response);
      setApiResponse(response);
    } catch (err: any) {
      console.error('Direct API call error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testAPI();
  }, []);

  return (
    <div className="fixed top-80 right-4 bg-white p-4 border rounded shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">API Debug Info</h3>
      <button 
        onClick={testAPI} 
        disabled={loading}
        className="mb-2 px-2 py-1 bg-blue-500 text-white text-xs rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
      {error && <div className="text-red-500 text-xs mb-2">Error: {error}</div>}
      <pre className="text-xs overflow-auto max-h-64">
        {JSON.stringify(apiResponse, null, 2)}
      </pre>
    </div>
  );
}

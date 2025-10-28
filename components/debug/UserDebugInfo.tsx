'use client';

import { useAuth } from '@/features/auth/hooks';

export function UserDebugInfo() {
  const { user, isLoading, error } = useAuth();

  if (isLoading) return <div>Loading user data...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="fixed top-20 right-4 bg-white p-4 border rounded shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-sm mb-2">User Debug Info</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}

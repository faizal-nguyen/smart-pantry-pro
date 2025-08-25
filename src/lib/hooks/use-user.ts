/**
 * User hook - simplified version for Material You demo
 * Can be replaced with actual auth implementation
 */

import { useState, useEffect } from 'react';

export interface User {
  id: string;
  email?: string;
  name?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Simulate user loading
    // In production, this would fetch from auth provider
    setTimeout(() => {
      setUser({
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
      });
      setLoading(false);
    }, 100);
  }, []);
  
  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
  };
}
import { useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate auth check
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        setUser({ id: '1', name: 'Test User' });
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (username: string, password: string) => {
    localStorage.setItem('token', 'mock-token');
    setUser({ id: '1', name: username });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, loading, login, logout };
}

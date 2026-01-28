import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (email, password) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Attempting login for:', email);
      
      const response = await fetch('http://192.168.1.63:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          password: password.trim()
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response body:', errorText);
        
        if (response.status === 403) {
          throw new Error('Invalid credentials. Please check your email and password.');
        } else if (response.status === 404) {
          throw new Error('Authentication service not found. Please contact support.');
        } else {
          throw new Error(`Login failed: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('Login response body:', data);

      // Support two possible response shapes depending on backend implementation:
      // { token, user }  OR  { accessToken, refreshToken, user }
      const token = data.token || data.accessToken;
      const refreshToken = data.refreshToken || null;

      if (token) {
        // Keep legacy 'token' key for other parts of the app, but also store full tokens if available
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthenticated(true);
        return { success: true, user: data.user };
      } else {
        // If backend provided an error message, surface it
        const serverMsg = data && (data.error || data.message || JSON.stringify(data));
        throw new Error(serverMsg || 'No auth token received from server');
      }
      
    } catch (error) {
      console.error('Login error:', error.message);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
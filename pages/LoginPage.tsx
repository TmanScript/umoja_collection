
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { verifyAdminLogin } from '../services/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: (name: string, id: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyAdminLogin(username, password);
      
      if (result.success && result.name && result.id) {
        onLoginSuccess(result.name, result.id);
      } else {
        // Use specific error from service if available, otherwise default to generic
        setError(result.error || "Invalid phone number or password.");
      }
    } catch (err: any) {
      // Catch unforeseen errors that didn't come from the service return object
      setError(err.message || "An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="https://thabisot33.github.io/logo/Umoja%20Logo%20Web_320x86_png.png" 
            alt="Umoja Logo" 
            className="h-16 w-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
          <p className="text-gray-500 text-sm mt-1">Please sign in to access inventory swap.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
             <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
             {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
              placeholder="Enter your password"
              required
            />
          </div>

          <Button 
            type="submit" 
            isLoading={loading} 
            className="w-full shadow-lg shadow-pink-200"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Umoja Inventory System v2.0
        </div>
      </div>
    </div>
  );
};

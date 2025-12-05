import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { API_BASE_URL, DEFAULT_TOKEN } from '../constants';

interface SettingsModalProps {
  onClose: () => void;
  onSave: (token: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSave }) => {
  const [token, setToken] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('umoja_token');
    // If user has a stored token, show it. Otherwise show the hardcoded default.
    setToken(stored || DEFAULT_TOKEN);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Configuration</h2>
        
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
            <div className="p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 break-all">
                {API_BASE_URL}
            </div>
            <p className="text-xs text-gray-500 mt-1">Defined in system constants.</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Basic Token</label>
          <input 
            type="text" 
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-mono text-xs"
            placeholder="Base64 encoded string"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">
            Required to authenticate API requests. Please enter your Basic Auth hash (Base64).
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(token)}>Save Configuration</Button>
        </div>
      </div>
    </div>
  );
};
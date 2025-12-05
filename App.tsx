import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { SwapPage } from './pages/SwapPage';
import { LoginPage } from './pages/LoginPage';
import { HistoryPage } from './pages/HistoryPage';
import { CollectionPage } from './pages/CollectionPage';
import { DashboardPage } from './pages/DashboardPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsModal } from './components/SettingsModal';
import { umojaService } from './services/umojaService';

// NavLink Component for cleaner header code
const NavLink = ({ to, children }: React.PropsWithChildren<{ to: string }>) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-pink-50 text-pink-700' 
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  );
};

const AppContent: React.FC<{
  userName: string;
  adminId: string;
  handleLogout: () => void;
  setShowSettings: (show: boolean) => void;
  hasToken: boolean;
}> = ({ userName, adminId, handleLogout, setShowSettings, hasToken }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity">
                <img 
                  src="https://thabisot33.github.io/logo/Umoja%20Logo%20Web_320x86_png.png" 
                  alt="Umoja Logo" 
                  className="h-10 w-auto"
                  onError={(e) => {
                    // Fallback if image fails
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <span className="hidden font-bold text-2xl text-pink-600 tracking-tight font-serif italic">Umoja</span>
              </Link>
              <div className="hidden sm:flex sm:space-x-2 items-center">
                 <NavLink to="/">Dashboard</NavLink>
                 <NavLink to="/swap">Swap Device</NavLink>
                 <NavLink to="/collection">Device Collection</NavLink>
                 <NavLink to="/stats">Statistics</NavLink>
                 <NavLink to="/history">My History</NavLink>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {userName && (
                <span className="text-sm font-medium text-gray-700 hidden md:block">
                  Welcome, <span className="text-pink-600">{userName}</span>
                </span>
              )}
              <button 
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-pink-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
         <Routes>
           <Route path="/" element={<DashboardPage userName={userName} />} />
           <Route path="/swap" element={<SwapPage hasToken={hasToken} adminId={adminId} adminName={userName} onOpenSettings={() => setShowSettings(true)} />} />
           <Route path="/collection" element={<CollectionPage hasToken={hasToken} adminName={userName} />} />
           <Route path="/stats" element={<StatsPage />} />
           <Route path="/history" element={<HistoryPage adminId={adminId} adminName={userName} />} />
         </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  // Default to true because we now have a default token for the API
  const [hasToken, setHasToken] = useState(true);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [adminId, setAdminId] = useState<string>('');

  useEffect(() => {
    // Check for stored token override for API
    const storedToken = localStorage.getItem('umoja_token');
    if (storedToken) {
      umojaService.setToken(storedToken);
    }

    // Check for Login Session
    const loggedIn = localStorage.getItem('umoja_auth_session');
    const storedName = localStorage.getItem('umoja_auth_name');
    const storedId = localStorage.getItem('umoja_auth_id');

    if (loggedIn === 'true') {
      // Validate we have the ID (critical for database Foreign Keys)
      if (storedId && storedId !== 'undefined' && storedId !== 'null') {
        setIsAuthenticated(true);
        if (storedName) setUserName(storedName);
        setAdminId(storedId);
      } else {
        // Corrupt session (no ID), force logout
        console.warn("Session found but no valid Admin ID. Forcing logout.");
        handleLogout();
      }
    }
    setAuthLoading(false);
  }, []);

  const handleSaveToken = (token: string) => {
    localStorage.setItem('umoja_token', token);
    umojaService.setToken(token);
    setHasToken(true);
    setShowSettings(false);
  };

  const handleLoginSuccess = (name: string, id: string) => {
    localStorage.setItem('umoja_auth_session', 'true');
    localStorage.setItem('umoja_auth_name', name);
    localStorage.setItem('umoja_auth_id', id);
    setUserName(name);
    setAdminId(id);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('umoja_auth_session');
    localStorage.removeItem('umoja_auth_name');
    localStorage.removeItem('umoja_auth_id');
    setUserName('');
    setAdminId('');
    setIsAuthenticated(false);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-pink-600">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <AppContent 
        userName={userName}
        adminId={adminId}
        handleLogout={handleLogout}
        setShowSettings={setShowSettings}
        hasToken={hasToken}
      />
      
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          onSave={handleSaveToken} 
        />
      )}
    </Router>
  );
};

export default App;

import React from 'react';
import { Link } from 'react-router-dom';

interface DashboardPageProps {
  userName: string;
  adminId: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ userName, adminId }) => {
  const isGeneralViewer = adminId === 'GENERAL_VIEWER';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, <span className="text-pink-600">{userName}</span></h1>
        <p className="text-gray-500">
            {isGeneralViewer ? 'Viewing system reports and global history.' : 'What would you like to manage today?'}
        </p>
      </div>

      {isGeneralViewer ? (
        // --- READ ONLY DASHBOARD ---
        <div className="grid md:grid-cols-2 gap-8">
            {/* Statistics Card */}
            <Link to="/stats" className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-purple-300 transition-all duration-300 text-center">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-100 transition-colors">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Statistics</h2>
                <p className="text-gray-500 text-sm">View operational statistics, sales data, and monthly trends.</p>
                <div className="mt-8">
                    <span className="text-purple-600 font-medium group-hover:underline underline-offset-4">View Reports →</span>
                </div>
            </Link>

            {/* History Card */}
             <Link to="/history" className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-blue-300 transition-all duration-300 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-100 transition-colors">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Global History</h2>
                <p className="text-gray-500 text-sm">Review transaction logs for all agents, swaps, and collections.</p>
                <div className="mt-8">
                    <span className="text-blue-600 font-medium group-hover:underline underline-offset-4">View Logs →</span>
                </div>
            </Link>
        </div>
      ) : (
        // --- OPERATIONAL DASHBOARD ---
        <div className="grid md:grid-cols-2 gap-8">
            {/* Swap Card */}
            <Link to="/swap" className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-pink-300 transition-all duration-300 text-center">
                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-pink-100 transition-colors">
                    <svg className="w-10 h-10 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Swap Device</h2>
                <p className="text-gray-500 text-sm">Return an old device and assign a new one to a customer.</p>
                <div className="mt-8">
                    <span className="text-pink-600 font-medium group-hover:underline underline-offset-4">Start Swap →</span>
                </div>
            </Link>

            {/* Collection Card */}
            <Link to="/collection" className="group bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-xl hover:border-cyan-300 transition-all duration-300 text-center">
                <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-cyan-100 transition-colors">
                    <svg className="w-10 h-10 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Device Collection</h2>
                <p className="text-gray-500 text-sm">Collect returned Routers and SIMs, and update customer status.</p>
                <div className="mt-8">
                    <span className="text-cyan-600 font-medium group-hover:underline underline-offset-4">Start Collection →</span>
                </div>
            </Link>
        </div>
      )}

      {/* Footer Link for regular admins */}
       {!isGeneralViewer && (
           <div className="mt-12 text-center">
             <Link to="/history" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">View My Transaction History</Link>
           </div>
       )}
    </div>
  );
};

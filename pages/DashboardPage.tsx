
import React from 'react';
import { Link } from 'react-router-dom';

interface DashboardPageProps {
  userName: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ userName }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, <span className="text-pink-600">{userName}</span></h1>
        <p className="text-gray-500">What would you like to manage today?</p>
      </div>

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

       <div className="mt-12 text-center">
         <Link to="/history" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">View My Transaction History</Link>
       </div>
    </div>
  );
};

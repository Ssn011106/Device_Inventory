import React from 'react';
import { User, AppTab } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children, activeTab, setActiveTab }) => {
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">DT</div>
            <h1 className="text-xl font-black tracking-tight lowercase">devicetracker</h1>
          </div>
          <div className="mt-4 inline-flex items-center px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/50">
            <div className={`w-2 h-2 rounded-full mr-2 ${user.role === 'ADMIN' ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'}`}></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">{user.role}</p>
          </div>
        </div>
        
        <nav className="flex-1 mt-8 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 ${
              activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 ${
              activeTab === 'inventory' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Device Inventory
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 ${
                  activeTab === 'users' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                User Access
              </button>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 ${
                  activeTab === 'settings' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
            </>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center mb-6 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-400 flex items-center justify-center text-sm font-black shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-black truncate text-slate-100">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-tighter">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center px-4 py-3 text-xs font-black text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all uppercase tracking-widest"
          >
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#F8FAFC] relative">
        <div className="max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db, RegisteredUser } from '../services/mockDatabase';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TEAM_MEMBER' as UserRole });
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await db.getRegisteredUsers();
      // Ensure we always have an array even on API failure
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("User Directory Error:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    const unsubscribe = db.subscribe(loadUsers);
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (window.confirm('SECURITY ALERT: This will permanently revoke this identity\'s access to the terminal. Proceed?')) {
      try {
        await db.deleteUser(id);
        await loadUsers();
      } catch (err: any) {
        alert(err.message || "Failed to delete user");
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Incomplete credentials. Please fill all fields.");
      return;
    }

    try {
      await db.registerUser({ ...form, isVerified: true });
      setShowAddModal(false);
      setForm({ name: '', email: '', password: '', role: 'TEAM_MEMBER' });
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Provisioning failed.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-12 space-y-12">
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <h1 className="text-[64px] font-black text-slate-900 tracking-tighter leading-none">User Access</h1>
          <p className="text-slate-500 font-bold text-lg mt-4">Identity & Authorization Management</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black hover:bg-indigo-600 transition-all flex items-center uppercase tracking-widest text-[10px] whitespace-nowrap shadow-2xl shadow-indigo-100"
        >
          Provision New Identity
        </button>
      </header>

      <div className="bg-white rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Identity</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority Level</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying User Registry...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-24 text-center">
                    <p className="text-slate-400 font-bold text-lg">No active identities found in database.</p>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id || Math.random().toString()} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-8">
                      <div className="flex items-center space-x-6">
                        <div className="w-16 h-16 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-slate-200 uppercase">
                          {String(u?.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900 leading-tight">{u?.name || 'Unknown User'}</p>
                          <p className="text-xs font-bold text-slate-400 mt-1">{u?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <span className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${u?.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {String(u?.role || 'TEAM_MEMBER').replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        Active
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      {u?.email !== 'admin@devicetracker.io' && u?.email !== 'ss5551@zebra.com' ? (
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 px-6 py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-red-100"
                        >
                          Revoke Access
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-6 py-3 cursor-not-allowed">Protected Root</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-xl p-16 relative border border-slate-100 overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600"></div>
            
            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">New Identity</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Access Provisioning Protocol</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-4 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                title="Close Provisioning"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label>
                <input required className="w-full px-8 py-5 rounded-3xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-500 transition-all text-slate-900" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Marcus Aurelius" />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
                <input type="email" required className="w-full px-8 py-5 rounded-3xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-500 transition-all text-slate-900" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="user@zebra.com" />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Passphrase</label>
                <input type="password" required className="w-full px-8 py-5 rounded-3xl border border-slate-100 bg-slate-50 font-bold outline-none focus:border-indigo-500 transition-all text-slate-900" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authority Role</label>
                <select className="w-full px-8 py-5 rounded-3xl border border-slate-100 bg-slate-50 font-bold appearance-none outline-none focus:border-indigo-500 transition-all text-slate-900" value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})}>
                  <option value="TEAM_MEMBER">Team Member (Inventory Access Only)</option>
                  <option value="ADMIN">System Admin (Full Console Access)</option>
                </select>
              </div>

              {error && (
                <div className="p-5 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
              )}

              <div className="pt-8 flex gap-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-indigo-600 transition-all">
                  Confirm Identity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="pt-12 flex items-center justify-center space-x-4 opacity-40">
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Directory Services Online</span>
      </div>
    </div>
  );
};

export default UsersPage;

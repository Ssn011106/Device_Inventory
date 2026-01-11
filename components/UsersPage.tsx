
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
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    return db.subscribe(loadUsers);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Revoke access for this user?')) {
      await db.deleteUser(id);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const newUser: RegisteredUser = {
        id: Math.random().toString(36).substr(2, 9),
        ...form
      };
      await db.registerUser(newUser);
      setShowAddModal(false);
      setForm({ name: '', email: '', password: '', role: 'TEAM_MEMBER' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-7xl space-y-12 pb-24 p-12">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter">Identity Control</h1>
          <p className="text-slate-500 font-semibold text-xl mt-2">Manage organizational access and roles</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 text-white px-10 py-5 rounded-[1.25rem] font-black hover:bg-indigo-700 transition-all flex items-center uppercase tracking-widest text-[10px] whitespace-nowrap shadow-xl"
        >
          Provision New User
        </button>
      </header>

      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Profile</th>
              <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority Level</th>
              <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="group hover:bg-slate-50/30 transition-all">
                <td className="px-10 py-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{u.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-8">
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-10 py-8 text-right">
                  {u.email !== 'admin@devicetracker.io' && (
                    <button 
                      onClick={() => handleDelete(u.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-12 relative">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Create Account</h2>
            <p className="text-slate-400 font-bold text-sm mb-8 uppercase tracking-widest">Provision manual access</p>
            
            <form onSubmit={handleAddUser} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input type="email" required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Password</label>
                <input type="password" required className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Role</label>
                <select className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-bold appearance-none" value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})}>
                  <option value="TEAM_MEMBER">Team Member</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
              <div className="pt-4 flex space-x-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;

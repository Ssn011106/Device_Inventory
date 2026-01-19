import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Device, InventoryStats, AppSettings, EquipmentStat, AppTab, UserRole } from './types';
import { db, RegisteredUser } from './services/mockDatabase';
import { exportToCSV, parseCSV } from './utils/csvHelpers';
import { DEFAULT_SETTINGS } from './constants'; 
import Layout from './components/Layout';
import StatsCards from './components/StatsCards';
import InventoryTable from './components/InventoryTable';
import DeviceModal from './components/DeviceModal';
import HistoryModal from './components/HistoryModal';
import AssetsByEquipment from './components/AssetsByEquipment';
import SettingsPage from './components/SettingsPage';
import UsersPage from './components/UsersPage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(db.getCurrentUser());
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isServerLive, setIsServerLive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>();
  const [viewingHistory, setViewingHistory] = useState<Device | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEAM_MEMBER');
  const [syncing, setSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const connected = await db.checkConnection();
      setIsServerLive(connected);
      
      const [d, s] = await Promise.all([
        db.getDevices(),
        db.getSettings()
      ]);
      
      setDevices(d || []);
      setSettings(s || DEFAULT_SETTINGS);
    } catch (err) {
      console.error('Data Load Failed:', err);
      setIsServerLive(false);
      setSettings(DEFAULT_SETTINGS);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = db.subscribe(() => {
      setIsServerLive(db.isConnected);
      const user = db.getCurrentUser();
      if (user?.id !== currentUser?.id) {
        setCurrentUser(user);
      }
    });
    return unsubscribe;
  }, [currentUser?.id]);

  const filteredDevices = useMemo(() => {
    if (!settings) return [];
    const sorted = [...devices].sort((a, b) => {
      const dateA = String(a.entryDate || '').toLowerCase();
      const dateB = String(b.entryDate || '').toLowerCase();
      return dateB.localeCompare(dateA);
    });
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(d => {
      return settings.fields.some(f => {
        const val = d[f.id];
        return val && String(val).toLowerCase().includes(q);
      });
    });
  }, [devices, searchQuery, settings]);

  const stats = useMemo<InventoryStats>(() => {
    return {
      total: devices.length,
      available: devices.filter(d => String(d.status).toLowerCase() === 'available').length,
      inUse: devices.filter(d => String(d.status).toLowerCase() === 'in use').length,
      needRepair: devices.filter(d => String(d.status).toLowerCase() === 'need repair').length,
    };
  }, [devices]);

  const equipmentStats = useMemo<EquipmentStat[]>(() => {
    if (!settings) return [];
    const primaryField = settings.fields.find(f => f.isPrimary) || settings.fields[1]; 
    const counts: Record<string, { count: number; manufacturer: string }> = {};
    devices.forEach(d => {
      const key = d[primaryField.id] || 'Unlabeled Equipment';
      if (!counts[key]) {
        counts[key] = { count: 0, manufacturer: String(d.deviceType || 'General') };
      }
      counts[key].count++;
    });
    return Object.entries(counts).map(([description, info]) => ({
      description,
      manufacturer: info.manufacturer,
      count: info.count
    })).sort((a, b) => b.count - a.count);
  }, [devices, settings]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      const user = await db.loginUser(email, password);
      db.setCurrentUser(user);
      setActiveTab('dashboard');
      await fetchData(); 
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    try {
      const newUser: RegisteredUser = {
        id: Math.random().toString(36).substr(2, 9),
        email, name, password, role: selectedRole
      };
      await db.registerUser(newUser);
      const userObj = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role };
      db.setCurrentUser(userObj);
      setActiveTab('dashboard');
      await fetchData(); 
    } catch (err: any) {
      setLoginError(err.message || "Registration failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    db.setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleResetSystem = async () => {
    if (!window.confirm("CRITICAL: Wipe all live MongoDB Atlas data? This cannot be undone.")) return;
    setLoading(true);
    try {
      await db.hardReset();
      window.location.reload();
    } catch (err) {
      alert("Reset encountered a network error.");
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (currentUser?.role !== 'ADMIN') return;
    if (window.confirm('Are you sure you want to permanently delete this asset record from Atlas?')) {
      const updated = devices.filter(d => d.id !== id);
      setDevices(updated);
      await db.saveDevices(updated);
    }
  };

  const handleSaveDevice = async (data: Partial<Device>) => {
    const now = new Date().toISOString();
    if (editingDevice) {
      const updatedDevices = devices.map(d => {
        if (d.id === editingDevice.id) {
          const updated = { ...d, ...data };
          updated.historyLog = updated.historyLog || [];
          updated.historyLog.push({ 
            id: Math.random().toString(36).substr(2, 9), 
            date: now, 
            user: currentUser?.name || 'System', 
            action: 'Record Update', 
            details: 'Field modification saved to live DB' 
          });
          return updated;
        }
        return d;
      });
      setDevices(updatedDevices);
      await db.saveDevices(updatedDevices);
    } else {
      const newDevice: Device = { 
        ...data as any, 
        id: Math.random().toString(36).substr(2, 9), 
        historyLog: [{ 
          id: Math.random().toString(36).substr(2, 9), 
          date: now, 
          user: currentUser?.name || 'System', 
          action: 'New Registration', 
          details: 'Initialized in permanent database' 
        }] 
      };
      await db.saveDevices([newDevice]);
      await fetchData(); 
    }
    setIsModalOpen(false);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await db.saveSettings(newSettings);
    await fetchData(); 
  };

  const handleExportCSV = () => {
    if (!settings || currentUser?.role !== 'ADMIN') return;
    exportToCSV(devices, settings.fields);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings || currentUser?.role !== 'ADMIN') return;
    setSyncing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) { setSyncing(false); return; }
      try {
        const parsedData = parseCSV(text, settings.fields);
        const now = new Date().toISOString();
        const newDevicesFromCSV: Device[] = parsedData.map(item => ({
          ...item as any,
          historyLog: [{ 
            id: Math.random().toString(36).substr(2, 9), 
            date: now, 
            user: currentUser?.name || 'System', 
            action: 'Bulk Import', 
            details: 'Imported via permanent CSV sync' 
          }]
        }));
        
        if (newDevicesFromCSV.length > 0) {
          await db.saveDevices(newDevicesFromCSV);
          await fetchData();
          alert(`Success! ${newDevicesFromCSV.length} items appended to live database.`);
        }
      } catch (err) {
        console.error(err);
        alert("Import Error: Mapping mismatch or network failure.");
      }
      setSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans px-6 text-center">
        <div className="w-20 h-20 border-t-4 border-indigo-500 rounded-full animate-spin mb-10"></div>
        <h2 className="text-2xl font-black uppercase tracking-[0.3em] mb-4">Establishing Live Node</h2>
        <p className="text-slate-500 font-bold text-sm">Authenticating with MongoDB Atlas cluster...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans overflow-hidden">
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-500">
          {!isServerLive && (
            <div className="absolute top-0 left-0 w-full bg-orange-500 text-[10px] text-white font-black text-center py-2 uppercase tracking-widest animate-pulse z-10">
              ⚠️ Database Connection Unavailable
            </div>
          )}
          <div className="flex flex-col items-center mb-10 mt-4">
            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center font-black text-5xl text-white shadow-2xl mb-8">DT</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter lowercase">devicetracker</h1>
            <div className="mt-4 inline-block px-4 py-2 rounded-full bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100">
              {isSignup ? `Enrollment: ${selectedRole.replace('_', ' ')}` : 'Hardware Identity Gateway'}
            </div>
          </div>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-6">
            {isSignup && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Label</label>
                  <input name="name" type="text" required className="w-full px-7 py-5 rounded-3xl border border-slate-100 bg-slate-50 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300" placeholder="e.g. John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Tier</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setSelectedRole('TEAM_MEMBER')} className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedRole === 'TEAM_MEMBER' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}>Member</button>
                    <button type="button" onClick={() => setSelectedRole('ADMIN')} className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedRole === 'ADMIN' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}>Admin</button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Corporate Email</label>
              <input name="email" type="email" required className="w-full px-7 py-5 rounded-3xl border border-slate-100 bg-slate-50 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300" placeholder="name@domain.com" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
              <input name="password" type="password" required className="w-full px-7 py-5 rounded-3xl border border-slate-100 bg-slate-50 font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300" placeholder="••••••••" />
            </div>

            {loginError && (
              <div className="p-5 bg-red-50 text-red-600 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] border border-red-100 text-center animate-shake">
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black hover:bg-indigo-600 transition-all shadow-2xl uppercase tracking-[0.3em] text-xs flex items-center justify-center disabled:opacity-50 active:scale-95"
            >
              {authLoading && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3"></div>
              )}
              {isSignup ? 'Register New User' : 'Login'}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => { setIsSignup(!isSignup); setLoginError(null); }} 
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-8"
            >
              {isSignup ? 'Already Exists' : "Create a New User"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <Layout user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="p-8 lg:p-12 space-y-12 max-w-full overflow-x-hidden">
        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />

        <div className="fixed bottom-8 right-8 z-50">
          <div className={`px-6 py-4 rounded-full shadow-2xl flex items-center space-x-3 border transition-all duration-500 ${isServerLive ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-200' : 'bg-orange-600 border-orange-500 text-white shadow-orange-200'}`}>
            <div className={`w-2.5 h-2.5 rounded-full bg-white ${isServerLive ? 'animate-pulse' : ''}`}></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {syncing ? 'Cloud Syncing...' : (isServerLive ? 'Atlas Live: Primary Data' : 'Resolving Atlas Node...')}
            </span>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">Dashboard</h1>
                <p className="text-slate-500 font-bold text-lg mt-3">Verified hardware nodes</p>
                <div className="mt-6 flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${isServerLive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    Primary: Database Verified
                  </span>
                  <span className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                    Authority: {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
            <StatsCards stats={stats} />
            <AssetsByEquipment stats={equipmentStats} />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div>
                <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">Device Inventory</h1>
                <p className="text-slate-500 font-bold text-lg mt-3">Monitoring {devices.length} Endpoints</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-white rounded-[2rem] shadow-xl p-2.5 border border-slate-100 gap-2 items-center">
                  {isAdmin ? (
                    <>
                      <button onClick={handleExportCSV} className="px-6 py-4 rounded-2xl font-black text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]">Export</button>
                      <button onClick={() => fileInputRef.current?.click()} className="px-6 py-4 rounded-2xl font-black text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px]">Import CSV</button>
                      <button onClick={() => { setEditingDevice(undefined); setIsModalOpen(true); }} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black hover:bg-indigo-600 transition-all uppercase tracking-widest text-[10px] shadow-xl active:scale-95">Register New Hardware</button>
                    </>
                  ) : (
                    <div className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center">
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      Read-Only Authority Level
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative group">
              <input 
                type="text" 
                placeholder="Query hardware by tag, S/N, owner, or specific technical spec..." 
                className="w-full pl-20 pr-10 py-8 rounded-[3rem] border-none shadow-sm focus:ring-[12px] focus:ring-indigo-500/5 outline-none bg-white transition-all text-2xl font-black text-slate-800 placeholder:text-slate-200" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
              <svg className="w-10 h-10 text-slate-200 absolute left-8 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <InventoryTable 
              devices={filteredDevices} 
              role={currentUser.role} 
              fields={settings.fields} 
              onEdit={(d) => { setEditingDevice(d); setIsModalOpen(true); }} 
              onDelete={handleDeleteDevice} 
              onViewHistory={setViewingHistory} 
            />
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <UsersPage />
          </div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsPage settings={settings} onUpdate={handleUpdateSettings} role={currentUser.role} onReset={handleResetSystem} />
          </div>
        )}

        <DeviceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveDevice} device={editingDevice} role={currentUser.role} fields={settings.fields} statusOptions={settings.statusOptions} />
        <HistoryModal device={viewingHistory} onClose={() => setViewingHistory(null)} />
      </div>
    </Layout>
  );
};

export default App;
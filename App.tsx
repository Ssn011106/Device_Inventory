
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Device, InventoryStats, AppSettings, EquipmentStat, AppTab, UserRole } from './types';
import { db, RegisteredUser } from './services/mockDatabase';
import { exportToCSV, parseCSV } from './utils/csvHelpers';
import { DEFAULT_SETTINGS, MOCK_DEVICES } from './constants'; 
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
      
      const finalSettings = s || DEFAULT_SETTINGS;
      const hasInitialized = localStorage.getItem('dt_has_data') === 'true';
      let finalDevices = d;
      
      if (!hasInitialized && (!d || d.length === 0)) {
        finalDevices = MOCK_DEVICES;
      }

      setDevices(finalDevices || []);
      setSettings(finalSettings);
    } catch (err) {
      setIsServerLive(false);
      setSettings(DEFAULT_SETTINGS);
      const local = localStorage.getItem('dt_devices');
      setDevices(local ? JSON.parse(local) : MOCK_DEVICES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = db.subscribe(() => {
      setIsServerLive(db.isConnected);
      setCurrentUser(db.getCurrentUser());
    });
    return unsubscribe;
  }, []);

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
    const primaryField = settings.fields.find(f => f.isPrimary) || settings.fields[2]; 
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
      // Force return to dashboard on fresh login
      setActiveTab('dashboard');
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
      // Auto-login after signup
      db.setCurrentUser({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });
      setActiveTab('dashboard');
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
    if (!window.confirm("This will DEEP-RESET MongoDB and your browser cache. All records will be purged. Proceed?")) return;
    setLoading(true);
    try {
      localStorage.removeItem('dt_has_data');
      await db.hardReset();
      window.location.reload();
    } catch (err) {
      alert("Reset failed. Check server connection.");
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (currentUser?.role !== 'ADMIN') return;
    if (window.confirm('Delete this asset?')) {
      const updated = devices.filter(d => d.id !== id);
      setDevices(updated);
      await db.saveDevices(updated);
    }
  };

  const handleSaveDevice = async (data: Partial<Device>) => {
    let newDevices = [...devices];
    const now = new Date().toISOString();
    if (editingDevice) {
      newDevices = newDevices.map(d => {
        if (d.id === editingDevice.id) {
          const updated = { ...d, ...data };
          updated.historyLog = updated.historyLog || [];
          updated.historyLog.push({ id: Math.random().toString(36).substr(2, 9), date: now, user: currentUser?.name || 'System', action: 'Update', details: 'Properties modified' });
          return updated;
        }
        return d;
      });
    } else {
      const newDevice: Device = { ...data as any, id: Math.random().toString(36).substr(2, 9), historyLog: [{ id: Math.random().toString(36).substr(2, 9), date: now, user: currentUser?.name || 'System', action: 'Creation', details: 'Initial registration' }] };
      newDevices.push(newDevice);
    }
    setDevices(newDevices);
    localStorage.setItem('dt_has_data', 'true');
    await db.saveDevices(newDevices);
    setIsModalOpen(false);
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await db.saveSettings(newSettings);
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
          id: Math.random().toString(36).substr(2, 9),
          historyLog: [{ id: Math.random().toString(36).substr(2, 9), date: now, user: currentUser?.name || 'System', action: 'CSV Import', details: 'Batch imported from file' }]
        }));
        
        if (newDevicesFromCSV.length > 0) {
          setDevices(newDevicesFromCSV);
          localStorage.setItem('dt_has_data', 'true');
          await db.saveDevices(newDevicesFromCSV);
          alert(`Success! ${newDevicesFromCSV.length} items are now stored in MongoDB and Local Storage.`);
        }
      } catch (err) {
        alert("Failed to parse CSV. Check console for details.");
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
        <h2 className="text-2xl font-black uppercase tracking-[0.3em] mb-4">Initializing Core</h2>
        <p className="text-slate-500 font-bold text-sm">Syncing with MongoDB database...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md relative overflow-hidden transition-all duration-500">
          {!isServerLive && !db.forceOffline && (
            <div className="absolute top-0 left-0 w-full bg-orange-500 text-[10px] text-white font-black text-center py-2 uppercase tracking-widest animate-pulse">
              ⚠️ Database Connection Offline
            </div>
          )}
          <div className="flex flex-col items-center mb-8 mt-4">
            <div className="w-20 h-20 bg-slate-900 rounded-[1.5rem] flex items-center justify-center font-black text-4xl text-white shadow-2xl mb-6">DT</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter lowercase">devicetracker</h1>
            <div className="mt-2 inline-block px-4 py-1.5 rounded-full bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-100">
              {isSignup ? `Provisioning: ${selectedRole.replace('_', ' ')}` : 'Gateway Authentication'}
            </div>
          </div>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            {isSignup && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input name="name" type="text" required className="w-full px-6 py-4 rounded-[1.25rem] border border-slate-100 bg-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Enter full name" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Level</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setSelectedRole('TEAM_MEMBER')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedRole === 'TEAM_MEMBER' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Team Member</button>
                    <button type="button" onClick={() => setSelectedRole('ADMIN')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedRole === 'ADMIN' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Admin</button>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Email</label>
              <input name="email" type="email" required className="w-full px-6 py-4 rounded-[1.25rem] border border-slate-100 bg-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="name@organization.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <input name="password" type="password" required className="w-full px-6 py-4 rounded-[1.25rem] border border-slate-100 bg-slate-50 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" />
            </div>

            {loginError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-red-100 text-center animate-bounce">
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-slate-900 text-white py-5 rounded-[1.25rem] font-black hover:bg-indigo-600 transition-all shadow-xl uppercase tracking-widest text-xs flex items-center justify-center disabled:opacity-50"
            >
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
              ) : null}
              {isSignup ? 'Create Account' : 'Initialize Session'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsSignup(!isSignup); setLoginError(null); }} 
              className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
            >
              {isSignup ? 'Already Registered? Login' : "New Associate? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <Layout user={currentUser} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="p-12 space-y-12">
        <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />

        <div className="fixed bottom-8 right-8 z-50">
          <div className={`px-4 py-2 rounded-full shadow-2xl flex items-center space-x-2 border transition-colors ${isServerLive ? 'bg-emerald-500 border-emerald-400 text-white' : (db.forceOffline ? 'bg-slate-700 border-slate-600 text-white' : 'bg-orange-500 border-orange-400 text-white')}`}>
            <div className={`w-2 h-2 rounded-full bg-white ${isServerLive ? 'animate-pulse' : ''}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {syncing ? 'Synchronizing...' : (isServerLive ? 'Cloud Sync Active' : (db.forceOffline ? 'Offline Mode' : 'Server Searching...'))}
            </span>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-6xl font-black text-slate-900 tracking-tighter">Node Intelligence</h1>
                <p className="text-slate-500 font-semibold text-xl mt-2">Aggregate metrics for your distributed hardware</p>
                <div className="mt-4 flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isServerLive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {isServerLive ? 'Storage: MongoDB Cloud' : 'Storage: Local Browser Cache'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">
                    User: {currentUser.name} ({currentUser.role})
                  </span>
                </div>
              </div>
            </div>
            <StatsCards stats={stats} />
            <AssetsByEquipment stats={equipmentStats} />
          </>
        )}

        {activeTab === 'inventory' && (
          <>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div>
                <h1 className="text-6xl font-black text-slate-900 tracking-tighter">Hardware Pool</h1>
                <p className="text-slate-500 font-semibold text-xl mt-2">Managing {devices.length} endpoints</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-white rounded-3xl shadow-xl p-2 border border-slate-100 gap-2 items-center">
                  {isAdmin ? (
                    <>
                      <button onClick={handleExportCSV} className="px-6 py-4 rounded-2xl font-black text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center uppercase tracking-widest text-[10px]">Export</button>
                      <button onClick={() => fileInputRef.current?.click()} className="px-6 py-4 rounded-2xl font-black text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all flex items-center uppercase tracking-widest text-[10px]">Import CSV</button>
                      <button onClick={() => { setEditingDevice(undefined); setIsModalOpen(true); }} className="bg-[#111827] text-white px-10 py-5 rounded-[1.25rem] font-black hover:bg-indigo-600 transition-all flex items-center uppercase tracking-widest text-[10px] whitespace-nowrap shadow-xl">Register Asset</button>
                    </>
                  ) : (
                    <div className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                      View-only access for team members
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative group">
              <input type="text" placeholder="Omni-search assets..." className="w-full pl-20 pr-10 py-7 rounded-[2.5rem] border-none shadow-sm focus:ring-8 focus:ring-indigo-500/5 outline-none bg-white transition-all text-2xl font-semibold placeholder:text-slate-300" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <svg className="w-10 h-10 text-slate-200 absolute left-8 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <InventoryTable devices={filteredDevices} role={currentUser.role} fields={settings.fields} onEdit={(d) => { setEditingDevice(d); setIsModalOpen(true); }} onDelete={handleDeleteDevice} onViewHistory={setViewingHistory} />
          </>
        )}

        {activeTab === 'users' && isAdmin && (
          <UsersPage />
        )}

        {activeTab === 'settings' && (
          <SettingsPage settings={settings} onUpdate={handleUpdateSettings} role={currentUser.role} onReset={handleResetSystem} />
        )}

        <DeviceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveDevice} device={editingDevice} role={currentUser.role} fields={settings.fields} statusOptions={settings.statusOptions} />
        <HistoryModal device={viewingHistory} onClose={() => setViewingHistory(null)} />
      </div>
    </Layout>
  );
};

export default App;

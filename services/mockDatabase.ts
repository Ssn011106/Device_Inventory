
import { Device, AppSettings, User } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const API_BASE = 'http://localhost:3000/api';

export interface RegisteredUser extends User {
  password?: string;
}

class ApiService {
  private subscribers: Array<() => void> = [];
  public isConnected: boolean = false;
  public forceOffline: boolean = localStorage.getItem('dt_force_offline') === 'true';

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(s => s());
  }

  setOfflineMode(offline: boolean) {
    this.forceOffline = offline;
    localStorage.setItem('dt_force_offline', String(offline));
    this.checkConnection();
  }

  async checkConnection(): Promise<boolean> {
    if (this.forceOffline) {
      this.isConnected = false;
      this.notify();
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE}/settings`, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.isConnected = res.ok;
    } catch (e) {
      this.isConnected = false;
    }
    this.notify();
    return this.isConnected;
  }

  async loginUser(email: string, password: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();

    // Check default admin first for immediate access
    if (cleanEmail === 'admin@devicetracker.io' && password === 'admin') {
      return { id: 'admin-1', email: 'admin@devicetracker.io', name: 'System Admin', role: 'ADMIN' };
    }

    if (this.isConnected) {
      try {
        const res = await fetch(`${API_BASE}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.user;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || 'Access Denied');
      } catch (e: any) {
        if (e.message === 'Invalid email or password' || e.message === 'Access Denied') {
          throw e;
        }
        this.isConnected = false; 
      }
    }

    // Local Storage Fallback: Verify against users registered in this browser session
    const local = localStorage.getItem('dt_users');
    const localUsers: RegisteredUser[] = local ? JSON.parse(local) : [];
    
    const found = localUsers.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
    if (!found) {
      throw new Error('Verification failed. Email or password incorrect.');
    }
    return { id: found.id, email: found.email, name: found.name, role: found.role };
  }

  async hardReset(): Promise<boolean> {
    if (this.isConnected) {
      try {
        const res = await fetch(`${API_BASE}/system/reset`, { method: 'POST' });
        return res.ok;
      } catch (e) {
        return false;
      }
    }
    localStorage.removeItem('dt_devices');
    localStorage.removeItem('dt_settings');
    localStorage.removeItem('dt_has_data');
    localStorage.removeItem('dt_users');
    localStorage.removeItem('dt_auth');
    return true;
  }

  async getDevices(): Promise<Device[]> {
    if (this.isConnected) {
      try {
        const res = await fetch(`${API_BASE}/inventory`);
        if (res.ok) return await res.json();
      } catch (e) {
        this.isConnected = false;
      }
    }
    const local = localStorage.getItem('dt_devices');
    return local ? JSON.parse(local) : [];
  }

  async saveDevices(devices: Device[]) {
    localStorage.setItem('dt_devices', JSON.stringify(devices));
    
    if (this.isConnected) {
      try {
        await fetch(`${API_BASE}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(devices),
        });
      } catch (e) {
        this.isConnected = false;
      }
    }
    this.notify();
  }

  async getSettings(): Promise<AppSettings> {
    if (this.isConnected) {
      try {
        const res = await fetch(`${API_BASE}/settings`);
        if (res.ok) return await res.json();
      } catch (e) {
        this.isConnected = false;
      }
    }
    const local = localStorage.getItem('dt_settings');
    return local ? JSON.parse(local) : DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings) {
    localStorage.setItem('dt_settings', JSON.stringify(settings));
    if (this.isConnected) {
      try {
        await fetch(`${API_BASE}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
      } catch (e) {
        this.isConnected = false;
      }
    }
    this.notify();
  }

  getCurrentUser(): User | null {
    const data = localStorage.getItem('dt_auth');
    return data ? JSON.parse(data) : null;
  }

  setCurrentUser(user: User | null) {
    if (user) localStorage.setItem('dt_auth', JSON.stringify(user));
    else localStorage.removeItem('dt_auth');
    this.notify();
  }

  async getRegisteredUsers(): Promise<RegisteredUser[]> {
    if (this.isConnected) {
      try {
        const res = await fetch(`${API_BASE}/users`);
        if (res.ok) return await res.json();
      } catch (e) {
        this.isConnected = false;
      }
    }
    const local = localStorage.getItem('dt_users');
    return local ? JSON.parse(local) : [];
  }

  async registerUser(user: RegisteredUser) {
    if (this.isConnected) {
      try {
        const res = await fetch(`${API_BASE}/users/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || 'Registration failed');
        }
      } catch (e) {
        this.isConnected = false;
      }
    }
    
    // Always keep a local shadow-cache for offline login support
    const local = localStorage.getItem('dt_users');
    const localUsers: RegisteredUser[] = local ? JSON.parse(local) : [];
    if (localUsers.find((u: RegisteredUser) => u.email.toLowerCase() === user.email.toLowerCase())) {
      throw new Error('Account already exists with this email.');
    }
    localUsers.push(user);
    localStorage.setItem('dt_users', JSON.stringify(localUsers));
    this.notify();
  }

  async deleteUser(id: string) {
    if (this.isConnected) {
      try {
        await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      } catch (e) {
        this.isConnected = false;
      }
    }
    const local = localStorage.getItem('dt_users');
    if (local) {
      const localUsers: RegisteredUser[] = JSON.parse(local);
      const filtered = localUsers.filter(u => u.id !== id);
      localStorage.setItem('dt_users', JSON.stringify(filtered));
    }
    this.notify();
  }
}

export const db = new ApiService();

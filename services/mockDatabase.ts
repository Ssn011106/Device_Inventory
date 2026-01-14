import { Device, AppSettings, User } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : '/api';

export interface RegisteredUser extends User {
  password?: string;
}

class ApiService {
  private subscribers: Array<() => void> = [];
  public isConnected: boolean = false;

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(s => s());
  }

  async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
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
    throw new Error(errorData.error || 'Authentication Failed');
  }

  async hardReset(): Promise<boolean> {
    const res = await fetch(`${API_BASE}/system/reset`, { method: 'POST' });
    return res.ok;
  }

  async getDevices(): Promise<Device[]> {
    const res = await fetch(`${API_BASE}/inventory`);
    if (res.ok) return await res.json();
    return [];
  }

  async saveDevices(devices: Device[]) {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(devices),
    });
    if (!res.ok) throw new Error('Failed to commit data to Atlas.');
    this.notify();
  }

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (res.ok) return await res.json();
    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings in Atlas.');
    this.notify();
  }

  // Session management is the only local storage usage to persist login
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
    const res = await fetch(`${API_BASE}/users`);
    if (res.ok) return await res.json();
    return [];
  }

  async registerUser(user: RegisteredUser) {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
       const err = await res.json();
       throw new Error(err.error || 'Identity registration failed');
    }
    this.notify();
  }

  async deleteUser(id: string) {
    await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    this.notify();
  }
}

export const db = new ApiService();

import { Device, AppSettings, User } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const API_BASE = '/api';

export interface RegisteredUser extends User {
  password?: string;
}

class ApiService {
  private subscribers: Array<() => void> = [];
  public isConnected: boolean = false;
  private currentUser: User | null = null;

  constructor() {
    const savedUser = localStorage.getItem('dt_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUser = user;
      } catch (e) {
        localStorage.removeItem('dt_user');
      }
    }
  }

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(s => s());
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user;
    if (user) localStorage.setItem('dt_user', JSON.stringify(user));
    else localStorage.removeItem('dt_user');
    this.notify();
  }

  private async safeFetch(url: string, options?: RequestInit) {
    try {
      const res = await fetch(url, options);
      
      // Handle "Database offline" 503 from our server gracefully by switching to cached data
      if (res.status === 503 || res.status === 404) {
        console.warn(`Server ${url} unreachable (${res.status}). Using local cache.`);
        return null;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      return { success: true };
    } catch (err: any) {
      console.warn(`Network Error for ${url}:`, err.message);
      return null;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
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
    const emailLower = email.trim().toLowerCase();
    
    // 1. Try Central Server
    const data = await this.safeFetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailLower, password }),
    });
    
    if (data && data.user) return data.user;

    // 2. Fallback to Local Registry
    const localUsers = JSON.parse(localStorage.getItem('dt_local_users') || '[]');
    const user = localUsers.find((u: any) => u.email === emailLower && u.password === password);
    
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    throw new Error(data?.error || "Login failed. Credentials not found in central or local registry.");
  }

  async registerUser(user: any): Promise<any> {
    // 1. Try Central Server
    const data = await this.safeFetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    
    if (data) return data;

    // 2. Fallback to Local Registration
    console.warn("Backend registration unreachable. Implementing local registry bypass.");
    const localUsers = JSON.parse(localStorage.getItem('dt_local_users') || '[]');
    const emailLower = user.email.toLowerCase();
    
    if (localUsers.find((u: any) => u.email === emailLower)) {
       throw new Error("Identity already exists in local registry.");
    }

    const newUser = { 
      id: 'local_' + Date.now(), 
      ...user, 
      email: emailLower,
      isVerified: true 
    };
    
    localUsers.push(newUser);
    localStorage.setItem('dt_local_users', JSON.stringify(localUsers));
    
    return { success: true, user: newUser };
  }

  async getDevices(): Promise<Device[]> {
    const data = await this.safeFetch(`${API_BASE}/inventory`);
    if (data && Array.isArray(data)) {
      localStorage.setItem('dt_cache_devices', JSON.stringify(data));
      return data;
    }
    const cached = localStorage.getItem('dt_cache_devices');
    return cached ? JSON.parse(cached) : [];
  }

  async saveDevices(devices: Device[]): Promise<void> {
    localStorage.setItem('dt_cache_devices', JSON.stringify(devices));
    await this.safeFetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(devices),
    });
    this.notify();
  }

  async getSettings(): Promise<AppSettings> {
    const data = await this.safeFetch(`${API_BASE}/settings`);
    if (data && data.fields) {
      localStorage.setItem('dt_cache_settings', JSON.stringify(data));
      return data;
    }
    const cached = localStorage.getItem('dt_cache_settings');
    return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    localStorage.setItem('dt_cache_settings', JSON.stringify(settings));
    await this.safeFetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    this.notify();
  }

  async getRegisteredUsers(): Promise<RegisteredUser[]> {
    const serverUsers = await this.safeFetch(`${API_BASE}/users/register`);
    const localUsers = JSON.parse(localStorage.getItem('dt_local_users') || '[]');
    
    const combined = [...(Array.isArray(serverUsers) ? serverUsers : []), ...localUsers];
    // Remove duplicates by email
    return combined.filter((v, i, a) => a.findIndex(t => t.email === v.email) === i);
  }

  async deleteUser(id: string): Promise<void> {
    if (id.startsWith('local_')) {
      const localUsers = JSON.parse(localStorage.getItem('dt_local_users') || '[]');
      localStorage.setItem('dt_local_users', JSON.stringify(localUsers.filter((u: any) => u.id !== id)));
    } else {
      await this.safeFetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });
    }
    this.notify();
  }
}

export const db = new ApiService();

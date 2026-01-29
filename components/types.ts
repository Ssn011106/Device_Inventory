
export type UserRole = 'ADMIN' | 'TEAM_MEMBER';
export type AppTab = 'dashboard' | 'inventory' | 'settings' | 'users';
export type FieldType = 'text' | 'date' | 'select';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
}

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; 
  isPrimary?: boolean;
  required?: boolean;
}

export interface HistoryEvent {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
}

export interface Device {
  id: string;
  historyLog: HistoryEvent[];
  [key: string]: any; 
}

export interface InventoryStats {
  total: number;
  available: number;
  inUse: number;
  needRepair: number;
}

export interface ModelStat {
  model: string;
  count: number;
}

export interface EquipmentStat {
  description: string;
  manufacturer: string;
  count: number;
}

export interface AppSettings {
  statusOptions: string[];
  modelOptions: string[];
  locationOptions: string[];
  ownerTypeOptions: string[];
  fields: FieldDefinition[];
  isRegistrationEnabled: boolean;
}

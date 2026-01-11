
export type UserRole = 'ADMIN' | 'TEAM_MEMBER';
export type AppTab = 'dashboard' | 'inventory' | 'settings' | 'users';
export type FieldType = 'text' | 'number' | 'date' | 'select';

// Added missing User interface definition
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface FieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  options?: string[]; // Only for 'select' type
  isPrimary?: boolean; // Use for Equipment Description grouping
}

export interface HistoryEvent {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
}

// Device is now a flexible record where keys match FieldDefinition.id
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

export interface EquipmentStat {
  description: string;
  manufacturer: string;
  count: number;
}

// Added missing ModelStat interface definition
export interface ModelStat {
  model: string;
  manufacturer: string;
  count: number;
}

export interface AppSettings {
  statusOptions: string[];
  fields: FieldDefinition[];
}

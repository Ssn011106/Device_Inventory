
import { AppSettings, FieldDefinition } from './types';

export const DEFAULT_FIELDS: FieldDefinition[] = [
  { id: 'entryDate', label: 'Entry Date', type: 'text' },
  { id: 'assetTag', label: 'Asset Tag', type: 'text' },
  { id: 'equipmentDescription', label: 'Equipment Description', type: 'text', isPrimary: true },
  { id: 'status', label: 'Status', type: 'select' },
  { id: 'partNumber', label: 'Part Number', type: 'text' },
  { id: 'serialNumber', label: 'Serial Number / IMEI', type: 'text' },
  { id: 'deviceType', label: 'Type (Device/Accessory/PC)', type: 'text' },
  { id: 'releasedTo', label: 'Released to', type: 'text' },
  { id: 'coreId', label: 'Core ID', type: 'text' },
  { id: 'manager', label: 'Manager', type: 'text' },
  { id: 'gatePass', label: 'Gate Pass (Y/N)', type: 'text' },
  { id: 'returned', label: 'Returned', type: 'text' },
  { id: 'currentOwner', label: 'Current Owner', type: 'text' },
  { id: 'comments', label: 'Comments', type: 'text' },
  { id: 'location', label: 'Location', type: 'text' }
];

export const INITIAL_STATUS_OPTIONS = [
  'Available',
  'In Use',
  'Need Repair',
  'Taken',
  'Borrow',
  'Missing'
];

export const DEFAULT_SETTINGS: AppSettings = {
  statusOptions: INITIAL_STATUS_OPTIONS,
  fields: DEFAULT_FIELDS
};

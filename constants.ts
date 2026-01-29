
import { AppSettings, FieldDefinition } from './types';

export const DEFAULT_FIELDS: FieldDefinition[] = [
  { id: 'assetTag', label: 'Asset Tag', type: 'text', isPrimary: true, required: true },
  { id: 'entryDate', label: 'Entry Date', type: 'date', required: true },
  { id: 'model', label: 'Model', type: 'text', required: true },
  { id: 'status', label: 'Status', type: 'select', required: true },
  { id: 'owner', label: 'Owner', type: 'text' },
  { id: 'serialNumber', label: 'Serial Number', type: 'text' },
  { id: 'location', label: 'Location', type: 'text' },
  { id: 'comments', label: 'Technical Comments', type: 'text' }
];

export const INITIAL_STATUS_OPTIONS = [
  'Available',
  'In Use',
  'Need Repair',
  'Taken',
  'Missing',
  'YES'
];

export const DEFAULT_SETTINGS: AppSettings = {
  statusOptions: INITIAL_STATUS_OPTIONS,
  modelOptions: [],
  locationOptions: [],
  ownerTypeOptions: [],
  fields: DEFAULT_FIELDS,
  registrationEnabled: true
};


import { Device, FieldDefinition } from '../types';

export const exportToCSV = (devices: Device[], fields: FieldDefinition[]) => {
  const headers = fields.map(f => f.label).join(',');
  const rows = devices.map(d => {
    return fields.map(f => {
      const val = d[f.id] || '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSV = (csvText: string, fields: FieldDefinition[]): Partial<Device>[] => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const fieldMap: Record<number, string> = {};

  const headerMap: Record<string, string> = {
    'entry date': 'entryDate',
    'equipment description': 'equipmentDescription',
    'part number': 'partNumber',
    'serial number/imei': 'serialNumber',
    'asset tag': 'assetTag',
    'type (device/accessory/pc)': 'deviceType',
    'released to': 'releasedTo',
    'core id': 'coreId',
    'manager': 'manager',
    'gate pass (y/n)': 'gatePass',
    'returned': 'returned',
    'current owner': 'currentOwner',
    'comments': 'comments',
    'location': 'location'
  };

  rawHeaders.forEach((header, index) => {
    const lowerHeader = header.toLowerCase();
    
    // STRICT EXCLUSION: Ignore columns matching No, Qty, Quantity, or Sr No entirely
    if (
      lowerHeader === 'no' || 
      lowerHeader === 'qty' || 
      lowerHeader === 'quantity' || 
      lowerHeader === 'sr no' || 
      lowerHeader === 's.no' || 
      lowerHeader === '#'
    ) {
      return;
    }

    if (headerMap[lowerHeader]) {
      fieldMap[index] = headerMap[lowerHeader];
    } else {
      const field = fields.find(f => (f.label.toLowerCase() === lowerHeader || f.id.toLowerCase() === lowerHeader));
      if (field) fieldMap[index] = field.id;
    }
  });

  const result: Partial<Device>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
    
    const device: any = {};
    Object.keys(fieldMap).forEach(idxStr => {
      const idx = parseInt(idxStr);
      const fieldId = fieldMap[idx];
      device[fieldId] = values[idx] || '';
    });

    if (Object.keys(device).length > 0) {
      if (!device.status) {
        if (device.currentOwner && device.currentOwner !== 'N/A' && device.currentOwner !== '—' && device.currentOwner !== '') {
          device.status = 'In Use';
        } else {
          device.status = 'Available';
        }
      }
      result.push(device);
    }
  }
  return result;
};
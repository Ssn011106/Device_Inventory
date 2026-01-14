
import React from 'react';
import { Device, UserRole, FieldDefinition } from '../types';

interface InventoryTableProps {
  devices: Device[];
  role: UserRole;
  fields: FieldDefinition[];
  onEdit: (device: Device) => void;
  onDelete: (id: string) => void;
  onViewHistory: (device: Device) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ devices, role, fields, onEdit, onDelete, onViewHistory }) => {
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'available': return 'bg-emerald-100 text-emerald-700';
      case 'in use': return 'bg-blue-100 text-blue-700';
      case 'need repair': return 'bg-red-100 text-red-700';
      case 'borrow': return 'bg-indigo-100 text-indigo-700';
      case 'taken': return 'bg-slate-100 text-slate-700';
      case 'missing': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const isAdmin = role === 'ADMIN';

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[2200px] border-collapse">
          <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100">
            <tr>
              {fields.map((field, idx) => (
                <th 
                  key={field.id} 
                  className={`px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${idx < 2 ? 'sticky left-0 bg-slate-50 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.02)]' : ''}`}
                  style={{ left: idx === 0 ? 0 : idx === 1 ? '160px' : 'auto' }}
                >
                  {field.label}
                </th>
              ))}
              <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky right-0 bg-slate-50/90 backdrop-blur-sm shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] z-30">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!devices || devices.length === 0 ? (
              <tr>
                <td colSpan={fields.length + 1} className="px-6 py-32 text-center">
                   <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                    </div>
                    <p className="text-slate-400 font-bold text-lg">Inventory Empty</p>
                    <p className="text-slate-300 text-sm font-medium mt-1">Add devices or import CSV to see all details.</p>
                   </div>
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id} className="hover:bg-slate-50/50 transition-colors group">
                  {fields.map((field, idx) => {
                    const value = device[field.id];
                    return (
                      <td 
                        key={field.id} 
                        className={`px-6 py-5 ${idx < 2 ? 'sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]' : ''}`}
                        style={{ left: idx === 0 ? 0 : idx === 1 ? '160px' : 'auto' }}
                      >
                        {field.id === 'status' ? (
                          <span className={`px-4 py-2 rounded-2xl text-[9px] font-black whitespace-nowrap uppercase tracking-widest ${getStatusColor(value)}`}>
                            {value || 'Unknown'}
                          </span>
                        ) : field.id === 'assetTag' || field.id === 'assetId' ? (
                          <span className="font-mono text-[10px] bg-slate-900 px-4 py-2 rounded-xl text-white font-black border border-slate-800 shadow-lg block w-max min-w-[100px] text-center">
                            {value || 'N/A'}
                          </span>
                        ) : (
                          <div className={`text-sm max-w-[200px] truncate ${field.isPrimary ? 'font-black text-slate-900' : 'font-semibold text-slate-500'}`} title={String(value)}>
                            {value || '—'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-5 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] z-20">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => onEdit(device)} 
                        className={`px-5 py-2.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                      >
                        {isAdmin ? 'Edit' : 'Full Details'}
                      </button>
                      <button onClick={() => onViewHistory(device)} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 px-5 py-2.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest">Log</button>
                      {isAdmin && (
                        <button onClick={() => onDelete(device.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest">Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;


import React, { useState, useEffect } from 'react';
import { Device, UserRole, FieldDefinition } from '../types';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (device: Partial<Device>) => void;
  device?: Device;
  role: UserRole;
  fields: FieldDefinition[];
  statusOptions: string[];
}

const DeviceModal: React.FC<DeviceModalProps> = ({ isOpen, onClose, onSave, device, role, fields, statusOptions }) => {
  const [formData, setFormData] = useState<Partial<Device>>({});

  useEffect(() => {
    if (isOpen) {
      if (device) {
        setFormData({ ...device });
      } else {
        const initial: Partial<Device> = {};
        fields.forEach(f => {
          if (f.id === 'status') initial[f.id] = statusOptions[0];
          else initial[f.id] = '';
        });
        setFormData(initial);
      }
    }
  }, [device, isOpen, fields, statusOptions]);

  if (!isOpen) return null;

  const isAdmin = role === 'ADMIN';
  // Fields that Team Members ARE allowed to edit
  const editableByTeam = ['status', 'currentOwner', 'comments', 'originalLocation'];

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {device ? (isAdmin ? 'Edit Asset Record' : 'Update Asset Status') : 'Register New Asset'}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {isAdmin ? 'Complete authority over data model' : 'Limited updates to status and ownership'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {fields.map((field) => {
              const isLocked = !isAdmin && !editableByTeam.includes(field.id);
              
              return (
                <div key={field.id} className={`${field.id === 'comments' ? 'md:col-span-2' : ''} space-y-1.5`}>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center">
                    {field.label}
                    {isLocked && (
                      <svg className="w-3 h-3 ml-2 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v4H9V6z"/>
                      </svg>
                    )}
                  </label>
                  
                  {field.id === 'status' ? (
                    <select
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white transition-all font-semibold"
                      value={formData[field.id] || ''}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                    >
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === 'select' ? (
                    <select
                      disabled={isLocked}
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400 transition-all font-semibold"
                      value={formData[field.id] || ''}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                    >
                      <option value="">Select Option</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.id === 'comments' ? (
                    <textarea
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none h-24 resize-none transition-all font-medium"
                      value={formData[field.id] || ''}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                    />
                  ) : (
                    <input
                      type={field.type}
                      disabled={isLocked}
                      className="w-full px-5 py-3 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400 transition-all font-semibold"
                      value={formData[field.id] || ''}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-12 flex justify-end space-x-4 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              className="px-10 py-3.5 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              {device ? 'Commit Updates' : 'Save New Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceModal;

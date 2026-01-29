
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
  const editableByTeam = ['status', 'currentOwner', 'comments', 'location'];

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                {device ? (isAdmin ? 'Device Records' : 'Full Asset Details') : 'Register New Hardware'}
              </h2>
            </div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
              {isAdmin ? 'Master Record Access' : `Reviewing Hardware Profile: ${formData.assetTag || 'ID: ' + formData.id}`}
            </p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="overflow-y-auto p-10 custom-scrollbar">
          {!isAdmin && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-bold text-blue-700 leading-relaxed">
                As a Team Member, you have full visibility of all asset technical specifications. 
                You may update the lifecycle status, current owner, and comments.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
            {fields.map((field) => {
              const isLocked = !isAdmin && !editableByTeam.includes(field.id);
              
              return (
                <div key={field.id} className={`${field.id === 'comments' ? 'md:col-span-2 lg:col-span-3' : ''} space-y-2`}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center">
                    {field.label}
                    {isLocked && (
                      <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md text-[8px] font-black uppercase tracking-widest">Protected</span>
                    )}
                  </label>
                  
                  {field.id === 'status' ? (
                    <select
                      className="w-full px-6 py-4 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none bg-white transition-all font-black text-slate-800 appearance-none shadow-sm"
                      value={formData[field.id] || ''}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                    >
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.type === 'select' ? (
                    <select
                      disabled={isLocked}
                      className="w-full px-6 py-4 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400 transition-all font-black text-slate-800 appearance-none shadow-sm"
                      value={formData[field.id] || ''}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                    >
                      <option value="">Select Option</option>
                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : field.id === 'comments' ? (
                    <textarea
                      className="w-full px-6 py-4 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none h-32 resize-none transition-all font-bold text-slate-700 bg-white shadow-sm"
                      value={formData[field.id] || ''}
                      onChange={e => handleInputChange(field.id, e.target.value)}
                      placeholder="Enter technical notes or lifecycle updates..."
                    />
                  ) : (
                    <div className="relative group">
                      <input
                        type={field.type}
                        disabled={isLocked}
                        className="w-full px-6 py-4 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none disabled:bg-slate-50/50 disabled:text-slate-400 disabled:font-bold transition-all font-black text-slate-800 bg-white shadow-sm"
                        value={formData[field.id] || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                      />
                      {isLocked && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v4H9V6z"/></svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-16 flex justify-end space-x-4 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="px-10 py-5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
            >
              Close Record
            </button>
            <button
              type="submit"
              className="px-12 py-5 bg-slate-900 text-white text-xs font-black rounded-3xl hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 active:scale-95 uppercase tracking-[0.2em]"
            >
              {device ? 'Commit Record Updates' : 'Initialize New Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceModal;
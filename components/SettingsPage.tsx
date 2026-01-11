
import React, { useState } from 'react';
import { AppSettings, UserRole, FieldDefinition, FieldType } from '../types';
import { db } from '../services/mockDatabase';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
  role: UserRole;
  onReset?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdate, role, onReset }) => {
  const [newStatus, setNewStatus] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);
  const [isOffline, setIsOffline] = useState(db.forceOffline);
  const [newFieldOption, setNewFieldOption] = useState('');
  const [fieldForm, setFieldForm] = useState<Partial<FieldDefinition>>({
    label: '', type: 'text', options: []
  });

  const toggleOfflineMode = () => {
    const newState = !isOffline;
    setIsOffline(newState);
    db.setOfflineMode(newState);
  };

  const addStatus = () => {
    if (!newStatus.trim() || settings.statusOptions.includes(newStatus)) return;
    onUpdate({ ...settings, statusOptions: [...settings.statusOptions, newStatus.trim()] });
    setNewStatus('');
  };

  const removeStatus = (status: string) => {
    onUpdate({ ...settings, statusOptions: settings.statusOptions.filter(s => s !== status) });
  };

  const openFieldEditor = (field?: FieldDefinition) => {
    if (field) {
      setEditingFieldId(field.id);
      setFieldForm({ ...field, options: field.options || [] });
    } else {
      setEditingFieldId(null);
      setFieldForm({ label: '', type: 'text', options: [], isPrimary: false });
    }
    setNewFieldOption('');
    setShowFieldBuilder(true);
  };

  const addFieldOption = () => {
    if (!newFieldOption.trim()) return;
    const currentOptions = fieldForm.options || [];
    if (currentOptions.includes(newFieldOption.trim())) return;
    setFieldForm({
      ...fieldForm,
      options: [...currentOptions, newFieldOption.trim()]
    });
    setNewFieldOption('');
  };

  const removeFieldOption = (opt: string) => {
    setFieldForm({
      ...fieldForm,
      options: (fieldForm.options || []).filter(o => o !== opt)
    });
  };

  const handleSaveField = () => {
    if (!fieldForm.label) return;
    let updatedFields = [...settings.fields];
    if (fieldForm.isPrimary) {
      updatedFields = updatedFields.map(f => ({ ...f, isPrimary: false }));
    }
    
    const finalFieldData: FieldDefinition = {
      id: editingFieldId || fieldForm.label.toLowerCase().replace(/\s+/g, '_'),
      label: fieldForm.label!,
      type: fieldForm.type as FieldType,
      options: fieldForm.type === 'select' ? fieldForm.options : undefined,
      isPrimary: fieldForm.isPrimary || false
    };

    if (editingFieldId) {
      updatedFields = updatedFields.map(f => f.id === editingFieldId ? finalFieldData : f);
    } else {
      updatedFields.push(finalFieldData);
    }

    onUpdate({ ...settings, fields: updatedFields });
    setShowFieldBuilder(false);
    setEditingFieldId(null);
  };

  const isAdmin = role === 'ADMIN';

  return (
    <div className="max-w-7xl space-y-12 pb-24">
      <header>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter">System Architect</h1>
        <p className="text-slate-500 font-semibold text-xl mt-2">Design your data schema and lifecycle logic</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Connectivity</h3>
                  <p className="text-sm font-bold text-slate-400">Control data synchronization</p>
                </div>
              </div>
              <button 
                onClick={toggleOfflineMode} 
                className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isOffline ? 'bg-orange-600 text-white' : 'bg-emerald-600 text-white'}`}
              >
                {isOffline ? 'Offline Mode (Force)' : 'Cloud Sync (Auto)'}
              </button>
            </div>
            
            <p className="text-slate-500 text-sm font-medium mb-6">
              Current Status: <strong>{db.isConnected ? 'Connected to MongoDB' : 'Disconnected / Local Storage Only'}</strong>
            </p>

            <div className="space-y-4 border-t border-slate-100 pt-10">
               <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-black text-slate-900">Fields Hierarchy</h4>
                <button onClick={() => openFieldEditor()} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">Add Field</button>
               </div>
              {settings.fields.map(f => (
                <div key={f.id} className="group flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center space-x-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.isPrimary ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{f.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {f.id} • Type: {f.type}</p>
                    </div>
                  </div>
                  <button onClick={() => openFieldEditor(f)} className="opacity-0 group-hover:opacity-100 p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                </div>
              ))}
            </div>

            {showFieldBuilder && (
              <div className="mt-8 p-10 bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="text-lg font-black text-indigo-900 mb-6 uppercase tracking-widest text-center">Field Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Label</label>
                    <input type="text" className="w-full px-6 py-4 rounded-2xl border border-indigo-100 font-bold outline-none" value={fieldForm.label} onChange={e => setFieldForm({...fieldForm, label: e.target.value})} placeholder="e.g. Warranty Expiry" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Type</label>
                    <select className="w-full px-6 py-4 rounded-2xl border border-indigo-100 font-bold outline-none bg-white" value={fieldForm.type} onChange={e => setFieldForm({...fieldForm, type: e.target.value as FieldType, options: e.target.value === 'select' ? (fieldForm.options || []) : undefined})}>
                      <option value="text">Text Input</option>
                      <option value="select">Dropdown (Select)</option>
                      <option value="date">Date Picker</option>
                      <option value="number">Numeric</option>
                    </select>
                  </div>
                </div>

                {fieldForm.type === 'select' && (
                  <div className="mt-8 p-6 bg-white rounded-3xl border border-indigo-100 space-y-4">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Dropdown Options</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Add option..." 
                        className="flex-1 px-5 py-3 rounded-xl border border-slate-100 font-bold outline-none text-sm" 
                        value={newFieldOption} 
                        onChange={(e) => setNewFieldOption(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addFieldOption()}
                      />
                      <button onClick={addFieldOption} className="bg-indigo-600 text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {fieldForm.options?.map(opt => (
                        <div key={opt} className="flex items-center space-x-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl group transition-all">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{opt}</span>
                          <button onClick={() => removeFieldOption(opt)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      ))}
                      {(!fieldForm.options || fieldForm.options.length === 0) && (
                        <p className="text-[10px] font-bold text-slate-300 italic py-2">No options added yet.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-10 flex justify-center space-x-4">
                  <button onClick={() => setShowFieldBuilder(false)} className="px-10 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Discard</button>
                  <button onClick={handleSaveField} className="bg-indigo-600 text-white px-12 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl">Apply Field Changes</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-6">Status Definitions</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Global device lifecycle states</p>
            <div className="flex gap-2 mb-8"><input type="text" placeholder="e.g. Scrapped" className="flex-1 px-5 py-3.5 rounded-2xl border border-slate-200 font-bold outline-none text-sm" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} /><button onClick={addStatus} className="bg-slate-900 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest">Add</button></div>
            <div className="space-y-2">{settings.statusOptions.map(opt => (<div key={opt} className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-white hover:shadow-md"><span className="text-xs font-black text-slate-700 uppercase tracking-wider">{opt}</span><button onClick={() => removeStatus(opt)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button></div>))}</div>
          </div>
          
          {isAdmin && (
            <div className="bg-red-50 p-10 rounded-[3.5rem] border border-red-100">
              <h3 className="text-red-900 font-black text-lg mb-4 uppercase tracking-widest">Danger Zone</h3>
              <p className="text-red-700 text-sm font-medium leading-relaxed mb-8">This action will wipe the MongoDB collection and local cache. Used primarily for schema fixes.</p>
              <button onClick={onReset} className="w-full bg-red-600 text-white py-5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200">Reset System Database</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

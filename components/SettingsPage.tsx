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
  const [newFieldOption, setNewFieldOption] = useState('');
  const [fieldForm, setFieldForm] = useState<Partial<FieldDefinition>>({
    label: '', type: 'text', options: []
  });

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

  const removeField = (fieldId: string) => {
    const field = settings.fields.find(f => f.id === fieldId);
    if (field?.isPrimary) {
      alert("CRITICAL: The Primary grouping field cannot be deleted. Please assign another field as 'Primary' before attempting to remove this one.");
      return;
    }
    if (window.confirm(`PERMANENT ACTION: Are you sure you want to delete the "${field?.label}" field? While existing data in the database remains, this column will no longer appear in the UI or exports.`)) {
      onUpdate({
        ...settings,
        fields: settings.fields.filter(f => f.id !== fieldId)
      });
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...settings.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    onUpdate({
      ...settings,
      fields: newFields
    });
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
    
    // Handle primary field logic: only one can be primary
    if (fieldForm.isPrimary) {
      updatedFields = updatedFields.map(f => ({ ...f, isPrimary: false }));
    }
    
    const finalId = editingFieldId || fieldForm.label.toLowerCase().replace(/\s+/g, '_');
    
    // Prevent overriding protected internal fields
    if (['id', '_id', 'historyLog'].includes(finalId)) {
      alert("This field name is reserved for system use.");
      return;
    }

    const finalFieldData: FieldDefinition = {
      id: finalId,
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
    <div className="max-w-7xl space-y-12 pb-24 p-12">
      <header>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter">Settings</h1>
        <p className="text-slate-500 font-semibold text-xl mt-2">Manage Database and App Settings</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mr-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Database Connectivity</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Real-time Node Status</p>
                </div>
              </div>
              <div className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${db.isConnected ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                {db.isConnected ? 'Synchronized' : 'Offline'}
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-10">
               <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-xl font-black text-slate-900">Inventory Field Schema</h4>
                  </div>
                <button 
                  onClick={() => openFieldEditor()} 
                  className="bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Create New Field
                </button>
               </div>

              <div className="grid gap-4">
                {settings.fields.map((f, index) => (
                  <div key={f.id} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
                    <div className="flex items-center space-x-6">
                      <div className="flex flex-col space-y-1">
                        <button 
                          disabled={index === 0} 
                          onClick={() => moveField(index, 'up')}
                          className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-0 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button 
                          disabled={index === settings.fields.length - 1} 
                          onClick={() => moveField(index, 'down')}
                          className="p-1 text-slate-300 hover:text-indigo-600 disabled:opacity-0 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${f.isPrimary ? 'bg-amber-500 text-white' : 'bg-white text-slate-400'}`}>
                        {f.isPrimary ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{f.label}</p>
                          {f.isPrimary && <span className="text-[8px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-amber-200">Primary Key</span>}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Type: {f.type} • ID: {f.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => openFieldEditor(f)} 
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Field Configuration"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {!f.isPrimary && (
                        <button 
                          onClick={() => removeField(f.id)} 
                          className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" 
                          title="Permanently Delete Field"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showFieldBuilder && (
              <div className="mt-8 p-10 bg-indigo-50/50 border-2 border-dashed border-indigo-200 rounded-[3rem] animate-in fade-in zoom-in-95 duration-300">
                <h4 className="text-xl font-black text-indigo-900 mb-8 uppercase tracking-widest text-center">
                  {editingFieldId ? 'Modify Field Parameters' : 'Register New Schema Field'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Visible Label</label>
                    <input type="text" className="w-full px-7 py-5 rounded-2xl border border-indigo-100 font-black outline-none shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all" value={fieldForm.label} onChange={e => setFieldForm({...fieldForm, label: e.target.value})} placeholder="e.g. Asset Location" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Data Input Strategy</label>
                    <select className="w-full px-7 py-5 rounded-2xl border border-indigo-100 font-black outline-none bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none" value={fieldForm.type} onChange={e => setFieldForm({...fieldForm, type: e.target.value as FieldType, options: e.target.value === 'select' ? (fieldForm.options || []) : undefined})}>
                      <option value="text">Standard Text</option>
                      <option value="select">Dropdown / Selection</option>
                      <option value="date">Date Picker</option>
                      <option value="number">Numeric Value</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex items-center space-x-4 bg-white/50 p-6 rounded-3xl border border-indigo-100">
                  <input 
                    type="checkbox" 
                    id="isPrimaryField" 
                    className="w-6 h-6 rounded-lg border-indigo-200 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                    checked={fieldForm.isPrimary} 
                    onChange={e => setFieldForm({...fieldForm, isPrimary: e.target.checked})}
                  />
                  <div>
                    <label htmlFor="isPrimaryField" className="text-sm font-black text-indigo-900 uppercase tracking-widest cursor-pointer">Set as Primary Grouping Field</label>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">This determines how assets are categorized on the dashboard.</p>
                  </div>
                </div>

                {fieldForm.type === 'select' && (
                  <div className="mt-8 p-8 bg-white rounded-[2rem] border border-indigo-100 space-y-6">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Configure Dropdown Options</label>
                    <div className="flex gap-4">
                      <input 
                        type="text" 
                        placeholder="Add new entry..." 
                        className="flex-1 px-6 py-4 rounded-2xl border border-slate-100 font-black outline-none text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                        value={newFieldOption} 
                        onChange={(e) => setNewFieldOption(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addFieldOption()}
                      />
                      <button onClick={addFieldOption} className="bg-indigo-600 text-white px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Add Option</button>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-2">
                      {fieldForm.options?.map(opt => (
                        <div key={opt} className="flex items-center space-x-3 px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:border-indigo-200">
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.15em]">{opt}</span>
                          <button onClick={() => removeFieldOption(opt)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-12 flex justify-center space-x-6">
                  <button onClick={() => setShowFieldBuilder(false)} className="px-12 py-5 text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-all">Discard Changes</button>
                  <button onClick={handleSaveField} className="bg-slate-900 text-white px-16 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-100">Confirm Schema Update</button>
                </div>
              </div>
            )}
          </div>
        </div>
          <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">Device Status</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Define active asset statuses</p>
            <div className="flex gap-2 mb-8">
              <input type="text" placeholder="e.g. Scrapped" className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 font-black outline-none text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
              <button onClick={addStatus} className="bg-slate-900 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all">Add</button>
            </div>
            <div className="space-y-3">
              {settings.statusOptions.map(opt => (
                <div key={opt} className="flex items-center justify-between px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:bg-white hover:shadow-lg hover:border-indigo-100">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{opt}</span>
                  <button onClick={() => removeStatus(opt)} className="text-slate-300 hover:text-red-500 transition-all">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          
        
        </div>
      </div>
  );
};

export default SettingsPage;
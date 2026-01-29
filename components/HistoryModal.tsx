
import React from 'react';
import { Device } from '../types';

interface HistoryModalProps {
  device: Device | null;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ device, onClose }) => {
  if (!device) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold">Device History</h2>
            <p className="text-sm text-slate-500">{device.deviceName} ({device.assetId})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {device.historyLog.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No history recorded for this device.</p>
          ) : (
            device.historyLog.slice().reverse().map((event, idx) => (
              <div key={event.id} className="relative pl-8">
                {/* Timeline dot */}
                <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-indigo-500"></div>
                {/* Timeline line */}
                {idx !== device.historyLog.length - 1 && (
                  <div className="absolute left-[5px] top-4 w-[2px] h-full bg-slate-200"></div>
                )}
                
                <div>
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-900">{event.action}</p>
                    <span className="text-xs text-slate-400">{new Date(event.date).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{event.details}</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">By: {event.user}</p>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 text-right bg-slate-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
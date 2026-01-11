
import React from 'react';
import { ModelStat } from '../types';

interface AssetsByModelProps {
  stats: ModelStat[];
}

const AssetsByModel: React.FC<AssetsByModelProps> = ({ stats }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Assets by Model</h3>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">{stats.length} Models Found</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((item, idx) => (
          <div key={idx} className="flex items-center p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{item.model}</p>
              <p className="text-xs text-slate-500">{item.manufacturer}</p>
            </div>
            <div className="ml-4">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
                {item.count}
              </span>
            </div>
          </div>
        ))}
        {stats.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-400">
            No model data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetsByModel;

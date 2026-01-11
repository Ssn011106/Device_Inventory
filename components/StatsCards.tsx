
import React from 'react';
import { InventoryStats } from '../types';

interface StatsCardsProps {
  stats: InventoryStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Devices', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Available', value: stats.available, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'In Use', value: stats.inUse, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Need Repair', value: stats.needRepair, color: 'text-red-600', bg: 'bg-red-50' },
      ].map((card, i) => (
        <div key={i} className={`${card.bg} p-6 rounded-xl border border-white shadow-sm`}>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{card.label}</p>
          <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

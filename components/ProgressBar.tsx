
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, status }) => {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="w-full space-y-2 mt-4">
      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
        <span className="truncate max-w-[70%]">{status}</span>
        <span className="text-yellow-500">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-900/50 rounded-full h-2.5 md:h-3 overflow-hidden border border-slate-700 relative">
        <div 
          className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(234,179,8,0.3)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

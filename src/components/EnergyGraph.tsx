import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { EnergyData } from '../physics/types';
import { motion } from 'motion/react';

interface EnergyGraphProps {
  data: EnergyData[];
  expanded: boolean;
  onToggle: () => void;
}

export const EnergyGraph: React.FC<EnergyGraphProps> = ({ data, expanded, onToggle }) => {
  return (
    <motion.div 
      layout
      className={`absolute top-20 left-4 w-48 glass rounded-xl overflow-hidden z-30 flex flex-col ${expanded ? 'h-48' : 'h-16'}`}
      onClick={() => !expanded && onToggle()}
    >
      <div className="flex justify-between items-center px-4 py-2 border-b border-white/5">
        <span className="text-[9px] mono uppercase tracking-widest text-teal-400">Energy Balance</span>
        {expanded && (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="text-[9px] font-bold uppercase bg-slate-800/80 px-2 py-1 rounded text-slate-300 hover:text-white"
          >
            Collapse
          </button>
        )}
      </div>
      
      <div className="flex-1 w-full h-full p-2 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            {expanded && <XAxis dataKey="time" hide />}
            {expanded && <YAxis domain={['auto', 'auto']} hide />}
            <Area type="monotone" dataKey="total" stroke="#4fd1c5" fillOpacity={0.1} fill="#4fd1c5" strokeWidth={1} isAnimationActive={false} />
            {expanded && <Area type="monotone" dataKey="pe" stroke="#f43f5e" fillOpacity={0} strokeWidth={1} isAnimationActive={false} />}
            {expanded && <Area type="monotone" dataKey="ke" stroke="#fcd34d" fillOpacity={0} strokeWidth={1} isAnimationActive={false} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {!expanded && data.length > 0 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-4">
            <span className="text-slate-300 text-[10px] mono">
              E_Total: {data[data.length-1].total.toExponential(2)}
            </span>
         </div>
      )}
    </motion.div>
  );
};

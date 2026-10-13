import React from 'react';
import { motion } from 'framer-motion';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50/70',
      text: 'text-indigo-600',
      border: 'border-indigo-100',
      gradient: 'from-indigo-500/10 to-transparent'
    },
    amber: {
      bg: 'bg-amber-50/70',
      text: 'text-amber-600',
      border: 'border-amber-100',
      gradient: 'from-amber-500/10 to-transparent'
    },
    emerald: {
      bg: 'bg-emerald-50/70',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      gradient: 'from-emerald-500/10 to-transparent'
    },
    rose: {
      bg: 'bg-rose-50/70',
      text: 'text-rose-600',
      border: 'border-rose-100',
      gradient: 'from-rose-500/10 to-transparent'
    },
    blue: {
      bg: 'bg-blue-50/70',
      text: 'text-blue-600',
      border: 'border-blue-100',
      gradient: 'from-blue-500/10 to-transparent'
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      className={`relative overflow-hidden p-5 rounded-3xl bg-white border ${scheme.border} shadow-sm shadow-slate-200/50 flex flex-col justify-between`}
    >
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br ${scheme.gradient} pointer-events-none`} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-2xl ${scheme.bg} ${scheme.text} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div>
        <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function ShortcutCard({ title, subtitle, actionText, icon: Icon, onClick, color = 'indigo' }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.025 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      onClick={onClick}
      className="p-5 rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/80 hover:border-indigo-400 shadow-sm hover:shadow-md hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between transition-colors group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-200 group-hover:rotate-6">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full group-hover:bg-indigo-100 transition-colors">
          {actionText}
        </span>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

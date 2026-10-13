import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  Plus,
  BarChart3,
  DollarSign
} from 'lucide-react';

export default function BottomNav({ currentSection, onNavigate, onOpenNewSale }) {
  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'action', label: 'Venta', icon: Plus, isAction: true },
    { id: 'settlements', label: 'Socios', icon: DollarSign },
    { id: 'summaries', label: 'Resúmenes', icon: BarChart3 },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentSection === tab.id;

        if (tab.isAction) {
          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              onClick={onOpenNewSale}
              className="relative -top-5 flex flex-col items-center focus:outline-none"
            >
              <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-4 ring-white">
                <Plus className="w-7 h-7 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 mt-1">Nueva</span>
            </motion.button>
          );
        }

        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-dot"
                  className="w-1.5 h-1.5 rounded-full bg-indigo-600 mx-auto mt-0.5"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </div>
            <span className="text-[11px] mt-0.5">{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  Plus,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function BottomNav({ currentSection, onNavigate, onOpenNewSale }) {
  const { theme, currentThemeConfig } = useTheme();
  const isDark = currentThemeConfig?.isDark || theme === 'dark';

  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { id: 'action', label: 'Venta', icon: Plus, isAction: true },
    { id: 'settlements', label: 'Socios', icon: DollarSign },
    { id: 'summaries', label: 'Resúmenes', icon: BarChart3 },
  ];

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-colors duration-300 border-t backdrop-blur-xl bottom-nav-bar ${
        isDark
          ? 'bg-[#131b2e]/95 border-white/10 text-slate-300 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]'
          : 'bg-white/95 border-slate-200/80 text-slate-600 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]'
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentSection === tab.id;

          if (tab.isAction) {
            return (
              <motion.button
                key={tab.id}
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onOpenNewSale}
                className="relative -top-2 flex flex-col items-center justify-center focus:outline-none cursor-pointer group px-2"
                aria-label="Registrar Nueva Venta"
              >
                <div
                  className={`w-11 h-11 rounded-full text-white flex items-center justify-center shadow-md theme-brand-badge ring-4 transition-all duration-200 ${
                    isDark ? 'ring-[#131b2e]' : 'ring-white'
                  }`}
                >
                  <Plus className="w-6 h-6 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
                </div>
                <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Venta
                </span>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onNavigate(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'theme-active-text font-bold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative flex flex-col items-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-dot"
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{ backgroundColor: 'var(--theme-primary, #6366f1)' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'font-black' : 'font-medium'}`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

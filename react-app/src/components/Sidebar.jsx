import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  PlusCircle,
  ShoppingBag,
  CreditCard,
  History,
  Tag,
  DollarSign,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shirt,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, section: 'Principal' },
  { id: 'new-sale', label: 'Nueva Venta', icon: PlusCircle, section: 'Ventas', highlight: true },
  { id: 'orders', label: 'Pedidos', icon: ShoppingBag, section: 'Ventas' },
  { id: 'cuentas', label: 'Cuentas', icon: CreditCard, section: 'Ventas' },
  { id: 'history', label: 'Historial', icon: History, section: 'Ventas' },
  { id: 'purchases', label: 'Abonos Yesenia', icon: Tag, section: 'Socios' },
  { id: 'settlements', label: 'Liquidaciones', icon: DollarSign, section: 'Socios' },
  { id: 'summaries', label: 'Resúmenes', icon: BarChart3, section: 'Datos' },
  { id: 'reports', label: 'Reportes', icon: FileSpreadsheet, section: 'Datos' },
];

export default function Sidebar({ currentSection, onNavigate, isCollapsed, onToggleCollapse, isOpenMobile, onCloseMobile }) {
  const { role, logout } = useAuth();

  return (
    <>
      {/* Backdrop para móvil */}
      {isOpenMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Barra lateral */}
      <motion.aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/80 shadow-sm transition-all duration-300 ease-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Cabecera / Marca */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Shirt className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-800 flex items-center gap-1">
                  Camisas IUB
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" />
                </span>
                <span className="text-xs text-slate-400 font-medium -mt-0.5">Control & Socios</span>
              </div>
            )}
          </motion.div>

          {/* Botón Plegar en Escritorio */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-7 h-7 rounded-xl items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={isCollapsed ? "Expandir menú" : "Plegar menú"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;

            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl font-medium text-sm transition-colors text-left ${
                  isActive
                    ? 'text-indigo-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${item.highlight ? 'bg-indigo-50/60 text-indigo-700' : ''}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 bg-indigo-50 rounded-2xl border border-indigo-100"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}

                <div className={`relative z-10 w-6 h-6 flex items-center justify-center ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>

                {!isCollapsed && (
                  <span className="relative z-10 truncate">{item.label}</span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Footer / Usuario */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white border border-slate-200/60 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
              {(role?.nombre || 'U')[0].toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate">{role?.nombre || 'Usuario'}</span>
                  <span className="text-[11px] text-slate-400 capitalize">{role?.role || 'vendedor'}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer ml-1"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

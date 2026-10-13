import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, RotateCw, Plus, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function TopBar({ onOpenMobileMenu, onOpenNewSale }) {
  const { role } = useAuth();
  const { refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      {/* Botón menú móvil y Saludo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-2xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base lg:text-lg text-slate-900 tracking-tight">
              ¡Hola, {role?.nombre || 'Equipo'}! 👋
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3" />
              {role?.role === 'admin' ? 'Admin' : 'Vendedor'}
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">
            Panel de control de pedidos y finanzas
          </span>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Botón Refrescar con animación de rotación */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          className="p-2.5 rounded-2xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 transition-colors"
          title="Actualizar datos en tiempo real"
        >
          <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }} transition={{ duration: 0.5 }}>
            <RotateCw className="w-4 h-4" />
          </motion.div>
        </motion.button>

        {/* Botón Nueva Venta (Escritorio) */}
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenNewSale}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva Venta</span>
        </motion.button>
      </div>
    </header>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, RotateCw, Plus, ShieldCheck, Palette, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export default function TopBar({ onOpenMobileMenu, onOpenNewSale, onOpenThemeModal, onNavigate }) {
  const { role } = useAuth();
  const { refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Botón de icono: cuadrado y de tamaño fijo para que no se deformen
  // cuando el encabezado crece o se estira.
  const icono = 'w-9 h-9 shrink-0 rounded-xl inline-flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer';

  return (
    <header className="h-14 sm:h-16 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 px-3 sm:px-5 lg:px-8 flex items-center gap-3">
      {/* Saludo */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          onClick={onOpenMobileMenu}
          className={icono + ' lg:hidden'}
          aria-label="Abrir menú"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight truncate">
              ¡Hola, {role?.nombre || 'Equipo'}!
            </h1>
            <span className="shrink-0 hidden sm:inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-2.5 h-2.5" />
              {role?.role === 'admin' ? 'Admin' : 'Vendedor'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 truncate hidden md:block">
            Panel de control de pedidos y finanzas
          </span>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenThemeModal}
          className={icono}
          title="Personalizar tema de colores"
          aria-label="Personalizar tema de colores"
        >
          <Palette className="w-4 h-4" />
        </motion.button>

        {role?.role === 'admin' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate && onNavigate('settings')}
            className={icono}
            title="Configuración (Colores, Lugares y Usuarios)"
            aria-label="Configuración"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          className={icono}
          title="Actualizar datos"
          aria-label="Actualizar datos"
        >
          <motion.div animate={{ rotate: isRefreshing ? 360 : 0 }} transition={{ duration: 0.5 }}>
            <RotateCw className="w-4 h-4" />
          </motion.div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenNewSale}
          className="h-9 sm:h-10 px-2.5 sm:px-4 inline-flex items-center gap-1.5 rounded-xl theme-btn-primary text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
          <span className="hidden xs:inline sm:inline">Nueva Venta</span>
        </motion.button>
      </div>
    </header>
  );
}

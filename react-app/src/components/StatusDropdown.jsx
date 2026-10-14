import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { ORDEN_ESTADOS, getEstadoBadgeStyle, ESTADOS_COLOR, normalizarEstado } from '../lib/utils';

/**
 * Selector desplegable de estados estilizado con micro-animaciones
 * Reemplaza el <select> básico por un dropdown elegante con chips semánticos
 */
export default function StatusDropdown({ value, onChange, disabled = false, size = 'sm' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const estadoActual = normalizarEstado(value);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (nuevoEstado) => {
    if (nuevoEstado !== estadoActual) {
      onChange(nuevoEstado);
    }
    setIsOpen(false);
  };

  const colorConfig = ESTADOS_COLOR[estadoActual] || ESTADOS_COLOR['Pedido'];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Botón Disparador */}
      <motion.button
        type="button"
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.03 }}
        whileTap={{ scale: disabled ? 1 : 0.96 }}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border font-extrabold transition-all cursor-pointer select-none shadow-2xs ${
          getEstadoBadgeStyle(estadoActual)
        } ${
          size === 'sm'
            ? 'px-2.5 py-1 text-[11px]'
            : 'px-3 py-1.5 text-xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Cambiar estado del pedido"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colorConfig.dot}`} />
        <span className="truncate max-w-[110px]">{estadoActual}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-3 h-3 stroke-[2.5]" />
        </motion.span>
      </motion.button>

      {/* Menú Desplegable Flotante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white shadow-xl border border-slate-200/90 py-1.5 z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
              Seleccionar Estado
            </div>

            <div className="space-y-0.5 px-1 max-h-60 overflow-y-auto">
              {ORDEN_ESTADOS.map((est) => {
                const isSelected = est === estadoActual;
                const estConfig = ESTADOS_COLOR[est] || ESTADOS_COLOR['Pedido'];

                return (
                  <motion.button
                    key={est}
                    type="button"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(est);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? `${getEstadoBadgeStyle(est)} font-extrabold`
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${estConfig.dot}`} />
                      <span className="truncate">{est}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

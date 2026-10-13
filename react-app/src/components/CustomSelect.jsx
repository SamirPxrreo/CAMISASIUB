import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * CustomSelect - Selector desplegable animado con Framer Motion
 * Reemplaza los <select> nativos del navegador por menús interactivos,
 * con soporte para iconos, puntos de color, badges y buscador.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  icon: TriggerIcon = null,
  disabled = false,
  size = 'md',
  dropdownWidth = 'w-full',
  searchable = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const containerRef = useRef(null);

  // Normalizar opciones a objetos consistentes
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: String(opt), label: String(opt) };
    }
    return {
      value: String(opt.value ?? opt.id ?? opt.nombre ?? ''),
      label: String(opt.label ?? opt.nombre ?? opt.value ?? ''),
      icon: opt.icon || null,
      colorDot: opt.colorDot || opt.hex || null,
      badge: opt.badge || null,
      desc: opt.desc || null
    };
  });

  const selectedOption = normalizedOptions.find(o => o.value === String(value)) || null;

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setBusqueda('');
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

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setBusqueda('');
  };

  const shouldShowSearch = searchable || normalizedOptions.length > 8;

  const filteredOptions = normalizedOptions.filter(opt => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return opt.label.toLowerCase().includes(q) || (opt.desc && opt.desc.toLowerCase().includes(q));
  });

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs rounded-xl',
    md: 'py-2.5 px-3.5 text-sm rounded-2xl',
    lg: 'py-3 px-4 text-base rounded-2xl'
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botón Disparador Principal */}
      <motion.button
        type="button"
        disabled={disabled}
        whileTap={disabled ? {} : { scale: 0.985 }}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2 border transition-all text-left outline-none cursor-pointer select-none font-medium ${
          sizeClasses[size] || sizeClasses.md
        } ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75'
            : isOpen
            ? 'bg-white border-indigo-500 ring-3 ring-indigo-500/10 shadow-xs text-slate-900'
            : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {TriggerIcon && (
            <TriggerIcon className="w-4 h-4 text-slate-400 shrink-0" />
          )}

          {selectedOption?.colorDot && (
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-2xs"
              style={{ backgroundColor: selectedOption.colorDot }}
            />
          )}

          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 text-indigo-600 shrink-0" />
          )}

          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          {selectedOption?.badge && (
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 border border-amber-500/30 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-slate-400"
        >
          <ChevronDown className="w-4 h-4 stroke-[2.2]" />
        </motion.span>
      </motion.button>

      {/* Menú Desplegable Flotante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className={`absolute left-0 mt-1.5 ${dropdownWidth} rounded-2xl bg-white shadow-2xl border border-slate-200/90 py-1.5 z-50 overflow-hidden max-h-64 flex flex-col`}
          >
            {/* Buscador interno si la lista es extensa */}
            {shouldShowSearch && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar opción..."
                    autoFocus
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:border-indigo-500 text-slate-800"
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lista de opciones scrolleable */}
            <div className="overflow-y-auto p-1 space-y-0.5 flex-1">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No se encontraron opciones
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedOption?.value === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      type="button"
                      whileHover={{ x: 2, backgroundColor: isSelected ? undefined : 'rgba(241, 245, 249, 0.7)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {opt.colorDot && (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-black/15 shadow-2xs"
                            style={{ backgroundColor: opt.colorDot }}
                          />
                        )}

                        {opt.icon && (
                          <opt.icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        )}

                        <span className="truncate">{opt.label}</span>

                        {opt.badge && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 border border-amber-500/30 shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3] shrink-0" />
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

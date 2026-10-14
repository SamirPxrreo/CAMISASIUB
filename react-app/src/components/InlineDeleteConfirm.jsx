import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw } from 'lucide-react';
import { btnDestructivo } from '../lib/buttonStyles';

/**
 * Componente de confirmación inline inspirado en Bencho.dev (https://bencho.dev/?c=confirm&theme=dark)
 * Presiona Borrar y el botón se expande en su propio espacio mostrando 'A papelera · Deshacer'
 * con una barra de tiempo regressiva (fuse timer). Si el usuario da clic en Deshacer, cancela.
 * Si deja correr el tiempo, confirma el borrado a la papelera.
 */
export default function InlineDeleteConfirm({ onDelete, clienteNombre, title, confirmLabel, duration = 4500 }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'confirming'
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleStartDelete = (e) => {
    e.stopPropagation();
    setPhase('confirming');
    timerRef.current = setTimeout(() => {
      onDelete();
    }, duration);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase('idle');
  };

  if (phase === 'confirming') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        className="relative flex w-full min-w-[15rem] items-center justify-between px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold overflow-hidden shadow-xs gap-2"
      >
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
          <span className="truncate text-[11px] font-black text-rose-900">
            {title || `A papelera (${clienteNombre || 'Pedido'})...`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white hover:bg-rose-100 text-rose-700 font-black text-[11px] shadow-xs border border-rose-200 transition-all cursor-pointer shrink-0"
          title="Deshacer acción"
        >
          <RotateCcw className="w-3 h-3 stroke-[2.5]" />
          <span>Deshacer</span>
        </button>

        {/* Barra de tiempo regresiva */}
        <div
          className="say-fuse absolute bottom-0 left-0 h-[2.5px] bg-rose-500 rounded-full"
          style={{ animationDuration: `${duration}ms` }}
        />
      </motion.div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartDelete}
      className={btnDestructivo}
      title="Eliminar elemento"
    >
      <Trash2 className="w-3.5 h-3.5" />
      <span>{confirmLabel || 'Borrar'}</span>
    </button>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Componente de Paginación Reutilizable
 * Muestra resumen ("Mostrando 1 - 12 de 35 pedidos") y botones numéricos interactivos [1, 2, 3...]
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 12,
  onPageChange,
  itemName = 'elementos'
}) {
  if (totalItems <= 0) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generar lista inteligente de números de página con elipsis si son muchas
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 mt-4 border-t border-slate-200/60 select-none">
      {/* Resumen de conteo */}
      <div className="text-xs font-medium text-slate-500 text-center sm:text-left">
        Mostrando <span className="font-bold text-slate-800">{startItem}</span> a{' '}
        <span className="font-bold text-slate-800">{endItem}</span> de{' '}
        <span className="font-bold theme-active-text">{totalItems}</span> {itemName}
      </div>

      {/* Botones de navegación si hay más de 1 página */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {/* Botón Primera Página */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:theme-active-text hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Primera página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </motion.button>

          {/* Botón Anterior */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:theme-active-text hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>

          {/* Números de página */}
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="w-7 h-8 flex items-center justify-center text-slate-400 text-xs">
                  &bull;&bull;&bull;
                </span>
              );
            }

            const isCurrent = p === currentPage;

            return (
              <motion.button
                key={`page-${p}`}
                whileHover={{ scale: isCurrent ? 1 : 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => onPageChange(p)}
                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'theme-btn-primary shadow-md ring-2 ring-black/10'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs'
                }`}
              >
                {p}
              </motion.button>
            );
          })}

          {/* Botón Siguiente */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>

          {/* Botón Última Página */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </motion.button>
        </div>
      )}
    </div>
  );
}

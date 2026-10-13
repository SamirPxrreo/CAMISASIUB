import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  Calendar,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useData } from '../context/DataContext';
import {
  fmt,
  formatearFechaHumana,
  precioTotalVenta
} from '../lib/utils';
import Pagination from './Pagination';

export default function TrashView() {
  const { refreshData } = useData();
  const [eliminados, setEliminados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const cargarPapelera = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .not('eliminado_at', 'is', null)
        .order('eliminado_at', { ascending: false });

      if (!error && data) {
        setEliminados(data);
      }
    } catch (e) {
      console.warn("Error cargando papelera:", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPapelera();
  }, []);

  const handleRestaurar = async (id, clienteNombre) => {
    try {
      const { error } = await supabase
        .from('ventas')
        .update({ eliminado_at: null })
        .eq('id', id);

      if (error) throw error;

      setEliminados(prev => prev.filter(v => v.id !== id));
      await refreshData();
      setMensaje(`Pedido de ${clienteNombre || 'este cliente'} restaurado exitosamente.`);
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      alert("Error al restaurar: " + err.message);
    }
  };

  const handleEliminarDefinitivo = async (id) => {
    if (window.confirm("¿Eliminar este pedido PARA SIEMPRE? Esta acción no se puede deshacer.")) {
      try {
        const { error } = await supabase.from('ventas').delete().eq('id', id);
        if (error) throw error;
        setEliminados(prev => prev.filter(v => v.id !== id));
        await refreshData();
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const pageSize = 12;
  const totalPages = Math.ceil(eliminados.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const eliminadosPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return eliminados.slice(start, start + pageSize);
  }, [eliminados, currentPage, pageSize]);

  const handleVaciarPapelera = async () => {
    if (eliminados.length === 0) return;
    if (window.confirm(`¿Estás seguro de vaciar la papelera y borrar los ${eliminados.length} pedidos definitivamente?`)) {
      try {
        const { error } = await supabase.from('ventas').delete().not('eliminado_at', 'is', null);
        if (error) throw error;
        setEliminados([]);
        await refreshData();
      } catch (err) {
        alert("Error al vaciar papelera: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Papelera de Reciclaje
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {eliminados.length} en papelera
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Los pedidos borrados se guardan aquí. Puedes restaurarlos en cualquier momento.
          </p>
        </div>

        {eliminados.length > 0 && (
          <button
            onClick={handleVaciarPapelera}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vaciar Papelera</span>
          </button>
        )}
      </div>

      {mensaje && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{mensaje}</span>
        </div>
      )}

      {/* 2. Grid de Pedidos en Papelera */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {eliminadosPaginados.map(v => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{v.cliente_nombre || 'Sin nombre'}</h3>
                    <span className="text-xs text-slate-400">Pedido #{v.id} • {v.vendedor || 'Samir'}</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    Borrado
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl mb-3">
                  <div>Prendas: {v.cantidad || 1} camisas</div>
                  <div>Valor total: {fmt(precioTotalVenta(v))}</div>
                  {v.eliminado_at && (
                    <div className="text-[10.5px] text-slate-400">
                      Borrado el: {new Date(v.eliminado_at).toLocaleDateString('es-CO')}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleRestaurar(v.id, v.cliente_nombre)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEliminarDefinitivo(v.id)}
                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Borrar definitivamente"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {eliminados.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">La papelera está vacía</h3>
            <p className="text-xs text-slate-400 mt-1">No hay pedidos eliminados actualmente.</p>
          </div>
        )}
      </div>

      {/* Controles de Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={eliminados.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="pedidos en papelera"
      />
    </div>
  );
}

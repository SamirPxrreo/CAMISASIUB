import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Shirt, ShoppingBag } from 'lucide-react';
import { useData } from '../context/DataContext';
import { fmt, precioTotalVenta } from '../lib/utils';

export default function SummariesView() {
  const { ventas } = useData();

  // Calcular ventas por vendedor
  const porVendedor = ventas.reduce((acc, v) => {
    const vend = v.vendedor || 'Sin asignar';
    acc[vend] = (acc[vend] || 0) + precioTotalVenta(v);
    return acc;
  }, {});

  // Total recaudado
  const totalRecaudado = Object.values(porVendedor).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
          Centro de Estadísticas & Métricas
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Resumen de ventas y desempeño del negocio
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ y: -4 }}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ventas Totales</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-950">{fmt(totalRecaudado)}</div>
          <p className="text-xs text-slate-400 mt-1">{ventas.length} pedidos en historial</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vendedor: Samir</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-950">{fmt(porVendedor['Samir'] || 0)}</div>
          <p className="text-xs text-slate-400 mt-1">Ventas directas registradas</p>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vendedora: Valentina</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-950">{fmt(porVendedor['Valentina'] || 0)}</div>
          <p className="text-xs text-slate-400 mt-1">Ventas directas registradas</p>
        </motion.div>
      </div>
    </div>
  );
}

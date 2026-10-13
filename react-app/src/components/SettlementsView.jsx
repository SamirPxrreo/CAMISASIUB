import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ArrowRightLeft, UserCheck, Shield } from 'lucide-react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/utils';

export default function SettlementsView() {
  const { liquidaciones, ventas } = useData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight">
          Liquidaciones entre Socios
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Control de ganancias y repartos equitativos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-1">
              Socio: Samir
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900">Al día</h3>
            <p className="text-xs text-slate-500 mt-1">Participación activa 50%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
            S
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-rose-50 to-white border border-rose-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">
              Socia: Valentina
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900">Al día</h3>
            <p className="text-xs text-slate-500 mt-1">Participación activa 50%</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-rose-500/20">
            V
          </div>
        </motion.div>
      </div>

      {/* Historial de Liquidaciones */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          Registros de Liquidación
        </h3>

        <div className="divide-y divide-slate-100">
          {liquidaciones.map((l) => (
            <div key={l.id} className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  De {l.pagador} para {l.receptor}
                </span>
                <span className="text-[11px] text-slate-400">
                  {l.fecha} &bull; {l.nota || 'Sin nota'}
                </span>
              </div>
              <span className="text-sm font-extrabold text-emerald-600">
                {fmt(l.monto)}
              </span>
            </div>
          ))}

          {liquidaciones.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">
              No hay liquidaciones registradas en este período.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

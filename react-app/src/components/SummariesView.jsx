import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Shirt,
  DollarSign,
  Calendar,
  Sparkles,
  PieChart,
  Award
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  fmt,
  precioTotalVenta,
  costoTotalVenta,
  itemsCrudosVenta,
  hoyColombia
} from '../lib/utils';

export default function SummariesView() {
  const { ventas } = useData();
  const [periodo, setPeriodo] = useState('todo');

  const periodos = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'ayer', label: 'Ayer' },
    { id: '7dias', label: 'Últimos 7 días' },
    { id: 'mes', label: 'Este Mes' },
    { id: 'todo', label: 'Todo el Historial' }
  ];

  const hoyStr = hoyColombia();

  // Filtrar pedidos según el período
  const ventasPeriodo = useMemo(() => {
    return ventas.filter(v => {
      const f = v.fecha || '';
      if (periodo === 'hoy') return f === hoyStr;
      if (periodo === 'ayer') {
        const d = new Date(hoyStr + 'T00:00:00');
        d.setDate(d.getDate() - 1);
        const ayerStr = d.toLocaleDateString('en-CA');
        return f === ayerStr;
      }
      if (periodo === '7dias') {
        const d = new Date(hoyStr + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        const limiteStr = d.toLocaleDateString('en-CA');
        return f >= limiteStr && f <= hoyStr;
      }
      if (periodo === 'mes') {
        const mesActual = hoyStr.slice(0, 7);
        return f.startsWith(mesActual);
      }
      return true; // 'todo'
    });
  }, [ventas, periodo, hoyStr]);

  // Cálculos consolidados
  const metricas = useMemo(() => {
    let totalVendido = 0;
    let totalCosto = 0;
    let totalCamisas = 0;

    let samirVendido = 0;
    let samirCamisas = 0;
    let valVendido = 0;
    let valCamisas = 0;

    let v1Count = 0;
    let v2Count = 0;

    const clientesMap = {};

    ventasPeriodo.forEach(v => {
      const p = precioTotalVenta(v);
      const c = costoTotalVenta(v);
      const cant = Number(v.cantidad) || 1;

      totalVendido += p;
      totalCosto += c;
      totalCamisas += cant;

      if (v.vendedor === 'Samir') {
        samirVendido += p;
        samirCamisas += cant;
      } else if (v.vendedor === 'Valentina') {
        valVendido += p;
        valCamisas += cant;
      }

      // Clientes
      const cli = v.cliente_nombre || 'Desconocido';
      clientesMap[cli] = (clientesMap[cli] || 0) + p;

      // Modelos
      const items = itemsCrudosVenta(v);
      if (items && items.length) {
        items.forEach(it => {
          if (it.modelo === 'Nuevo') v2Count++;
          else v1Count++;
        });
      } else {
        if (v.modelo === 'Nuevo') v2Count += cant;
        else v1Count += cant;
      }
    });

    const ganancia = Math.max(totalVendido - totalCosto, 0);
    const margen = totalVendido > 0 ? Math.round((ganancia / totalVendido) * 100) : 0;

    // Top clientes
    const topClientes = Object.entries(clientesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, monto]) => ({ nombre, monto }));

    return {
      totalVendido,
      totalCosto,
      ganancia,
      margen,
      totalCamisas,
      samirVendido,
      samirCamisas,
      valVendido,
      valCamisas,
      v1Count,
      v2Count,
      topClientes
    };
  }, [ventasPeriodo]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Cabecera y Selector de Período */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Métricas & Resúmenes
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Análisis de rendimiento, rentabilidad por socio y prendas vendidas.
          </p>
        </div>

        {/* Botones de Filtro de Período */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-x-auto max-w-full">
          {periodos.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                periodo === p.id
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Tarjetas KPI Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ventas Totales</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{fmt(metricas.totalVendido)}</span>
          <span className="text-xs text-slate-400 mt-0.5 block">{metricas.totalCamisas} camisas en {ventasPeriodo.length} pedidos</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Costo Yesenia</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{fmt(metricas.totalCosto)}</span>
          <span className="text-xs text-amber-700/80 mt-0.5 block">Costo directo de confección</span>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Utilidad Bruta</span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{fmt(metricas.ganancia)}</span>
          <span className="text-xs text-emerald-700 font-semibold mt-0.5 block">Margen del {metricas.margen}%</span>
        </div>

        <div className="p-5 rounded-3xl bg-indigo-50/70 border border-indigo-100 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Reparto entre Socios</span>
          <span className="text-2xl font-black text-indigo-950 mt-1 block">{fmt(metricas.ganancia / 2)}</span>
          <span className="text-xs text-indigo-600 font-semibold mt-0.5 block">Para cada socio (50%)</span>
        </div>
      </div>

      {/* 3. Desempeño por Socio & Modelos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Desempeño por Socio */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Desempeño por Socio en el Período
          </h3>

          <div className="space-y-4">
            {/* Samir */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  Samir ({metricas.samirCamisas} camisas)
                </span>
                <span>{fmt(metricas.samirVendido)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${metricas.totalVendido > 0 ? (metricas.samirVendido / metricas.totalVendido) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Valentina */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  Valentina ({metricas.valCamisas} camisas)
                </span>
                <span>{fmt(metricas.valVendido)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${metricas.totalVendido > 0 ? (metricas.valVendido / metricas.totalVendido) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desglose por Versión de Camisa */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Shirt className="w-4 h-4 text-indigo-600" />
            Prendas por Versión Tipo Polo
          </h3>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Versión 1 (Clásica)</span>
              <span className="text-3xl font-black text-slate-800">{metricas.v1Count}</span>
              <span className="text-[11px] text-slate-400 block mt-1">Costo base $30.000</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center">
              <span className="text-[11px] font-bold text-indigo-700 uppercase block mb-1">Versión 2 (Nueva)</span>
              <span className="text-3xl font-black text-indigo-900">{metricas.v2Count}</span>
              <span className="text-[11px] text-indigo-600 block mt-1">Costo base $31.000</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Top Clientes del Período */}
      {metricas.topClientes.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Top Clientes con Mayor Facturación
          </h3>

          <div className="divide-y divide-slate-100">
            {metricas.topClientes.map((c, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 font-extrabold text-slate-600 text-[10px] flex items-center justify-center">
                    #{i + 1}
                  </span>
                  <span className="font-bold text-slate-800">{c.nombre}</span>
                </div>
                <span className="font-extrabold text-slate-900">{fmt(c.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

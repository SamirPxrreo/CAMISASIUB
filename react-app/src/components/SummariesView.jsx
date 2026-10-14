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
  Award,
  MapPin,
  CheckCircle2,
  Package,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  fmt,
  precioTotalVenta,
  costoTotalVenta,
  itemsCrudosVenta,
  hoyColombia,
  COLORES_DEFECTO_OBJETOS,
  ORDEN_ESTADOS,
  ESTADOS_COLOR,
  getEstadoBadgeStyle,
  normalizarEstado
} from '../lib/utils';

export default function SummariesView() {
  const { ventas, colores } = useData();
  const [periodo, setPeriodo] = useState('todo');

  const periodos = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'ayer', label: 'Ayer' },
    { id: '7dias', label: 'Últimos 7 días' },
    { id: 'mes', label: 'Este Mes' },
    { id: 'todo', label: 'Todo el Historial' }
  ];

  const hoyStr = hoyColombia();

  const getColorHex = (nombreColor) => {
    const c = colores?.find(col => col.nombre.toLowerCase() === String(nombreColor || '').toLowerCase());
    if (c?.hex) return c.hex;
    const def = COLORES_DEFECTO_OBJETOS.find(col => col.nombre.toLowerCase() === String(nombreColor || '').toLowerCase());
    return def?.hex || '#94a3b8';
  };

  // Filtrar pedidos según el período seleccionado
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

  // Cálculos consolidados exhaustivos
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

    let hombreCount = 0;
    let mujerCount = 0;

    const combinacionesMap = {};
    const coloresMap = {};
    const tallasMap = {};
    const programasMap = {};
    const lugaresMap = {};
    const estadosPrendasMap = {};
    ORDEN_ESTADOS.forEach(e => { estadosPrendasMap[e] = 0; });
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

      // Lugares de entrega
      const lug = v.lugar_entrega || 'Sin asignar';
      lugaresMap[lug] = (lugaresMap[lug] || 0) + 1;

      // Items individuales
      const items = itemsCrudosVenta(v);
      if (items && items.length) {
        items.forEach(it => {
          const mod = it.modelo === 'Nuevo' ? 'v2' : 'v1';
          if (it.modelo === 'Nuevo') v2Count++; else v1Count++;

          const gen = it.genero === 'Mujer' ? 'Mujer' : 'Hombre';
          if (gen === 'Mujer') mujerCount++; else hombreCount++;

          const col = (it.color || 'Negro').trim();
          coloresMap[col] = (coloresMap[col] || 0) + 1;

          const tal = (it.talla || 'M').trim().toUpperCase();
          tallasMap[tal] = (tallasMap[tal] || 0) + 1;

          const prog = (it.programa || '').trim();
          if (prog) {
            programasMap[prog] = (programasMap[prog] || 0) + 1;
          }

          const est = normalizarEstado(it.estado || v.estado);
          if (estadosPrendasMap[est] !== undefined) estadosPrendasMap[est]++;

          // Combinación clave: "Polo Hombre Negro M (v1)"
          const comboKey = `Polo ${gen} ${col} Talla ${tal} (${mod.toUpperCase()})`;
          if (!combinacionesMap[comboKey]) {
            combinacionesMap[comboKey] = {
              nombre: comboKey,
              genero: gen,
              color: col,
              talla: tal,
              modelo: mod,
              cantidad: 0
            };
          }
          combinacionesMap[comboKey].cantidad++;
        });
      } else {
        // Pedido simple antiguo
        const mod = v.modelo === 'Nuevo' ? 'v2' : 'v1';
        if (v.modelo === 'Nuevo') v2Count += cant; else v1Count += cant;

        const gen = v.genero === 'Mujer' ? 'Mujer' : 'Hombre';
        if (gen === 'Mujer') mujerCount += cant; else hombreCount += cant;

        const col = (v.color || 'Negro').trim();
        coloresMap[col] = (coloresMap[col] || 0) + cant;

        const tal = (v.talla || 'M').trim().toUpperCase();
        tallasMap[tal] = (tallasMap[tal] || 0) + cant;

        const prog = (v.cliente_programa || '').trim();
        if (prog) {
          programasMap[prog] = (programasMap[prog] || 0) + cant;
        }

        const est = normalizarEstado(v.estado);
        if (estadosPrendasMap[est] !== undefined) estadosPrendasMap[est] += cant;

        const comboKey = `Polo ${gen} ${col} Talla ${tal} (${mod.toUpperCase()})`;
        if (!combinacionesMap[comboKey]) {
          combinacionesMap[comboKey] = {
            nombre: comboKey,
            genero: gen,
            color: col,
            talla: tal,
            modelo: mod,
            cantidad: 0
          };
        }
        combinacionesMap[comboKey].cantidad += cant;
      }
    });

    const ganancia = Math.max(totalVendido - totalCosto, 0);
    const margen = totalVendido > 0 ? Math.round((ganancia / totalVendido) * 100) : 0;
    const ticketPromedio = ventasPeriodo.length > 0 ? Math.round(totalVendido / ventasPeriodo.length) : 0;
    const prendasPorPedido = ventasPeriodo.length > 0 ? (totalCamisas / ventasPeriodo.length).toFixed(1) : '0';

    // Top combinaciones más vendidas
    const topCombinaciones = Object.values(combinacionesMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6);

    // Colores ranking
    const coloresRanking = Object.entries(coloresMap)
      .sort((a, b) => b[1] - a[1])
      .map(([color, cantidad]) => ({ color, cantidad }));

    // Tallas ordenadas
    const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
    const tallasRanking = Object.entries(tallasMap)
      .sort((a, b) => {
        const iA = ordenTallas.indexOf(a[0]);
        const iB = ordenTallas.indexOf(b[0]);
        if (iA !== -1 && iB !== -1) return iA - iB;
        if (iA !== -1) return -1;
        if (iB !== -1) return 1;
        return b[1] - a[1];
      })
      .map(([talla, cantidad]) => ({ talla, cantidad }));

    // Top programas bordados
    const topProgramas = Object.entries(programasMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([programa, cantidad]) => ({ programa, cantidad }));

    // Top lugares de entrega
    const topLugares = Object.entries(lugaresMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lugar, cantidad]) => ({ lugar, cantidad }));

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
      ticketPromedio,
      prendasPorPedido,
      samirVendido,
      samirCamisas,
      valVendido,
      valCamisas,
      v1Count,
      v2Count,
      hombreCount,
      mujerCount,
      topCombinaciones,
      coloresRanking,
      tallasRanking,
      topProgramas,
      topLugares,
      estadosPrendasMap,
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
            Análisis comercial, prendas más vendidas, colores populares y rentabilidad por socio.
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

      {/* 3. Métricas Rápidas Operativas (Ticket Promedio y Prendas por Pedido) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Ticket Promedio</span>
            <span className="text-base font-black text-slate-900 block">{fmt(metricas.ticketPromedio)}</span>
            <span className="text-[10px] text-slate-400">Por pedido realizado</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Camisas por Pedido</span>
            <span className="text-base font-black text-slate-900 block">{metricas.prendasPorPedido} prendas</span>
            <span className="text-[10px] text-slate-400">Promedio por orden</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Versión Más Popular</span>
            <span className="text-base font-black text-slate-900 block">
              {metricas.v2Count >= metricas.v1Count ? 'Versión 2 (Nueva)' : 'Clásica'}
            </span>
            <span className="text-[10px] text-slate-400">
              {Math.max(metricas.v1Count, metricas.v2Count)} prendas vendidas
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Preferencia Género</span>
            <span className="text-base font-black text-slate-900 block">
              {metricas.hombreCount >= metricas.mujerCount ? 'Hombre' : 'Mujer'}
            </span>
            <span className="text-[10px] text-slate-400">
              {metricas.totalCamisas > 0
                ? `${Math.round((Math.max(metricas.hombreCount, metricas.mujerCount) / metricas.totalCamisas) * 100)}% de los pedidos`
                : 'Sin ventas'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. CAMISAS MÁS VENDIDAS (RANKING DE PRENDAS DESTACADAS) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-indigo-600" />
              Camisas Más Vendidas (Top Combinaciones)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Prendas favoritas agrupadas por versión, género, color y talla en el período seleccionado.
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 shrink-0">
            {metricas.totalCamisas} prendas en total
          </span>
        </div>

        {metricas.topCombinaciones.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metricas.topCombinaciones.map((combo, idx) => {
              const hex = getColorHex(combo.color);
              const porcentaje = metricas.totalCamisas > 0
                ? Math.round((combo.cantidad / metricas.totalCamisas) * 100)
                : 0;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:border-indigo-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </span>
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                        style={{ backgroundColor: hex }}
                        title={combo.color}
                      />
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 block truncate">
                          {combo.genero} • {combo.color}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Talla <strong className="text-slate-700">{combo.talla}</strong>
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-700 shrink-0">
                      {combo.modelo === 'v2' ? 'v2 Nueva' : 'Clásica'}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span className="text-slate-700">{combo.cantidad} unidad{combo.cantidad !== 1 ? 'es' : ''}</span>
                      <span className="text-indigo-600 font-extrabold">{porcentaje}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200/70 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No hay camisas registradas en este período.
          </div>
        )}
      </div>

      {/* 5. PREFERENCIAS DEL CLIENTE: COLORES, TALLAS Y GÉNERO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Colores Más Populares */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            Colores Más Vendidos
          </h3>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {metricas.coloresRanking.length > 0 ? (
              metricas.coloresRanking.map((col, idx) => {
                const hex = getColorHex(col.color);
                const pct = metricas.totalCamisas > 0
                  ? Math.round((col.cantidad / metricas.totalCamisas) * 100)
                  : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-bold text-slate-800">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                        {col.color}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {col.cantidad} <span className="text-[10.5px] text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-slate-400">Sin datos de colores</span>
            )}
          </div>
        </div>

        {/* Curva de Tallas */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Curva de Tallas
          </h3>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {metricas.tallasRanking.length > 0 ? (
              metricas.tallasRanking.map((tal, idx) => {
                const pct = metricas.totalCamisas > 0
                  ? Math.round((tal.cantidad / metricas.totalCamisas) * 100)
                  : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-800 px-2 py-0.5 rounded-md bg-slate-100 text-[11px]">
                        Talla {tal.talla}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {tal.cantidad} <span className="text-[10.5px] text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-slate-400">Sin datos de tallas</span>
            )}
          </div>
        </div>

        {/* Distribución por Género */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Distribución Hombre vs Mujer
            </h3>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-center">
                <span className="text-[10.5px] font-bold text-blue-700 uppercase block mb-0.5">Hombre</span>
                <span className="text-2xl font-black text-blue-900">{metricas.hombreCount}</span>
                <span className="text-[10.5px] text-blue-600 block mt-0.5">
                  {metricas.totalCamisas > 0 ? Math.round((metricas.hombreCount / metricas.totalCamisas) * 100) : 0}% del total
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-[10.5px] font-bold text-rose-700 uppercase block mb-0.5">Mujer</span>
                <span className="text-2xl font-black text-rose-900">{metricas.mujerCount}</span>
                <span className="text-[10.5px] text-rose-600 block mt-0.5">
                  {metricas.totalCamisas > 0 ? Math.round((metricas.mujerCount / metricas.totalCamisas) * 100) : 0}% del total
                </span>
              </div>
            </div>
          </div>

          {/* Barra comparativa */}
          <div className="pt-2 border-t border-slate-100">
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${metricas.totalCamisas > 0 ? (metricas.hombreCount / metricas.totalCamisas) * 100 : 50}%`
                }}
                title="Hombre"
              />
              <div
                className="h-full bg-rose-400 transition-all duration-500"
                style={{
                  width: `${metricas.totalCamisas > 0 ? (metricas.mujerCount / metricas.totalCamisas) * 100 : 50}%`
                }}
                title="Mujer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. LOGÍSTICA & ESTADO DE PRODUCCIÓN (BORDADOS, LUGARES Y ESTADOS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Bordados / Programas */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            Top Bordados / Carreras
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {metricas.topProgramas.length > 0 ? (
              metricas.topProgramas.map((prog, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
                  <span className="font-bold text-slate-800 truncate pr-2">
                    {prog.programa}
                  </span>
                  <span className="font-black text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200/60 shrink-0">
                    {prog.cantidad}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400">Sin bordados específicos registrados</span>
            )}
          </div>
        </div>

        {/* Puntos de Entrega Más Frecuentes */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            Lugares de Entrega Top
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {metricas.topLugares.length > 0 ? (
              metricas.topLugares.map((lug, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="font-bold text-slate-800 truncate pr-2">
                    {lug.lugar}
                  </span>
                  <span className="font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                    {lug.cantidad} pedidos
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400">Sin lugares asignados</span>
            )}
          </div>
        </div>

        {/* Estado Actual de las Prendas */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Estado del Lote en el Período
          </h3>

          <div className="space-y-1.5">
            {ORDEN_ESTADOS.map((est) => {
              const cant = metricas.estadosPrendasMap[est] || 0;
              const estConfig = ESTADOS_COLOR[est] || ESTADOS_COLOR['Pedido'];
              return (
                <div key={est} className="flex items-center justify-between p-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="flex items-center gap-2 font-bold text-slate-800">
                    <span className={`w-2 h-2 rounded-full ${estConfig.dot}`} />
                    {est}
                  </span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.2 rounded-full border ${getEstadoBadgeStyle(est)}`}>
                    {cant}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Desempeño por Socio & Modelos */}
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
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">Clásica</span>
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

      {/* 8. Top Clientes del Período */}
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

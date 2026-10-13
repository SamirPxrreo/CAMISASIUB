import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Search,
  Phone,
  MessageCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  X,
  Share2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  fmt,
  saldoCliente,
  precioTotalVenta,
  abonoClienteTotal,
  claveCliente,
  getWhatsAppLink,
  estadosTodosLiquidado,
  formatearFechaHumana,
  getEstadoBadgeStyle
} from '../lib/utils';

export default function CuentasView() {
  const { ventas } = useData();
  const [busqueda, setBusqueda] = useState('');
  const [expandedClave, setExpandedClave] = useState(null);

  // Agrupar pedidos activos por cliente
  const cuentasAgrupadas = useMemo(() => {
    const grupos = new Map();

    ventas.forEach(v => {
      if (v.finalizado || estadosTodosLiquidado(v)) return;

      const clave = claveCliente(v);
      if (!grupos.has(clave)) {
        grupos.set(clave, {
          clave,
          cliente: v.cliente_nombre || 'Cliente sin nombre',
          telefono: v.cliente_telefono || v.telefono || '',
          vendedores: new Set(),
          pedidos: [],
          camisas: 0,
          vendido: 0,
          abono: 0,
          saldo: 0
        });
      }

      const g = grupos.get(clave);
      if (v.vendedor) g.vendedores.add(v.vendedor);
      if (!g.telefono && (v.cliente_telefono || v.telefono)) {
        g.telefono = v.cliente_telefono || v.telefono;
      }
      g.pedidos.push(v);
      g.camisas += Number(v.cantidad) || 1;
      g.vendido += precioTotalVenta(v);
      g.abono += abonoClienteTotal(v);
    });

    const lista = [];
    grupos.forEach(g => {
      g.saldo = Math.max(g.vendido - g.abono, 0);
      g.vendedoresStr = [...g.vendedores].join(', ') || 'Samir';
      lista.push(g);
    });

    // Ordenar de mayor deuda a menor
    lista.sort((a, b) => b.saldo - a.saldo);
    return lista;
  }, [ventas]);

  // Filtrar por búsqueda
  const cuentasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return cuentasAgrupadas;
    const q = busqueda.toLowerCase().trim();
    return cuentasAgrupadas.filter(c =>
      c.cliente.toLowerCase().includes(q) ||
      c.telefono.toLowerCase().includes(q) ||
      c.vendedoresStr.toLowerCase().includes(q)
    );
  }, [cuentasAgrupadas, busqueda]);

  // KPIs
  const totalPorCobrar = cuentasAgrupadas.reduce((s, c) => s + c.saldo, 0);
  const clientesConDeuda = cuentasAgrupadas.filter(c => c.saldo > 0).length;
  const deudaPromedio = clientesConDeuda > 0 ? Math.round(totalPorCobrar / clientesConDeuda) : 0;

  const toggleExpand = (clave) => {
    setExpandedClave(prev => prev === clave ? null : clave);
  };

  const getClientWhatsAppLink = (cuenta) => {
    if (!cuenta.telefono) return null;
    const texto = `Hola *${cuenta.cliente}*, te escribimos de *Camisas IUB* 👕.\n\nQueremos recordarte que tienes un saldo pendiente acumulado de *${fmt(cuenta.saldo)}* por tus pedidos de camisas Polo.\n\nPor favor confírmanos tu pago para continuar con la entrega. ¡Muchas gracias!`;
    return getWhatsAppLink(cuenta.telefono, texto);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Cuentas por Cliente
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {cuentasFiltradas.length} clientes
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Saldos consolidados, historial de cobros y recordatorios por WhatsApp.
          </p>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente o teléfono..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200/80 focus:border-indigo-500 text-xs font-medium outline-none transition-all shadow-xs"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjetas KPI Bubbly */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Total por Cobrar</span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">{fmt(totalPorCobrar)}</span>
            <span className="text-xs text-amber-700/80 mt-0.5 block">{clientesConDeuda} clientes con saldo pendiente</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Clientes con Deuda</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{clientesConDeuda}</span>
            <span className="text-xs text-slate-400 mt-0.5 block">De un total de {cuentasAgrupadas.length} clientes</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Deuda Promedio</span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">{fmt(deudaPromedio)}</span>
            <span className="text-xs text-indigo-600 font-semibold mt-0.5 block">Por cliente con saldo</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Lista de Cuentas */}
      <div className="space-y-3">
        <AnimatePresence>
          {cuentasFiltradas.map((c) => {
            const isExpanded = expandedClave === c.clave;
            const waLink = getClientWhatsAppLink(c);

            return (
              <motion.div
                key={c.clave}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Info del Cliente */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                      {(c.cliente || 'C')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 text-base truncate flex items-center gap-2">
                        {c.cliente}
                        {c.saldo === 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Paz y Salvo ✓
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        {c.telefono && (
                          <span className="font-mono text-slate-600 font-medium">{c.telefono}</span>
                        )}
                        <span>•</span>
                        <span>{c.vendedoresStr}</span>
                        <span>•</span>
                        <span>{c.pedidos.length} pedido(s) ({c.camisas} camisas)</span>
                      </div>
                    </div>
                  </div>

                  {/* Números y Saldo */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                        Vendido / Abono
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {fmt(c.vendido)} <span className="text-emerald-600 font-semibold">({fmt(c.abono)})</span>
                      </span>
                    </div>

                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                        Saldo
                      </span>
                      <span className={`text-base font-black ${c.saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {fmt(c.saldo)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5">
                      {c.saldo > 0 && waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title="Enviar cobro por WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(c.clave)}
                        className="p-2 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
                        title={isExpanded ? "Ocultar pedidos" : "Ver pedidos del cliente"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Desglose de Pedidos del Cliente Expandible */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-slate-100 space-y-2 overflow-hidden"
                  >
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Pedidos activos de {c.cliente}:
                    </span>
                    {c.pedidos.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-slate-800">Pedido #{p.id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEstadoBadgeStyle(p.estado)}`}>
                            {p.estado}
                          </span>
                          <span className="text-slate-500">{formatearFechaHumana(p.fecha)}</span>
                          <span className="text-slate-400">• {p.cantidad} camisa(s)</span>
                        </div>

                        <div className="flex items-center gap-3 font-semibold">
                          <span>Total: {fmt(precioTotalVenta(p))}</span>
                          <span className="text-emerald-700">Abono: {fmt(abonoClienteTotal(p))}</span>
                          <span className={`font-bold ${saldoCliente(p) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                            Saldo: {fmt(saldoCliente(p))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {cuentasFiltradas.length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No hay cuentas pendientes</h3>
            <p className="text-xs text-slate-400 mt-1">Todos los clientes están al día con sus pagos.</p>
          </div>
        )}
      </div>
    </div>
  );
}

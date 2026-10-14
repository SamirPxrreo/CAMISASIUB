import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles,
  Eye,
  Pencil,
  CheckCircle2
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
  normalizarEstado,
  formatearFechaHumana,
  getEstadoBadgeStyle,
  itemsCrudosVenta,
  precioDeItem
} from '../lib/utils';
import Pagination from './Pagination';
import StatusDropdown from './StatusDropdown';
import OrderDetailModal from './OrderDetailModal';

export default function CuentasView({ targetOrder, onClearTargetOrder, onEditOrder }) {
  const { ventas, updateOrderEstadoCompleto, finalizarPedido } = useData();
  const [busqueda, setBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedClave, setExpandedClave] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // Auto-filtrar y auto-expandir si venimos con targetOrder desde Calendario
  useEffect(() => {
    if (targetOrder) {
      setBusqueda(targetOrder.cliente_nombre || '');
      setExpandedClave(claveCliente(targetOrder));
    }
  }, [targetOrder]);

  const activeOrderForModal = useMemo(() => {
    if (!selectedOrderDetail) return null;
    return ventas.find(v => String(v.id) === String(selectedOrderDetail.id)) || selectedOrderDetail;
  }, [ventas, selectedOrderDetail]);

  // Agrupar pedidos activos por cliente (pedidos no finalizados)
  const cuentasAgrupadas = useMemo(() => {
    const grupos = new Map();

    ventas.forEach(v => {
      if (v.finalizado) return;

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

  const pageSize = 12;
  const totalPages = Math.ceil(cuentasFiltradas.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const cuentasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return cuentasFiltradas.slice(start, start + pageSize);
  }, [cuentasFiltradas, currentPage, pageSize]);

  // KPIs
  const totalPorCobrar = cuentasAgrupadas.reduce((s, c) => s + c.saldo, 0);
  const clientesConDeuda = cuentasAgrupadas.filter(c => c.saldo > 0).length;
  const deudaPromedio = clientesConDeuda > 0 ? Math.round(totalPorCobrar / clientesConDeuda) : 0;

  const toggleExpand = (clave) => {
    setExpandedClave(prev => prev === clave ? null : clave);
  };

  const getClientWhatsAppLink = (cuenta) => {
    if (!cuenta.telefono) return null;
    return getWhatsAppLink(cuenta.telefono);
  };

  const generarReciboFacturaPDF = (grupo) => {
    if (!grupo) return;
    const cliente = grupo.cliente || 'Cliente';
    const telefono = grupo.telefono || '';
    const pedidos = grupo.pedidos || [];
    const fechaHoy = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

    const seleccion = [];
    pedidos.forEach(v => {
      const crudos = itemsCrudosVenta(v);
      if (crudos && crudos.length) {
        crudos.forEach(it => seleccion.push({ venta: v, item: it }));
      } else {
        seleccion.push({
          venta: v,
          item: {
            modelo: v.modelo || '1',
            color: v.color || 'Blanco',
            talla: v.talla || 'U',
            genero: v.genero || 'Hombre',
            programa: v.cliente_programa || '',
            precio: v.precio_unitario || 30000,
            abono: v.abono || 0
          }
        });
      }
    });

    const total = grupo.vendido;
    const abonoTot = grupo.abono;
    const saldo = grupo.saldo;

    const filas = seleccion.map((x, i) => {
      const it = x.item;
      const v = x.venta;
      const p = precioDeItem(it, v);
      const ab = Number(it.abono) || 0;
      const modeloBadge = it.modelo === 'Nuevo'
        ? `<span style="display:inline-block;margin-left:6px;padding:2px 6px;border-radius:4px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:800;">v2</span>`
        : '';
      const desc = `${it.color || 'Negro'} · Talla ${it.talla || 'U'} para ${it.genero === 'Mujer' ? 'Mujer' : 'Hombre'}`;
      const prog = it.programa ? `<div style="font-size:10px;color:#4f46e5;font-weight:700;margin-top:2px;">Bordado: ${it.programa}</div>` : '';
      const rest = Math.max(p - ab, 0);
      const restBadge = rest === 0
        ? '<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;">Pagado</span>'
        : `<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;">${fmt(rest)}</span>`;

      return `
        <tr>
          <td style="text-align:center;padding:9px;border-bottom:1px solid #f1f5f9;font-weight:700;">${i + 1}</td>
          <td style="padding:9px;border-bottom:1px solid #f1f5f9;">
            <div style="font-weight:800;color:#0f172a;">${desc} ${modeloBadge}</div>
            ${prog}
            <div style="font-size:10px;color:#64748b;margin-top:2px;">Pedido: ${v.fecha || ''} · ${v.estado || 'Pedido'}</div>
          </td>
          <td style="text-align:center;padding:9px;border-bottom:1px solid #f1f5f9;font-weight:700;">1</td>
          <td style="text-align:right;padding:9px;border-bottom:1px solid #f1f5f9;font-weight:700;">${fmt(p)}</td>
          <td style="text-align:right;padding:9px;border-bottom:1px solid #f1f5f9;color:#16a34a;font-weight:700;">${fmt(ab)}</td>
          <td style="text-align:right;padding:9px;border-bottom:1px solid #f1f5f9;">${restBadge}</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Recibo / Factura — ${cliente}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 10pt; background: #f8fafc; line-height: 1.45; }
  .sheet { max-width: 800px; margin: 0 auto; padding: 24px; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  .toolbar { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: 20px; }
  .btn { padding: 9px 18px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font-weight: 700; font-size: 13px; transition: all 0.2s; }
  .btn-primary { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  .btn-primary:hover { background: #4338ca; }
  .header { background: linear-gradient(135deg, #1e1b4b, #312e81, #4338ca); color: #fff; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 6px; font-size: 20pt; font-weight: 900; letter-spacing: -0.5px; }
  .header p { margin: 0; font-size: 10pt; opacity: 0.9; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; }
  .kpi-title { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; font-weight: 700; margin-bottom: 4px; }
  .kpi-val { font-size: 14pt; font-weight: 900; color: #0f172a; }
  .kpi-val.green { color: #16a34a; }
  .kpi-val.amber { color: #d97706; }
  .client-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 10pt; }
  .client-box dt { color: #64748b; font-weight: 600; font-size: 8.5pt; text-transform: uppercase; }
  .client-box dd { margin: 0; font-weight: 800; color: #0f172a; }
  table.data-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 20px; }
  table.data-table th { background: #0f172a; color: #fff; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .totals-box { width: 340px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
  .row { display: flex; justify-content: space-between; padding: 10px 14px; border-top: 1px solid #e2e8f0; font-size: 10pt; }
  .row:first-child { border-top: none; }
  .row.highlight { background: #0f172a; color: #fff; font-weight: 900; font-size: 12pt; }
  .foot { border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 8.5pt; }
  @media print {
    body { background: #fff; padding: 0; }
    .toolbar { display: none; }
    .sheet { box-shadow: none; padding: 0; max-width: 100%; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="toolbar">
    <button class="btn" onclick="window.close()" type="button">Cerrar</button>
    <button class="btn btn-primary" onclick="window.print()" type="button">🖨️ Imprimir / Guardar como PDF</button>
  </div>

  <div class="header">
    <h1>CAMISAS IUB — RECIBO / FACTURA</h1>
    <p>Cliente: <b>${cliente}</b> · Emisión: ${fechaHoy} · ${seleccion.length} prendas registradas</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-title">Total Prendas</div><div class="kpi-val">${seleccion.length}</div></div>
    <div class="kpi-card"><div class="kpi-title">Total Venta</div><div class="kpi-val">${fmt(total)}</div></div>
    <div class="kpi-card"><div class="kpi-title">Abonado</div><div class="kpi-val green">${fmt(abonoTot)}</div></div>
    <div class="kpi-card"><div class="kpi-title">Saldo Pendiente</div><div class="kpi-val amber">${fmt(saldo)}</div></div>
  </div>

  <div class="client-box">
    <div><dt>Cliente</dt><dd>${cliente}</dd></div>
    <div><dt>Teléfono</dt><dd>${telefono || 'No registrado'}</dd></div>
    <div><dt>Vendedores asociados</dt><dd>${grupo.vendedoresStr || 'Samir'}</dd></div>
    <div><dt>Pedidos en cuenta</dt><dd>${pedidos.length} pedido(s)</dd></div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width:40px;text-align:center;">#</th>
        <th>Descripción de Prenda</th>
        <th style="width:50px;text-align:center;">Cant</th>
        <th style="width:90px;text-align:right;">Precio</th>
        <th style="width:90px;text-align:right;">Abono</th>
        <th style="width:100px;text-align:right;">Saldo</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-box">
      <div class="row"><span>Subtotal Prendas:</span><b>${fmt(total)}</b></div>
      <div class="row"><span style="color:#16a34a;">Total Abonado:</span><b style="color:#16a34a;">-${fmt(abonoTot)}</b></div>
      <div class="row highlight"><span>Saldo a Cobrar:</span><b>${fmt(saldo)}</b></div>
    </div>
  </div>

  <div class="foot">
    <p>Camisas IUB · Comprobante oficial de venta y estado de cuenta · Gracias por tu compra</p>
  </div>
</div>
</body>
</html>`;

    const ventana = window.open('', '_blank');
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    }
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
          {cuentasPaginadas.map((c) => {
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
                      {/* Botón Generar PDF */}
                      <button
                        type="button"
                        onClick={() => generarReciboFacturaPDF(c)}
                        className="p-2 px-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                        title="Generar Factura / Recibo PDF"
                      >
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {c.saldo > 0 && waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title="Abrir chat en WhatsApp"
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
                      Pedidos de {c.cliente}:
                    </span>
                    {c.pedidos.map((p, idx) => {
                      const esSeleccionado = targetOrder && String(targetOrder.id) === String(p.id);
                      return (
                        <div
                          key={p.id || idx}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            esSeleccionado
                              ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/40 shadow-xs'
                              : 'bg-slate-50/70 border-slate-200/60'
                          } flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-800">Pedido #{p.id}</span>
                              {esSeleccionado && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600 text-white animate-pulse">
                                  🎯 Desde Calendario
                                </span>
                              )}
                              <StatusDropdown
                                value={normalizarEstado(p.estado)}
                                onChange={(nuevoEstado) => updateOrderEstadoCompleto && updateOrderEstadoCompleto(p.id, nuevoEstado)}
                                size="sm"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 font-medium text-[11px] flex-wrap">
                              <span>{formatearFechaHumana(p.fecha)}</span>
                              <span>•</span>
                              <span>{p.cantidad} camisa(s)</span>
                              <span>•</span>
                              <span>Total: <b className="text-slate-800">{fmt(precioTotalVenta(p))}</b></span>
                              <span>•</span>
                              <span className="text-emerald-700">Abono: <b>{fmt(abonoClienteTotal(p))}</b></span>
                              <span>•</span>
                              <span className={`font-bold ${saldoCliente(p) > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                                Saldo: {saldoCliente(p) > 0 ? fmt(saldoCliente(p)) : 'Pagado ✓'}
                              </span>
                            </div>
                          </div>

                          {/* Acciones interactivas del pedido */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center flex-wrap">
                            {/* Ver detalle de prendas y cambiar estados individuales */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderDetail(p)}
                              className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Ver prendas y estados de este pedido"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Prendas</span>
                            </button>

                            {/* Editar pedido */}
                            {onEditOrder && (
                              <button
                                type="button"
                                onClick={() => onEditOrder(p)}
                                className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="Editar pedido"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                                <span>Editar</span>
                              </button>
                            )}

                            {/* Finalizar pedido */}
                            <button
                              type="button"
                              onClick={() => finalizarPedido(p.id)}
                              className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all ${
                                estadosTodosLiquidado(p)
                                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-xs'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                              }`}
                              title={
                                estadosTodosLiquidado(p)
                                  ? 'Finalizar pedido y mover a Historial'
                                  : 'Requiere que todas las prendas estén en estado Liquidado (pagado a Yesenia y liquidado entre socios)'
                              }
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 ${estadosTodosLiquidado(p) ? 'text-white' : 'text-slate-500'}`} />
                              <span>Finalizar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
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

      {/* 4. Controles de Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={cuentasFiltradas.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="cuentas de clientes"
      />

      {/* 5. Modal de detalle de prendas para inspeccionar y cambiar estados */}
      <OrderDetailModal
        isOpen={!!selectedOrderDetail}
        onClose={() => setSelectedOrderDetail(null)}
        order={activeOrderForModal}
        onEditOrder={onEditOrder}
      />
    </div>
  );
}

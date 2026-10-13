import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Search,
  X,
  Phone,
  Calendar,
  RotateCcw,
  Pencil,
  CheckCircle,
  ShoppingBag,
  Shirt,
  DollarSign,
  Share2,
  FileText
} from 'lucide-react';
import { useData } from '../context/DataContext';
import {
  fmt,
  estadosTodosLiquidado,
  formatearFechaHumana,
  precioTotalVenta,
  abonoClienteTotal,
  itemsCrudosVenta,
  getEstadoBadgeStyle,
  getWhatsAppLink,
  generarMensajeWhatsApp
} from '../lib/utils';
import Pagination from './Pagination';
import { useAuth } from '../context/AuthContext';

export default function HistoryView({ onEditOrder }) {
  const { ventas, updateVenta } = useData();
  const { role } = useAuth();
  const esAdmin = role?.role === 'admin';
  const miNombreVendedor = role?.vendedor || role?.nombre;

  const [busqueda, setBusqueda] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Pedidos en historial (finalizados o totalmente liquidados)
  const pedidosHistorial = useMemo(() => {
    return ventas.filter(v => v.finalizado || estadosTodosLiquidado(v));
  }, [ventas]);

  // Filtrado
  const pedidosFiltrados = useMemo(() => {
    return pedidosHistorial.filter(v => {
      if (!esAdmin && miNombreVendedor) {
        if (v.vendedor !== miNombreVendedor) return false;
      } else if (vendedorFiltro !== 'Todos' && v.vendedor !== vendedorFiltro) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const cli = (v.cliente_nombre || '').toLowerCase();
        const tel = (v.cliente_telefono || v.telefono || '').toLowerCase();
        const nota = (v.nota || '').toLowerCase();
        return cli.includes(q) || tel.includes(q) || nota.includes(q);
      }
      return true;
    });
  }, [pedidosHistorial, busqueda, vendedorFiltro]);

  const pageSize = 15;
  const totalPages = Math.ceil(pedidosFiltrados.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const pedidosPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return pedidosFiltrados.slice(start, start + pageSize);
  }, [pedidosFiltrados, currentPage, pageSize]);

  // KPIs
  const totalCamisasEntregadas = pedidosHistorial.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);
  const totalRecaudado = pedidosHistorial.reduce((s, v) => s + abonoClienteTotal(v), 0);

  // Restaurar pedido a activo
  const handleRestaurar = async (v) => {
    if (window.confirm(`¿Reabrir el pedido #${v.id} de ${v.cliente_nombre}? Volverá a la lista de pedidos activos.`)) {
      await updateVenta(v.id, {
        finalizado: false,
        estado: 'Listo para entrega'
      });
    }
  };

  // Generar e imprimir recibo PDF del pedido finalizado
  const handleImprimirRecibo = (v) => {
    const cliente = v.cliente_nombre || 'Cliente';
    const telefono = v.cliente_telefono || '';
    const fechaHoy = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
    const items = itemsCrudosVenta(v) || [];
    const total = precioTotalVenta(v);
    const abonoTot = abonoClienteTotal(v);
    const saldo = Math.max(total - abonoTot, 0);

    const filasHtml = items.map((it) => {
      const p = Number(it.precio) || Number(v.precio_unitario) || 30000;
      const ab = Number(it.abono) || 0;
      const modeloTxt = it.modelo === 'Nuevo' ? 'Versión 2' : 'Versión 1';
      const desc = `Polo · ${it.genero === 'Mujer' ? 'Mujer' : 'Hombre'} · ${it.color || 'Color'} · Talla ${it.talla || 'U'}`;
      const prog = it.programa ? `<div style="font-size:10px;color:#4f46e5;font-weight:700;margin-top:2px;">Bordado: ${it.programa}</div>` : '';
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;">
            <div style="font-weight:700;color:#1e293b;">${desc}</div>
            <div style="font-size:11px;color:#64748b;">${modeloTxt}</div>
            ${prog}
          </td>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${fmt(p)}</td>
          <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;color:#059669;font-weight:700;">${fmt(ab)}</td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Recibo - ${cliente} - Pedido #${String(v.id).slice(-4)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin:0; padding:24px; color:#1e293b; background:#fff; font-size:12px; }
  .card { max-width:600px; margin:0 auto; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,0.05); }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #6366f1; padding-bottom:16px; margin-bottom:20px; }
  .title { font-size:20px; font-weight:900; color:#4338ca; }
  .table { width:100%; border-collapse:collapse; margin:20px 0; }
  .table th { background:#f8fafc; padding:8px 10px; text-align:left; font-size:11px; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0; }
  .total-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; }
  .btn-print { background:#4f46e5; color:#fff; border:none; padding:10px 20px; border-radius:12px; font-weight:bold; cursor:pointer; }
  @media print { .no-print { display:none; } body { padding:0; } .card { border:none; box-shadow:none; padding:0; } }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div>
      <div class="title">CAMISAS IUB</div>
      <div style="color:#64748b; font-size:12px; margin-top:2px;">Comprobante de Pedido Finalizado</div>
      <div style="margin-top:6px; font-size:11px;"><b>Fecha:</b> ${fechaHoy} · <b>Vendedor:</b> ${v.vendedor || 'Equipo'}</div>
    </div>
    <div style="text-align:right;">
      <span style="font-size:11px; background:#e0e7ff; color:#3730a3; padding:4px 10px; border-radius:20px; font-weight:bold;">Pedido #${String(v.id).slice(-4)}</span>
    </div>
  </div>

  <div style="background:#f8fafc; padding:12px; border-radius:12px; margin-bottom:16px;">
    <div><b>Cliente:</b> ${cliente}</div>
    ${telefono ? `<div><b>Teléfono:</b> ${telefono}</div>` : ''}
    ${v.lugar_entrega ? `<div><b>Lugar entrega:</b> ${v.lugar_entrega}</div>` : ''}
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Prenda</th>
        <th style="text-align:right;">Precio</th>
        <th style="text-align:right;">Abonado</th>
      </tr>
    </thead>
    <tbody>
      ${filasHtml}
    </tbody>
  </table>

  <div style="border-top:1px solid #e2e8f0; padding-top:12px; max-width:260px; margin-left:auto;">
    <div class="total-row"><span>Total Venta:</span><b>${fmt(total)}</b></div>
    <div class="total-row"><span>Abonado:</span><b style="color:#059669;">${fmt(abonoTot)}</b></div>
    <div class="total-row" style="font-size:15px; border-top:1px solid #cbd5e1; padding-top:8px;">
      <span>Saldo:</span><b style="color:${saldo > 0 ? '#d97706' : '#059669'};">${saldo > 0 ? fmt(saldo) : 'Liquidado 100%'}</b>
    </div>
  </div>

  <div class="no-print" style="margin-top:24px; text-align:center;">
    <button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>
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
      {/* 1. Cabecera y Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Historial de Pedidos
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {pedidosFiltrados.length} completados
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro histórico de pedidos entregados y completamente liquidados.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {esAdmin && (
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 shadow-xs outline-none"
            >
              <option value="Todos">Todos los socios</option>
              <option value="Samir">Samir</option>
              <option value="Valentina">Valentina</option>
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en historial..."
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
      </div>

      {/* 2. Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pedidos Históricos</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{pedidosHistorial.length}</span>
            <span className="text-xs text-slate-400 mt-0.5 block">Ventas finalizadas con éxito</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <History className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Camisas Entregadas</span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">{totalCamisasEntregadas}</span>
            <span className="text-xs text-indigo-600 font-semibold mt-0.5 block">Prendas confeccionadas</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Shirt className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Recaudado</span>
            <span className="text-2xl font-black text-emerald-900 mt-1 block">{fmt(totalRecaudado)}</span>
            <span className="text-xs text-emerald-700/80 mt-0.5 block">100% cobrado y liquidado</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Grid de Tarjetas del Historial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {pedidosPaginados.map((v) => {
            const items = itemsCrudosVenta(v) || [];
            const total = precioTotalVenta(v);
            const abono = abonoClienteTotal(v);
            const tel = v.cliente_telefono || v.telefono || '';

            return (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[28px] border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {(v.cliente_nombre || 'C')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-sm truncate">
                            {v.cliente_nombre}
                          </h3>
                          {tel && (
                            <a
                              href={getWhatsAppLink(tel)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-0.5"
                              title={`Chatear con ${v.cliente_nombre}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <span className="font-semibold text-slate-600">{v.vendedor || 'Samir'}</span>
                          <span>•</span>
                          <span>{items.length || v.cantidad || 1} camisas</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${getEstadoBadgeStyle(v.estado)}`}>
                      {v.estado || 'Liquidado'}
                    </span>
                  </div>

                  {/* Datos del pedido */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pedido: {formatearFechaHumana(v.fecha)}</span>
                    </div>

                    {v.fecha_entrega && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Entregado: {formatearFechaHumana(v.fecha_entrega)}</span>
                      </div>
                    )}

                    {tel && (
                      <div className="flex items-center gap-1.5 font-mono text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tel}</span>
                      </div>
                    )}
                  </div>

                  {/* Resumen de Prendas */}
                  <div className="mb-4 space-y-1">
                    {items.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
                        <span className="font-semibold text-slate-700 truncate">
                          {it.genero === 'Mujer' ? 'Mujer' : 'Hombre'} • {it.color} • Talla {it.talla} {it.modelo === 'Nuevo' ? '(V2)' : ''}
                        </span>
                        {it.programa && <span className="text-indigo-600 font-bold ml-1 text-[11px]">{it.programa}</span>}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <span className="text-[11px] text-slate-400 italic block text-center">
                        +{items.length - 3} prenda(s) más
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer de la tarjeta con botón de Recibo, Reabrir y Editar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Cobrado</span>
                    <span className="text-base font-extrabold text-emerald-600">{fmt(total)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleImprimirRecibo(v)}
                      className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                      title="Imprimir o guardar recibo PDF"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Recibo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRestaurar(v)}
                      className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      title="Reabrir pedido a activo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reabrir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditOrder && onEditOrder(v)}
                      className="p-1.5 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Ver / Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {pedidosFiltrados.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-sm">No hay pedidos en el historial</h3>
            <p className="text-xs text-slate-400 mt-1">Los pedidos finalizados y liquidados aparecerán aquí.</p>
          </div>
        )}
      </div>

      {/* 4. Controles de Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={pedidosFiltrados.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="pedidos finalizados"
      />
    </div>
  );
}

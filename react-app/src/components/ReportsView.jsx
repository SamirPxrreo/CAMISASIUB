import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Sparkles,
  CheckCircle,
  ShoppingBag
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { btnPrimario, btnNeutro } from '../lib/buttonStyles';
import {
  fmt,
  precioTotalVenta,
  abonoClienteTotal,
  saldoCliente,
  itemsCrudosVenta,
  normalizarEstado,
  codigoCortoPedido,
  getVendedorColor
} from '../lib/utils';

export default function ReportsView() {
  const { ventas } = useData();
  const [filtroTipo, setFiltroTipo] = useState('por-comprar');
  const [exportando, setExportando] = useState(false);
  const [exito, setExito] = useState(false);

  // Filtrar según los 2 alcances definidos
  const dataset = ventas.filter(v => {
    if (filtroTipo === 'por-comprar') {
      const items = itemsCrudosVenta(v) || [];
      return !v.finalizado && (
        normalizarEstado(v.estado) === 'Pedido' ||
        items.some(it => normalizarEstado(it.estado) === 'Pedido')
      );
    }
    // 'activos': todos los pedidos que aparecen en el menú de pedidos sin importar su estado
    return !v.finalizado;
  });

  const conteoPorComprar = ventas.filter(v => {
    const items = itemsCrudosVenta(v) || [];
    return !v.finalizado && (
      normalizarEstado(v.estado) === 'Pedido' ||
      items.some(it => normalizarEstado(it.estado) === 'Pedido')
    );
  }).length;

  const conteoActivos = ventas.filter(v => !v.finalizado).length;

  const exportarExcel = async () => {
    setExportando(true);
    setExito(false);

    try {
      // ExcelJS pesa mucho y solo se usa al exportar: se carga bajo demanda
      // para no mandarlo en el bundle inicial.
      const { exportarReporteCompletoExcel } = await import('../lib/excelExport');
      await exportarReporteCompletoExcel(ventas, filtroTipo);
      setExito(true);
      setTimeout(() => setExito(false), 4000);
    } catch (err) {
      console.error("Error exportando Excel:", err);
      alert(err.message || "Hubo un error al generar el archivo Excel.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Reportes & Exportación
          <Sparkles className="w-5 h-5 text-amber-500" />
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Descarga tus reportes contables en Excel (.xlsx) con vista completa de pedidos.
        </p>
      </div>

      {/* Tarjeta de Exportación a Excel */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Exportar Reporte a Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Desglose por prenda, cliente, tallas, colores, precios, abonos y costos de confección.
              </p>
            </div>
          </div>

          <button
            onClick={exportarExcel}
            disabled={exportando || dataset.length === 0}
            className={
              exportando || dataset.length === 0
                ? btnNeutro + ' w-full sm:w-auto py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed'
                : btnPrimario + ' w-full sm:w-auto py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed'
            }
          >
            {exportando ? (
              <span>Generando Excel...</span>
            ) : exito ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>¡Descargado con Éxito!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Descargar Archivo Excel</span>
              </>
            )}
          </button>
        </div>

        {/* Los 2 botones de alcance solicitados */}
        <div className="space-y-3">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
            Selecciona el alcance del reporte (2 opciones):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opción 1: Solo Pedidos por Comprar */}
            <button
              type="button"
              onClick={() => setFiltroTipo('por-comprar')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                filtroTipo === 'por-comprar'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-black shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs block font-black">1. Solo Pedidos por Comprar</span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {conteoPorComprar} pedidos
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1 leading-snug">
                Exporta únicamente los pedidos con estado "Pedido" pendientes por comprar telas.
              </span>
            </button>

            {/* Opción 2: Todos los Pedidos Activos */}
            <button
              type="button"
              onClick={() => setFiltroTipo('activos')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                filtroTipo === 'activos'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 font-black shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs block font-black">2. Todos los Pedidos Activos</span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {conteoActivos} pedidos
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1 leading-snug">
                Todos los pedidos que aparecen en el menú pedidos, sin importar su estado en curso.
              </span>
            </button>
          </div>
        </div>

        {/* Vista previa completa de la tabla con scroll vertical y horizontal */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
              Vista Previa del Conjunto Completo ({dataset.length} pedidos)
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">
              Desplázate hacia abajo para ver todos los registros
            </span>
          </div>

          <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-wider sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="py-3 px-3.5">ID</th>
                  <th className="py-3 px-3.5">Cliente</th>
                  <th className="py-3 px-3.5">Vendedor</th>
                  <th className="py-3 px-3.5">Prendas</th>
                  <th className="py-3 px-3.5">Estado</th>
                  <th className="py-3 px-3.5 text-right">Venta</th>
                  <th className="py-3 px-3.5 text-right">Abono</th>
                  <th className="py-3 px-3.5 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataset.map(v => {
                  const saldo = saldoCliente(v);
                  const vCol = getVendedorColor(v.vendedor);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-black text-indigo-700">
                        {codigoCortoPedido(v)}
                      </td>
                      <td className="py-2.5 px-3.5 font-black text-slate-900">
                        {v.cliente_nombre}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[10px] border ${vCol.badge}`}>
                          {v.vendedor || 'Samir'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 font-medium">
                        {v.cantidad || 1} camisa(s)
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">
                          {normalizarEstado(v.estado)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-black text-slate-900">
                        {fmt(precioTotalVenta(v))}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-emerald-600 font-bold">
                        {fmt(abonoClienteTotal(v))}
                      </td>
                      <td className={`py-2.5 px-3.5 text-right font-black ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {saldo > 0 ? fmt(saldo) : 'Pagado ✓'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {dataset.length === 0 && (
              <div className="py-12 text-center">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay pedidos para este filtro</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Todos los pedidos han avanzado de estado o están completados.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

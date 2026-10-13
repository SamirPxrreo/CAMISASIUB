import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Calendar,
  Sparkles,
  CheckCircle,
  Share2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import {
  fmt,
  precioTotalVenta,
  costoTotalVenta,
  abonoClienteTotal,
  saldoCliente,
  itemsCrudosVenta,
  formatearFechaHumana,
  hoyColombia
} from '../lib/utils';

export default function ReportsView() {
  const { ventas } = useData();
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [exportando, setExportando] = useState(false);
  const [exito, setExito] = useState(false);

  // Filtrar según selección
  const dataset = ventas.filter(v => {
    if (filtroTipo === 'activos') return !v.finalizado && v.estado !== 'Liquidado';
    if (filtroTipo === 'historial') return v.finalizado || v.estado === 'Liquidado';
    return true; // todos
  });

  const exportarExcel = () => {
    setExportando(true);
    setExito(false);

    try {
      // Filas para la hoja de cálculo
      const filasExcel = [];

      dataset.forEach(v => {
        const items = itemsCrudosVenta(v) || [];
        const cant = Number(v.cantidad) || 1;
        const total = precioTotalVenta(v);
        const costo = costoTotalVenta(v);
        const abono = abonoClienteTotal(v);
        const saldo = saldoCliente(v);

        if (items.length > 0) {
          items.forEach((it, idx) => {
            filasExcel.push({
              'ID Pedido': v.id,
              'Fecha': v.fecha || '',
              'Cliente': v.cliente_nombre || '',
              'Teléfono': v.cliente_telefono || v.telefono || '',
              'Vendedor': v.vendedor || '',
              'Versión': it.modelo === 'Nuevo' ? 'Versión 2' : 'Versión 1',
              'Género': it.genero || 'Hombre',
              'Color': it.color || '',
              'Talla': it.talla || '',
              'Bordado': it.programa || '',
              'Estado Camisa': it.estado || v.estado || 'Pedido',
              'Precio Prenda': Number(it.precio) || Number(v.precio_unitario) || 39000,
              'Costo Prenda': Number(it.costo) || Number(v.costo_unitario) || 30000,
              'Abono Prenda': Number(it.abono) || 0,
              'Lugar Entrega': v.lugar_entrega || '',
              'Fecha Entrega': v.fecha_entrega || 'Por definir',
              'Nota': v.nota || ''
            });
          });
        } else {
          filasExcel.push({
            'ID Pedido': v.id,
            'Fecha': v.fecha || '',
            'Cliente': v.cliente_nombre || '',
            'Teléfono': v.cliente_telefono || v.telefono || '',
            'Vendedor': v.vendedor || '',
            'Versión': v.modelo === 'Nuevo' ? 'Versión 2' : 'Versión 1',
            'Género': v.genero || 'Hombre',
            'Color': v.color || '',
            'Talla': v.talla || '',
            'Bordado': v.cliente_programa || '',
            'Estado Camisa': v.estado || 'Pedido',
            'Precio Prenda': Number(v.precio_unitario) || 39000,
            'Costo Prenda': Number(v.costo_unitario) || 30000,
            'Abono Prenda': Number(v.abono) || 0,
            'Lugar Entrega': v.lugar_entrega || '',
            'Fecha Entrega': v.fecha_entrega || 'Por definir',
            'Nota': v.nota || ''
          });
        }
      });

      // Crear Libro de Trabajo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(filasExcel);
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Ventas');

      // Descargar archivo
      const nombreArchivo = `Reporte_Camisas_IUB_${hoyColombia()}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);

      setExito(true);
      setTimeout(() => setExito(false), 4000);
    } catch (err) {
      console.error("Error exportando Excel:", err);
      alert("Hubo un error al generar el archivo Excel: " + err.message);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          Reportes & Exportación
          <Sparkles className="w-5 h-5 text-amber-500" />
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Descarga tus reportes contables en Excel (.xlsx) y genera comprobantes de pedidos.
        </p>
      </div>

      {/* Tarjeta de Exportación a Excel */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Exportar Reporte Completo a Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Incluye desglose por prenda, cliente, tallas, colores, precios, abonos y costos de Yesenia.
              </p>
            </div>
          </div>

          <button
            onClick={exportarExcel}
            disabled={exportando}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
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

        {/* Filtros de exportación */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Selecciona el alcance del reporte:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                filtroTipo === 'todos'
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs block font-extrabold">Todos los Pedidos</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {ventas.length} pedidos (activos + historial)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroTipo('activos')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                filtroTipo === 'activos'
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs block font-extrabold">Solo Pedidos Activos</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                En curso (Pedido, Comprado, Bordando, Listo)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroTipo('historial')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                filtroTipo === 'historial'
                  ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs block font-extrabold">Solo Historial Terminado</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Pedidos entregados y liquidados
              </span>
            </button>
          </div>
        </div>

        {/* Vista previa de los datos a exportar */}
        <div className="pt-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Vista Previa del Conjunto ({dataset.length} pedidos seleccionados)
          </span>
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Vendedor</th>
                  <th className="py-2.5 px-3">Prendas</th>
                  <th className="py-2.5 px-3 text-right">Venta</th>
                  <th className="py-2.5 px-3 text-right">Abono</th>
                  <th className="py-2.5 px-3 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataset.slice(0, 5).map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-bold text-slate-500">#{v.id}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{v.cliente_nombre}</td>
                    <td className="py-2 px-3 text-slate-600">{v.vendedor || 'Samir'}</td>
                    <td className="py-2 px-3 text-slate-600">{v.cantidad || 1} camisas</td>
                    <td className="py-2 px-3 text-right font-bold">{fmt(precioTotalVenta(v))}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{fmt(abonoClienteTotal(v))}</td>
                    <td className="py-2 px-3 text-right font-bold text-amber-600">{fmt(saldoCliente(v))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dataset.length > 5 && (
            <p className="text-[11px] text-slate-400 italic text-right mt-1.5">
              ...y {dataset.length - 5} pedidos más incluidos en el archivo exportable.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

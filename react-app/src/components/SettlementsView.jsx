import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  ArrowRightLeft,
  Plus,
  Calendar,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Sparkles,
  X,
  Trash2,
  Search,
  Info,
  Clock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  btnDinero,
  btnDineroInactivo,
  btnDestructivo,
  btnNeutro,
  btnNeutroIcono
} from '../lib/buttonStyles';
import {
  fmt,
  hoyColombia,
  formatearFechaHumana,
  calcularDeudaSocios,
  saldoSocioPendientePedido,
  pedidosPendientesLiquidacion,
  otroSocioDe,
  formatMiles,
  parseMiles,
  getVendedorColor
} from '../lib/utils';
import Pagination from './Pagination';

export default function SettlementsView() {
  const { liquidaciones, ventas, refreshData } = useData();
  const { role } = useAuth();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagador, setPagador] = useState('Samir');
  const [ventaId, setVentaId] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyColombia());
  const [nota, setNota] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cálculo exacto de deudas según app.v2.js (orden por orden)
  const deudaData = useMemo(() => {
    return calcularDeudaSocios(ventas, liquidaciones);
  }, [ventas, liquidaciones]);

  // Pedidos con saldo pendiente para el pagador seleccionado
  const pedidosPendientes = useMemo(() => {
    return pedidosPendientesLiquidacion(pagador, ventas, liquidaciones);
  }, [pagador, ventas, liquidaciones]);

  // Manejar cambio de pagador en el modal
  const handleCambioPagador = (nuevoPagador) => {
    setPagador(nuevoPagador);
    const pendientes = pedidosPendientesLiquidacion(nuevoPagador, ventas, liquidaciones);
    if (pendientes.length > 0) {
      const primerPedido = pendientes[0];
      setVentaId(primerPedido.id);
      const saldo = Math.round(saldoSocioPendientePedido(primerPedido, liquidaciones));
      setMonto(saldo.toString());
    } else {
      setVentaId('');
      setMonto('');
    }
  };

  // Manejar cambio de pedido en el modal
  const handleCambioPedido = (nuevoVentaId) => {
    setVentaId(nuevoVentaId);
    const pedido = ventas.find(v => String(v.id) === String(nuevoVentaId));
    if (pedido) {
      const saldo = Math.round(saldoSocioPendientePedido(pedido, liquidaciones));
      setMonto(saldo.toString());
    }
  };

  const abrirModalLiquidacion = (pagadorInicial = 'Samir') => {
    setErrorMsg('');
    setPagador(pagadorInicial);
    const pendientes = pedidosPendientesLiquidacion(pagadorInicial, ventas, liquidaciones);
    if (pendientes.length > 0) {
      setVentaId(pendientes[0].id);
      const saldo = Math.round(saldoSocioPendientePedido(pendientes[0], liquidaciones));
      setMonto(saldo.toString());
    } else {
      setVentaId('');
      setMonto('');
    }
    setFecha(hoyColombia());
    setNota('');
    setModalAbierto(true);
  };

  const handleGuardarLiquidacion = async (e) => {
    e.preventDefault();
    const valMonto = parseMiles(monto);
    if (!valMonto || valMonto <= 0) {
      setErrorMsg('Ingresa un monto válido mayor que cero.');
      return;
    }
    if (!ventaId) {
      setErrorMsg('Debes seleccionar el pedido que estás liquidando.');
      return;
    }

    const pedido = ventas.find(v => String(v.id) === String(ventaId));
    if (!pedido) {
      setErrorMsg('El pedido seleccionado no existe.');
      return;
    }

    const saldoPendiente = saldoSocioPendientePedido(pedido, liquidaciones);
    if (valMonto > saldoPendiente + 1) {
      setErrorMsg(`El monto supera el saldo pendiente de este pedido (${fmt(saldoPendiente)}).`);
      return;
    }

    const receptor = otroSocioDe(pagador);

    setGuardando(true);
    setErrorMsg('');

    try {
      const horaActual = new Date().toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const { error } = await supabase.from('liquidaciones').insert([{
        venta_id: ventaId,
        pagador,
        receptor,
        monto: valMonto,
        fecha,
        hora: horaActual,
        nota: nota.trim()
      }]);

      if (error) throw error;

      await refreshData();
      setModalAbierto(false);
      setVentaId('');
      setMonto('');
      setNota('');
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar la liquidación');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarLiquidacion = async (id, pagadorLiq, receptorLiq, montoLiq) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la liquidación de ${pagadorLiq} a ${receptorLiq} por ${fmt(montoLiq)}?\nEl pedido volverá a quedar pendiente de liquidar.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('liquidaciones').delete().eq('id', id);
      if (error) throw error;
      await refreshData();
    } catch (err) {
      alert('Error al eliminar la liquidación: ' + (err.message || err));
    }
  };

  // Filtrado de historial
  const liquidacionesFiltradas = useMemo(() => {
    if (!busqueda) return liquidaciones;
    const q = busqueda.toLowerCase().trim();
    return liquidaciones.filter(l => {
      const venta = ventas.find(v => String(v.id) === String(l.venta_id));
      const cliente = (venta?.cliente_nombre || '').toLowerCase();
      const pag = (l.pagador || '').toLowerCase();
      const rec = (l.receptor || '').toLowerCase();
      const not = (l.nota || '').toLowerCase();
      const fec = (l.fecha || '').toLowerCase();
      return cliente.includes(q) || pag.includes(q) || rec.includes(q) || not.includes(q) || fec.includes(q);
    });
  }, [liquidaciones, ventas, busqueda]);

  const pageSize = 12;
  const totalPages = Math.ceil(liquidacionesFiltradas.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const liquidacionesPaginadas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return liquidacionesFiltradas.slice(start, start + pageSize);
  }, [liquidacionesFiltradas, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Liquidaciones entre Socios
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              50% Ganancia
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cálculo oficial orden por orden: Cada venta genera obligación de transferir la mitad de la utilidad al otro socio.
          </p>
        </div>

        <button
          onClick={() => abrirModalLiquidacion(deudaData.deudaSamirAVal > 0 ? 'Samir' : 'Valentina')}
          className={btnDinero}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar Liquidación de Pedido</span>
        </button>
      </div>

      {/* 2. Tarjetas de Deuda Entre Socios (Exacto app.v2.js) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Samir debe liquidar a Valentina */}
        <div className={`p-6 rounded-3xl border shadow-xs transition-all ${
          deudaData.deudaSamirAVal > 0
            ? 'bg-amber-500/5 border-amber-500/30'
            : 'bg-emerald-500/5 border-emerald-500/20'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-base">
                S
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">Samir → Valentina</span>
                <span className="text-[11px] text-slate-400 font-medium">Deuda por pedidos vendidos por Samir</span>
              </div>
            </div>
            {deudaData.deudaSamirAVal > 0 && (
              <button
                onClick={() => abrirModalLiquidacion('Samir')}
                className={btnDinero}
              >
                Liquidar
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Debe Liquidar</span>
            <span className={`text-2xl font-black ${deudaData.deudaSamirAVal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {deudaData.deudaSamirAVal > 0 ? fmt(deudaData.deudaSamirAVal) : '$0 (Al día ✓)'}
            </span>
          </div>
        </div>

        {/* Valentina debe liquidar a Samir */}
        <div className={`p-6 rounded-3xl border shadow-xs transition-all ${
          deudaData.deudaValASamir > 0
            ? 'bg-amber-500/5 border-amber-500/30'
            : 'bg-emerald-500/5 border-emerald-500/20'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 font-black flex items-center justify-center text-base">
                V
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block">Valentina → Samir</span>
                <span className="text-[11px] text-slate-400 font-medium">Deuda por pedidos vendidos por Valentina</span>
              </div>
            </div>
            {deudaData.deudaValASamir > 0 && (
              <button
                onClick={() => abrirModalLiquidacion('Valentina')}
                className={btnDinero}
              >
                Liquidar
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Debe Liquidar</span>
            <span className={`text-2xl font-black ${deudaData.deudaValASamir > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {deudaData.deudaValASamir > 0 ? fmt(deudaData.deudaValASamir) : '$0 (Al día ✓)'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Banner de Total Pendiente y Regla de Negocio */}
      <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
        deudaData.totalPendiente > 0
          ? 'bg-amber-100/70 border-amber-300 text-amber-900'
          : 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
      }`}>
        <div className="flex items-center gap-2">
          {deudaData.totalPendiente > 0 ? (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>
            {deudaData.totalPendiente > 0
              ? `Total pendiente global por liquidar entre socios: ${fmt(deudaData.totalPendiente)}`
              : '¡Cuentas al día entre Samir y Valentina! Ningún pedido tiene saldo pendiente de liquidar.'}
          </span>
        </div>
      </div>

      {deudaData.perdidasSinDescontar > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <b>Nota contable:</b> Este monto <b>no descuenta {fmt(deudaData.perdidasSinDescontar)}</b> por pedidos vendidos por debajo del costo. Según la regla de negocio acordada, esa pérdida queda a cargo exclusivo de quien vendió y no genera deuda entre socios.
          </p>
        </div>
      )}

      {/* 4. Historial de Liquidaciones Registradas */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            Historial de Transferencias ({liquidacionesFiltradas.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente, pagador..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {liquidacionesPaginadas.map((l) => {
            const venta = ventas.find(v => String(v.id) === String(l.venta_id));
            const clienteLabel = venta
              ? `${venta.cliente_nombre || 'Cliente'} (${venta.fecha || 'Sin fecha'})`
              : (l.venta_id ? 'Pedido # ' + l.venta_id : 'Liquidación general');

            return (
              <div key={l.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900">
                        {l.pagador} → {l.receptor}
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md truncate">
                        {clienteLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{formatearFechaHumana(l.fecha)}</span>
                      {l.hora && <span>• {l.hora}</span>}
                      {l.nota && <span className="italic truncate">• "{l.nota}"</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-base font-black text-emerald-600">
                    {fmt(l.monto)}
                  </span>
                  <button
                    onClick={() => handleEliminarLiquidacion(l.id, l.pagador, l.receptor, l.monto)}
                    className={btnDestructivo}
                    title="Eliminar liquidación"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {liquidacionesFiltradas.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No hay transferencias registradas {busqueda ? 'que coincidan con la búsqueda.' : 'aún.'}
            </div>
          )}
        </div>

        {/* Controles de Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={liquidacionesFiltradas.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemName="transferencias de liquidación"
        />
      </div>

      {/* Modal Registrar Liquidación de Pedido */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Registrar Pago de Liquidación</h3>
                <p className="text-[11px] text-slate-400">Transfiere la ganancia correspondiente de un pedido</p>
              </div>
              <button onClick={() => setModalAbierto(false)} className={btnNeutroIcono}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleGuardarLiquidacion} className="space-y-3 text-xs">
              {/* Selector de Pagador y Receptor */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pagador (Vendedor)</label>
                  <select
                    value={pagador}
                    onChange={(e) => handleCambioPagador(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none"
                  >
                    <option value="Samir">Samir</option>
                    <option value="Valentina">Valentina</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Receptor (Socio)</label>
                  <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                    {otroSocioDe(pagador)}
                  </div>
                </div>
              </div>

              {/* Selector de Pedido Pendiente */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pedido a Liquidar ({pedidosPendientes.length} pendientes)
                </label>
                {pedidosPendientes.length > 0 ? (
                  <select
                    value={ventaId}
                    onChange={(e) => handleCambioPedido(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none"
                    required
                  >
                    {pedidosPendientes.map((p) => {
                      const saldo = Math.round(saldoSocioPendientePedido(p, liquidaciones));
                      return (
                        <option key={p.id} value={p.id}>
                          {p.cliente_nombre || 'Cliente'} — {p.fecha || 'Sin fecha'} — Pendiente: {fmt(saldo)}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    ✓ {pagador} no tiene pedidos con saldo pendiente de liquidar.
                  </div>
                )}
              </div>

              {/* Monto con autoformateo de miles colombiano */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto a Transferir ($)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMiles(monto)}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',') e.preventDefault();
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setMonto(raw);
                  }}
                  placeholder="Ej. 15.000"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-emerald-700 outline-none"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha de Transferencia</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
                />
              </div>

              {/* Nota */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nota / Observación</label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  placeholder="Ej. Transferencia Nequi por pedido liquidado..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className={btnNeutro}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || !ventaId}
                  className={
                    guardando || !ventaId
                      ? btnDineroInactivo + ' disabled:opacity-50'
                      : btnDinero + ' disabled:opacity-50'
                  }
                >
                  {guardando ? 'Guardando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import {
  fmt,
  hoyColombia,
  precioTotalVenta,
  costoTotalVenta,
  formatearFechaHumana
} from '../lib/utils';

export default function SettlementsView() {
  const { liquidaciones, ventas, refreshData } = useData();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pagador, setPagador] = useState('Samir');
  const [receptor, setReceptor] = useState('Valentina');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyColombia());
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Balance entre socios (50% de ganancia de cada venta)
  const balance = useMemo(() => {
    let gananciaTotalSamir = 0;
    let gananciaTotalVal = 0;

    ventas.forEach(v => {
      const p = precioTotalVenta(v);
      const c = costoTotalVenta(v);
      const ganancia = Math.max(p - c, 0);

      if (v.vendedor === 'Samir') {
        gananciaTotalSamir += ganancia;
      } else if (v.vendedor === 'Valentina') {
        gananciaTotalVal += ganancia;
      }
    });

    // Obligaciones (50% de las ventas que cada uno recaudó)
    const obligacionSamirAVal = gananciaTotalSamir / 2;
    const obligacionValASamir = gananciaTotalVal / 2;

    // Pagos ya efectuados registrados en liquidaciones
    let pagadoSamirAVal = 0;
    let pagadoValASamir = 0;

    liquidaciones.forEach(l => {
      const m = Number(l.monto) || 0;
      if (l.pagador === 'Samir' && l.receptor === 'Valentina') pagadoSamirAVal += m;
      else if (l.pagador === 'Valentina' && l.receptor === 'Samir') pagadoValASamir += m;
    });

    const saldoPendienteSamir = Math.max(obligacionSamirAVal - pagadoSamirAVal, 0);
    const saldoPendienteVal = Math.max(obligacionValASamir - pagadoValASamir, 0);

    const neto = (obligacionSamirAVal - pagadoSamirAVal) - (obligacionValASamir - pagadoValASamir);

    return {
      gananciaTotalSamir,
      gananciaTotalVal,
      obligacionSamirAVal,
      obligacionValASamir,
      pagadoSamirAVal,
      pagadoValASamir,
      saldoPendienteSamir,
      saldoPendienteVal,
      neto
    };
  }, [ventas, liquidaciones]);

  const handleGuardarLiquidacion = async (e) => {
    e.preventDefault();
    const valMonto = parseFloat(monto);
    if (!valMonto || valMonto <= 0) {
      setErrorMsg('Ingresa un monto válido a transferir.');
      return;
    }
    if (pagador === receptor) {
      setErrorMsg('El pagador y el receptor deben ser socios distintos.');
      return;
    }

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
      setMonto('');
      setNota('');
    } catch (err) {
      setErrorMsg(err.message || 'Error al registrar la liquidación');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Liquidaciones entre Socios
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Reparto 50% de ganancia
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Balance contable exacto entre Samir y Valentina según las ventas y costos de cada pedido.
          </p>
        </div>

        <button
          onClick={() => {
            setModalAbierto(true);
            if (balance.neto > 0) {
              setPagador('Samir');
              setReceptor('Valentina');
              setMonto(Math.round(balance.neto).toString());
            } else if (balance.neto < 0) {
              setPagador('Valentina');
              setReceptor('Samir');
              setMonto(Math.round(Math.abs(balance.neto)).toString());
            }
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Registrar Pago entre Socios</span>
        </button>
      </div>

      {/* 2. Tarjeta Gran Balance Neto */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest block mb-1">
              Balance Neto Actual
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">
              {balance.neto > 500
                ? `Samir debe transferir a Valentina: ${fmt(balance.neto)}`
                : balance.neto < -500
                ? `Valentina debe transferir a Samir: ${fmt(Math.abs(balance.neto))}`
                : '¡Cuentas al día entre socios! ✓'}
            </h3>
            <p className="text-xs text-indigo-200/80 mt-1">
              Calculado automáticamente sobre el 50% de utilidad de cada pedido vendido y los pagos registrados.
            </p>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 3. Tarjetas de cada Socio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Samir */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-lg">
                S
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Socio: Samir</h4>
                <span className="text-xs text-slate-400">Ventas propias: {fmt(balance.gananciaTotalSamir)} ganancia</span>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              50% Partícipe
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Debe a Val</span>
              <span className="font-extrabold text-slate-800 text-sm">{fmt(balance.obligacionSamirAVal)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <span className="text-emerald-700 block text-[10px] font-bold uppercase">Le ha Pagado</span>
              <span className="font-extrabold text-emerald-800 text-sm">{fmt(balance.pagadoSamirAVal)}</span>
            </div>
          </div>
        </div>

        {/* Valentina */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 font-extrabold flex items-center justify-center text-lg">
                V
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">Socia: Valentina</h4>
                <span className="text-xs text-slate-400">Ventas propias: {fmt(balance.gananciaTotalVal)} ganancia</span>
              </div>
            </div>
            <span className="text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
              50% Partícipe
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Debe a Samir</span>
              <span className="font-extrabold text-slate-800 text-sm">{fmt(balance.obligacionValASamir)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <span className="text-emerald-700 block text-[10px] font-bold uppercase">Le ha Pagado</span>
              <span className="font-extrabold text-emerald-800 text-sm">{fmt(balance.pagadoValASamir)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Historial de Pagos Registrados */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          Historial de Transferencias entre Socios ({liquidaciones.length})
        </h3>

        <div className="divide-y divide-slate-100">
          {liquidaciones.map((l) => (
            <div key={l.id} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    {l.pagador} transfirió a {l.receptor}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatearFechaHumana(l.fecha)} {l.hora ? `• ${l.hora}` : ''} {l.nota ? `• "${l.nota}"` : ''}
                  </span>
                </div>
              </div>

              <span className="text-base font-black text-emerald-600">
                {fmt(l.monto)}
              </span>
            </div>
          ))}

          {liquidaciones.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No hay transferencias registradas aún.
            </div>
          )}
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Registrar Pago entre Socios</h3>
              <button onClick={() => setModalAbierto(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleGuardarLiquidacion} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pagador (quien paga)</label>
                  <select
                    value={pagador}
                    onChange={(e) => {
                      setPagador(e.target.value);
                      if (e.target.value === 'Samir') setReceptor('Valentina');
                      else setReceptor('Samir');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none"
                  >
                    <option value="Samir">Samir</option>
                    <option value="Valentina">Valentina</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Receptor (quien recibe)</label>
                  <select
                    value={receptor}
                    onChange={(e) => setReceptor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none"
                  >
                    <option value="Valentina">Valentina</option>
                    <option value="Samir">Samir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto a Transferir ($)</label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="Ej. 50000"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-extrabold text-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha de la Transferencia</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nota / Concepto</label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  placeholder="Ej. Transferencia Nequi por liquidación de pedidos de la semana..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50"
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

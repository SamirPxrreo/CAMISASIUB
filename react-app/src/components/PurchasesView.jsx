import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Plus,
  Calendar,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileText,
  ShoppingBag,
  Sparkles,
  X
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../lib/supabase';
import {
  fmt,
  formatearFechaHumana,
  hoyColombia,
  costoTotalVenta
} from '../lib/utils';

export default function PurchasesView() {
  const { compras, compraAportes, ventas, refreshData } = useData();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoyColombia());
  const [comprador, setComprador] = useState('Samir');
  const [observaciones, setObservaciones] = useState('');
  const [aporteSamir, setAporteSamir] = useState(0);
  const [aporteVal, setAporteVal] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Total costo de camisas en el sistema
  const costoTotalPedidos = useMemo(() => {
    return ventas.reduce((s, v) => s + costoTotalVenta(v), 0);
  }, [ventas]);

  // Total pagado a Yesenia (sumatoria de compras / aportes)
  const totalAbonadoYesenia = useMemo(() => {
    return compraAportes.reduce((s, a) => s + (Number(a.monto) || 0), 0);
  }, [compraAportes]);

  const saldoPendienteYesenia = Math.max(costoTotalPedidos - totalAbonadoYesenia, 0);

  const aportesPorSocio = useMemo(() => {
    let samir = 0;
    let val = 0;
    compraAportes.forEach(a => {
      const m = Number(a.monto) || 0;
      if (a.socio === 'Samir') samir += m;
      else if (a.socio === 'Valentina') val += m;
    });
    return { samir, val };
  }, [compraAportes]);

  const handleGuardarCompra = async (e) => {
    e.preventDefault();
    const totalAbono = (Number(aporteSamir) || 0) + (Number(aporteVal) || 0);
    if (totalAbono <= 0) {
      setErrorMsg('Ingresa un monto de aporte válido para al menos uno de los socios.');
      return;
    }

    setGuardando(true);
    setErrorMsg('');

    try {
      // 1. Guardar compra en compras_proveedor
      const { data: cData, error: cErr } = await supabase
        .from('compras_proveedor')
        .insert([{
          fecha: fecha,
          comprador: comprador,
          observaciones: observaciones.trim(),
          costo_total: totalAbono,
          abono_total: totalAbono,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (cErr) throw cErr;

      // 2. Guardar aportes por socio en compra_aportes
      const aportesInserts = [];
      if (Number(aporteSamir) > 0) {
        aportesInserts.push({
          compra_id: cData.id,
          socio: 'Samir',
          monto: Number(aporteSamir),
          fecha: fecha
        });
      }
      if (Number(aporteVal) > 0) {
        aportesInserts.push({
          compra_id: cData.id,
          socio: 'Valentina',
          monto: Number(aporteVal),
          fecha: fecha
        });
      }

      if (aportesInserts.length > 0) {
        const { error: aErr } = await supabase.from('compra_aportes').insert(aportesInserts);
        if (aErr) console.warn("[Supabase] Error en compra_aportes:", aErr);
      }

      await refreshData();
      setModalAbierto(false);
      setAporteSamir(0);
      setAporteVal(0);
      setObservaciones('');
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el abono a Yesenia.');
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
            Abonos al Proveedor (Yesenia)
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
              {compras.length} compras registradas
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Control de visitas a confección, aportes de capital y pagos al taller de Yesenia.
          </p>
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo Abono a Yesenia</span>
        </button>
      </div>

      {/* 2. Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Costo Total Confección</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{fmt(costoTotalPedidos)}</span>
          <span className="text-xs text-slate-400 mt-0.5 block">Costo base de todos los pedidos</span>
        </div>

        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Pagado a Yesenia</span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{fmt(totalAbonadoYesenia)}</span>
          <span className="text-xs text-emerald-700 font-semibold mt-0.5 block">Suma de aportes de ambos socios</span>
        </div>

        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Saldo Pendiente Yesenia</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{fmt(saldoPendienteYesenia)}</span>
          <span className="text-xs text-amber-700/80 mt-0.5 block">Deuda total estimada con el taller</span>
        </div>

        <div className="p-5 rounded-3xl bg-indigo-50/70 border border-indigo-100 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Aportes por Socio</span>
          <div className="text-xs font-bold text-slate-800 mt-1 space-y-0.5">
            <div>Samir: <span className="text-indigo-600 font-extrabold">{fmt(aportesPorSocio.samir)}</span></div>
            <div>Valentina: <span className="text-violet-600 font-extrabold">{fmt(aportesPorSocio.val)}</span></div>
          </div>
        </div>
      </div>

      {/* 3. Lista de Compras y Visitas */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-800">Historial de Visitas y Compras</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {compras.map((c) => {
              const aportesCompra = compraAportes.filter(a => a.compra_id === c.id);
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 block">Visita #{c.id}</span>
                          <span className="text-[11px] text-slate-400 font-medium">{formatearFechaHumana(c.fecha)}</span>
                        </div>
                      </div>

                      <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                        {c.comprador || 'Samir'}
                      </span>
                    </div>

                    {c.observaciones && (
                      <p className="text-xs text-slate-600 italic mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        "{c.observaciones}"
                      </p>
                    )}

                    {aportesCompra.length > 0 && (
                      <div className="space-y-1 mb-3 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aportaron:</span>
                        {aportesCompra.map((a, i) => (
                          <div key={i} className="flex justify-between p-1.5 rounded-lg bg-slate-50 text-[11px]">
                            <span className="font-semibold text-slate-700">{a.socio}:</span>
                            <span className="font-extrabold text-slate-900">{fmt(a.monto)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Total Pagado</span>
                    <span className="text-base font-black text-emerald-600">{fmt(c.abono_total || c.costo_total)}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {compras.length === 0 && (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200/80">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-sm">No hay compras registradas</h3>
              <p className="text-xs text-slate-400 mt-1">Registra tu primer abono a Yesenia con el botón de arriba.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Abono a Yesenia */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Nuevo Abono a Yesenia</h3>
              <button onClick={() => setModalAbierto(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleGuardarCompra} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fecha de la visita / pago</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Persona que entregó el dinero</label>
                <select
                  value={comprador}
                  onChange={(e) => setComprador(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none"
                >
                  <option value="Samir">Samir</option>
                  <option value="Valentina">Valentina</option>
                  <option value="Yesenia">Directo a Yesenia</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Aporte Samir ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={aporteSamir}
                    onChange={(e) => setAporteSamir(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-indigo-700 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Aporte Valentina ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={aporteVal}
                    onChange={(e) => setAporteVal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-violet-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones / Pedidos cubiertos</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Detalle de las camisas pagadas en esta visita..."
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
                  {guardando ? 'Guardando...' : 'Guardar Pago'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
